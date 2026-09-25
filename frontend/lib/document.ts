/**
 * Turns a PL-2 dataset template (Markdown with {{field}} placeholders) into a
 * small block model shared by the on-screen preview and the PDF export.
 *
 * Only the Markdown the templates actually use is supported: `#`/`##`
 * headings, `**bold**`, `---` rules, and paragraphs separated by blank lines.
 * Single newlines inside a paragraph are kept as line breaks, which signature
 * blocks and clause lists rely on. User input is only ever inserted as text.
 */

export type FieldType =
  | "string"
  | "text"
  | "date"
  | "integer"
  | "number"
  | "money"
  | "address";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  default?: string | number;
  example?: string | number;
}

export interface TemplateEntry {
  id: string;
  title: string;
  category: string;
  description: string;
  file: string;
  fields: Field[];
}

export type Values = Record<string, string>;

/** A span of text, or a placeholder whose value has not been provided yet. */
export type Run =
  | { kind: "text"; text: string; bold: boolean }
  | { kind: "blank"; label: string; bold: boolean };

export type Line = Run[];

export type Block =
  | { type: "heading"; level: 1 | 2; lines: Line[] }
  | { type: "paragraph"; lines: Line[] }
  | { type: "rule" };

const TOKEN = /(\*\*|\{\{\s*[a-z][a-z0-9_]*\s*\}\})/;
const PLACEHOLDER = /^\{\{\s*([a-z][a-z0-9_]*)\s*\}\}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** Formats a `YYYY-MM-DD` date input value as e.g. "September 25, 2026". */
export function formatDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match.map(Number);
  return dateFormat.format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * The text a field contributes to the document: the user's value (whitespace
 * collapsed, dates formatted), else the field's default, else undefined.
 */
export function resolveValue(field: Field, values: Values): string | undefined {
  const raw = (values[field.name] ?? "").replace(/\s+/g, " ").trim();
  if (raw) return field.type === "date" ? formatDate(raw) : raw;
  return field.default === undefined ? undefined : String(field.default);
}

/** Required fields the user has not filled in yet. */
export function missingRequired(fields: Field[], values: Values): Field[] {
  return fields.filter((f) => f.required && !(values[f.name] ?? "").trim());
}

function parseLine(line: string, fields: Map<string, Field>, values: Values): Line {
  const runs: Line = [];
  let bold = false;
  for (const token of line.split(TOKEN)) {
    if (!token) continue;
    if (token === "**") {
      bold = !bold;
      continue;
    }
    const placeholder = PLACEHOLDER.exec(token);
    if (!placeholder) {
      runs.push({ kind: "text", text: token, bold });
      continue;
    }
    const field = fields.get(placeholder[1]);
    const value = field && resolveValue(field, values);
    runs.push(
      value !== undefined
        ? { kind: "text", text: value, bold }
        : { kind: "blank", label: field?.label ?? placeholder[1], bold },
    );
  }
  return runs;
}

export function parseDocument(template: string, fields: Field[], values: Values): Block[] {
  const byName = new Map(fields.map((f) => [f.name, f]));
  const chunks = template
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.map((chunk): Block => {
    if (chunk === "---") return { type: "rule" };
    const heading = /^(#{1,2}) (.*)$/.exec(chunk);
    if (heading) {
      return {
        type: "heading",
        level: heading[1].length as 1 | 2,
        lines: [parseLine(heading[2], byName, values)],
      };
    }
    return {
      type: "paragraph",
      lines: chunk.split("\n").map((line) => parseLine(line.trim(), byName, values)),
    };
  });
}

/** Plain text of a line, with blanks shown as `[Label]`. */
export function lineText(line: Line): string {
  return line.map((run) => (run.kind === "text" ? run.text : `[${run.label}]`)).join("");
}
