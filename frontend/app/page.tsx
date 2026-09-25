import { loadTemplate } from "@/lib/templates";
import { NdaCreator } from "./components/NdaCreator";

export default async function Home() {
  const { entry, source } = await loadTemplate("mutual-nda");

  return (
    <div className="flex-1">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-indigo-600">Prelegal</p>
          <h1 className="text-2xl font-bold">{entry.title} Creator</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Fill in the details below. The agreement updates as you type, and you can download it as
            a PDF once every required field is complete.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <NdaCreator entry={entry} source={source} />
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-neutral-500 sm:px-6">
        This template is a general starting point and is not legal advice. Have a qualified
        attorney review it for your jurisdiction and circumstances.
      </footer>
    </div>
  );
}
