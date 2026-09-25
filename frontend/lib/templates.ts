import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TemplateEntry } from "./document";

/** The PL-2 template dataset lives at the repository root, next to frontend/. */
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

interface Catalog {
  templates: TemplateEntry[];
}

/** Loads a template's catalog entry and Markdown source. Server-only (uses fs). */
export async function loadTemplate(id: string): Promise<{ entry: TemplateEntry; source: string }> {
  const catalog: Catalog = JSON.parse(
    await readFile(path.join(TEMPLATES_DIR, "catalog.json"), "utf-8"),
  );
  const entry = catalog.templates.find((t) => t.id === id);
  if (!entry) throw new Error(`Template "${id}" is not in templates/catalog.json`);
  const source = await readFile(path.join(TEMPLATES_DIR, entry.file), "utf-8");
  return { entry, source };
}
