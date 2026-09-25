import type { Block, Line } from "@/lib/document";

function LineView({ line }: { line: Line }) {
  return line.map((run, i) => {
    if (run.kind === "blank") {
      return (
        <mark
          key={i}
          className="rounded bg-amber-100 px-1 font-sans text-[0.85em] text-amber-900 not-italic"
        >
          [{run.label}]
        </mark>
      );
    }
    return run.bold ? <strong key={i}>{run.text}</strong> : <span key={i}>{run.text}</span>;
  });
}

function Lines({ lines }: { lines: Line[] }) {
  return lines.map((line, i) => (
    <span key={i} className="block">
      <LineView line={line} />
    </span>
  ));
}

/** Renders the filled-in document as a sheet of paper. */
export function DocumentPreview({ blocks }: { blocks: Block[] }) {
  return (
    <article className="mx-auto max-w-[8.5in] bg-white break-words px-8 py-10 font-serif text-[15px] leading-relaxed text-neutral-900 shadow-md ring-1 ring-black/5 sm:px-16">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "rule":
            return <hr key={i} className="my-6 border-neutral-300" />;
          case "heading":
            return block.level === 1 ? (
              <h1 key={i} className="mb-6 text-center text-2xl font-bold">
                <Lines lines={block.lines} />
              </h1>
            ) : (
              <h2 key={i} className="mt-6 mb-2 text-base font-bold">
                <Lines lines={block.lines} />
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="mb-3">
                <Lines lines={block.lines} />
              </p>
            );
        }
      })}
    </article>
  );
}
