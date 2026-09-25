"use client";

import { useMemo, useState } from "react";
import { missingRequired, parseDocument, type TemplateEntry, type Values } from "@/lib/document";
import { DocumentPreview } from "./DocumentPreview";
import { FieldInput } from "./FieldInput";

function fileName(title: string, parties: (string | undefined)[]): string {
  return (
    [title, ...parties]
      .filter(Boolean)
      .join(" - ")
      .replace(/[^\w\s.-]/g, "")
      .replace(/\s+/g, " ")
      .trim() + ".pdf"
  );
}

export function NdaCreator({ entry, source }: { entry: TemplateEntry; source: string }) {
  const [values, setValues] = useState<Values>({});
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  const blocks = useMemo(() => parseDocument(source, entry.fields, values), [source, entry, values]);
  const missing = missingRequired(entry.fields, values);

  async function download() {
    setDownloading(true);
    setError(false);
    try {
      // Loaded on demand: jsPDF is only needed once the user downloads.
      const { renderPdf } = await import("@/lib/pdf");
      renderPdf(blocks).save(fileName(entry.title, [values.party_a_name, values.party_b_name]));
    } catch (e) {
      console.error("PDF generation failed", e);
      setError(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(20rem,26rem)_1fr]">
      <form
        className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (missing.length === 0) void download();
        }}
      >
        {entry.fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name] ?? ""}
            onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
          />
        ))}

        <div className="sticky bottom-0 space-y-2 bg-neutral-50 pt-2 pb-1">
          <button
            type="submit"
            disabled={missing.length > 0 || downloading}
            aria-describedby="download-status"
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
          >
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </button>
          <p
            id="download-status"
            className={`text-center text-xs ${error ? "text-red-700" : "text-neutral-600"}`}
            aria-live="polite"
          >
            {error
              ? "Sorry, the PDF could not be created. Please try again."
              : missing.length > 0
                ? `Fill in ${missing.length} more required field${missing.length === 1 ? "" : "s"} to download.`
                : "All required fields are filled in."}
          </p>
        </div>
      </form>

      <section aria-label="Document preview">
        <DocumentPreview blocks={blocks} />
      </section>
    </div>
  );
}
