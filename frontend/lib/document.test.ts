import { describe, expect, it } from "vitest";
import {
  formatDate,
  lineText,
  missingRequired,
  parseDocument,
  resolveValue,
  type Block,
  type Field,
} from "./document";
import { renderPdf } from "./pdf";
import { loadTemplate } from "./templates";

const fields: Field[] = [
  { name: "party", label: "Party name", type: "string", required: true },
  { name: "start", label: "Start date", type: "date", required: true },
  { name: "years", label: "Term (years)", type: "integer", required: false, default: 2 },
];

const text = (blocks: Block[]) =>
  blocks.map((b) => (b.type === "rule" ? "---" : b.lines.map(lineText).join("\n")));

describe("formatDate", () => {
  it("formats ISO dates without shifting the day across time zones", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns other input unchanged", () => {
    expect(formatDate("next Tuesday")).toBe("next Tuesday");
  });
});

describe("resolveValue", () => {
  it("uses the entered value, collapsing whitespace", () => {
    expect(resolveValue(fields[0], { party: "  Acme\n  Corp " })).toBe("Acme Corp");
  });

  it("falls back to the default, then to undefined", () => {
    expect(resolveValue(fields[2], {})).toBe("2");
    expect(resolveValue(fields[0], { party: "   " })).toBeUndefined();
  });
});

describe("missingRequired", () => {
  it("lists required fields that are empty or blank", () => {
    const missing = missingRequired(fields, { party: " ", years: "" });
    expect(missing.map((f) => f.name)).toEqual(["party", "start"]);
  });
});

describe("parseDocument", () => {
  const template = [
    "# Title for {{party}}",
    "",
    "## 1. Term",
    "",
    "Starts {{start}} for {{years}} year(s).",
    "",
    "**{{party}}**",
    "By: ____",
    "",
    "---",
  ].join("\r\n");

  it("builds headings, paragraphs with line breaks, and rules", () => {
    const blocks = parseDocument(template, fields, { party: "Acme", start: "2026-09-25" });
    expect(blocks.map((b) => b.type)).toEqual(["heading", "heading", "paragraph", "paragraph", "rule"]);
    expect(text(blocks)).toEqual([
      "Title for Acme",
      "1. Term",
      "Starts September 25, 2026 for 2 year(s).",
      "Acme\nBy: ____",
      "---",
    ]);
  });

  it("marks bold text and leaves unfilled fields as labelled blanks", () => {
    const blocks = parseDocument(template, fields, {});
    const signature = blocks[3];
    expect(signature.type === "paragraph" && signature.lines[0]).toEqual([
      { kind: "blank", label: "Party name", bold: true },
    ]);
    expect(text(blocks)[2]).toBe("Starts [Start date] for 2 year(s).");
  });

  it("inserts user input as plain text, never as markup", () => {
    const blocks = parseDocument("Hi {{party}}", fields, { party: "**<b>x</b>** {{start}}" });
    expect(blocks[0].type === "paragraph" && blocks[0].lines[0]).toEqual([
      { kind: "text", text: "Hi ", bold: false },
      { kind: "text", text: "**<b>x</b>** {{start}}", bold: false },
    ]);
  });
});

describe("mutual-nda template from the PL-2 dataset", () => {
  it("renders completely once every required field is filled", async () => {
    const { entry, source } = await loadTemplate("mutual-nda");
    const values = Object.fromEntries(
      entry.fields.filter((f) => f.required).map((f) => [f.name, f.type === "date" ? "2026-09-25" : `x-${f.name}`]),
    );

    expect(missingRequired(entry.fields, values)).toEqual([]);
    const blocks = parseDocument(source, entry.fields, values);
    const all = text(blocks).join("\n");
    expect(all).not.toMatch(/\{\{|\[[A-Z][^\]]*\]/);
    expect(all).toContain("Mutual Non-Disclosure Agreement");
    expect(all).toContain("x-party_b_signatory_title");

    const pdf = renderPdf(blocks);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    expect(pdf.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
});
