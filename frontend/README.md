# Prelegal Frontend: Mutual NDA Creator

A Next.js prototype. The user fills in a form, sees the Mutual NDA update as they type, and downloads the completed agreement as a PDF.

The NDA text and form fields come from the shared template dataset in [`../templates`](../templates): `mutual-nda.md` and its entry in `catalog.json`. That dataset is the single source of truth. Change a template or its fields there and the app picks it up on the next build.

## Getting Started

Requires Node.js 22+.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (Vitest)
npm run lint
npm run build
```

Run these commands from inside `frontend/`, because the app finds the templates at `../templates` relative to the working directory.

## How It Works

- `app/page.tsx` is a server component. It reads the template and its catalog entry at build time.
- `lib/document.ts` parses the template into a small block model: headings, paragraphs, rules, and bold, filled, or blank text. User input is always inserted as plain text, never as markup.
- `app/components/NdaCreator.tsx` holds the form state and renders the live preview from the block model.
- `lib/pdf.ts` renders the same block model to a Letter-size PDF with jsPDF. The PDF text is selectable. jsPDF is loaded only when the user clicks **Download PDF**, and the button is enabled only after every required field is filled.
