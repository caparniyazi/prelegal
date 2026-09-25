import { jsPDF } from "jspdf";
import type { Block, Line } from "./document";

const MARGIN = 72; // 1 inch, in points
const FONT = "times";
const LINE_HEIGHT = 1.35;
const STYLE = {
  title: { size: 16, after: 14 },
  heading: { size: 12, after: 4 },
  body: { size: 11, after: 8 },
};
const RULE_HEIGHT = 20;
/** Paragraphs up to this tall (e.g. signature blocks, clause lists) are never split across pages. */
const KEEP_TOGETHER_MAX = 200;

interface Word {
  text: string;
  bold: boolean;
  /** Whether whitespace separated this word from the previous one. */
  spaced: boolean;
}

interface Row {
  words: { text: string; bold: boolean; x: number }[];
  width: number;
}

interface Laid {
  block: Block;
  rows: Row[];
  size: number;
  after: number;
  center: boolean;
  /** Height of the rows (or the rule), excluding the spacing after the block. */
  height: number;
  /** Headings and bold one-line labels stay on the same page as the block after them. */
  keepWithNext: boolean;
}

/** Splits a line into words, keeping each word's weight and spacing. */
function toWords(line: Line, forceBold: boolean): Word[] {
  const words: Word[] = [];
  let spaced = false;
  for (const run of line) {
    const text = run.kind === "text" ? run.text : "____________";
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        spaced = true;
        continue;
      }
      words.push({ text: part, bold: forceBold || run.bold, spaced: spaced && words.length > 0 });
      spaced = false;
    }
  }
  return words;
}

/** Renders the document blocks to a Letter-size PDF with word-wrapped, selectable text. */
export function renderPdf(blocks: Block[]): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 2 * MARGIN;
  const contentHeight = pageHeight - 2 * MARGIN;

  // getTextWidth() applies the font's kerning table but text() draws unkerned
  // glyphs, so measure without kerning or words such as "Term" overrun the space after them.
  const measure = (text: string, bold: boolean, size: number) => {
    doc.setFont(FONT, bold ? "bold" : "normal");
    return (doc.getStringUnitWidth(text, { doKerning: false }) * size) / doc.internal.scaleFactor;
  };

  /** Breaks a word wider than the text column (e.g. a URL) into pieces that each fit. */
  const splitLong = (word: Word, size: number): Word[] => {
    if (measure(word.text, word.bold, size) <= maxWidth) return [word];
    const pieces: Word[] = [];
    let text = "";
    for (const ch of word.text) {
      if (text && measure(text + ch, word.bold, size) > maxWidth) {
        pieces.push({ ...word, text, spaced: pieces.length ? false : word.spaced });
        text = "";
      }
      text += ch;
    }
    pieces.push({ ...word, text, spaced: pieces.length ? false : word.spaced });
    return pieces;
  };

  /** Word-wraps one source line into rows no wider than the text column. */
  const wrap = (line: Line, size: number, bold: boolean): Row[] => {
    const space = measure(" ", false, size);
    const rows: Row[] = [];
    let row: Row = { words: [], width: 0 };
    for (const word of toWords(line, bold).flatMap((w) => splitLong(w, size))) {
      const width = measure(word.text, word.bold, size);
      const gap = row.words.length && word.spaced ? space : 0;
      if (row.words.length && row.width + gap + width > maxWidth) {
        rows.push(row);
        row = { words: [], width: 0 };
      }
      const x = row.words.length ? row.width + gap : 0;
      row.words.push({ text: word.text, bold: word.bold, x });
      row.width = x + width;
    }
    rows.push(row); // an empty row keeps intentionally blank lines
    return rows;
  };

  const layout = (block: Block): Laid => {
    if (block.type === "rule") {
      return { block, rows: [], size: 0, after: 0, center: false, height: RULE_HEIGHT, keepWithNext: false };
    }
    const heading = block.type === "heading";
    const style = !heading ? STYLE.body : block.level === 1 ? STYLE.title : STYLE.heading;
    const rows = block.lines.flatMap((line) => wrap(line, style.size, heading));
    const boldLabel =
      !heading && rows.length === 1 && rows[0].words.length > 0 && rows[0].words.every((w) => w.bold);
    return {
      block,
      rows,
      size: style.size,
      after: style.after,
      center: heading && block.level === 1,
      height: rows.length * style.size * LINE_HEIGHT,
      keepWithNext: heading || boldLabel,
    };
  };

  const laid = blocks.map(layout);
  let y = MARGIN;

  /** Starts a new page unless `height` fits below the cursor (or could never fit on any page). */
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - MARGIN && y > MARGIN && height <= contentHeight) {
      doc.addPage();
      y = MARGIN;
    }
  };

  /** Space needed before starting block i so it isn't orphaned from what it belongs with. */
  const needed = (i: number): number => {
    const item = laid[i];
    const lineHeight = item.size * LINE_HEIGHT;
    let height = item.height <= KEEP_TOGETHER_MAX ? item.height : Math.min(item.height, 2 * lineHeight);
    const next = laid[i + 1];
    if (item.keepWithNext && next) height += item.after + needed(i + 1);
    return height;
  };

  laid.forEach((item, i) => {
    ensureSpace(needed(i));
    if (item.block.type === "rule") {
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y + RULE_HEIGHT / 2, pageWidth - MARGIN, y + RULE_HEIGHT / 2);
      y += RULE_HEIGHT;
      return;
    }
    const lineHeight = item.size * LINE_HEIGHT;
    doc.setFontSize(item.size);
    for (const row of item.rows) {
      ensureSpace(lineHeight);
      const offset = item.center ? (maxWidth - row.width) / 2 : 0;
      for (const word of row.words) {
        doc.setFont(FONT, word.bold ? "bold" : "normal");
        doc.text(word.text, MARGIN + offset + word.x, y + item.size);
      }
      y += lineHeight;
    }
    y += item.after;
  });

  const pages = doc.getNumberOfPages();
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageWidth / 2, pageHeight - MARGIN / 2, { align: "center" });
  }
  return doc;
}
