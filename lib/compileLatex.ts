// Client-side LaTeX -> PDF using BusyTeX (pdfTeX in WebAssembly), fully self-hosted from
// /public/core/busytex (fetched with `npx texlyre-busytex download-assets ./public/core`).
// No third-party TeX server is contacted at compile time.
import type { BusyTexRunner, PdfLatex } from "texlyre-busytex";

const BASE = "/core/busytex";

let compilerPromise: Promise<PdfLatex> | null = null;

function getCompiler(): Promise<PdfLatex> {
  compilerPromise ??= (async () => {
    const { BusyTexRunner, PdfLatex } = await import("texlyre-busytex");
    const runner: BusyTexRunner = new BusyTexRunner({
      busytexBasePath: BASE,
      // The TeX bundles are cumulative (extra ⊃ recommended ⊃ basic), so load exactly one.
      // Mixing them duplicates files and makes the package resolver miss packages (marvosym).
      preloadDataPackages: [`${BASE}/texlive-extra.js`],
      catalogDataPackages: [`${BASE}/texlive-extra.js`],
    });
    await runner.initialize();
    return new PdfLatex(runner);
  })().catch((err) => {
    compilerPromise = null;
    throw err;
  });
  return compilerPromise;
}

export async function compileLatexToPdf(latex: string): Promise<Blob> {
  const compiler = await getCompiler();
  const result = await compiler.compile({ input: latex, rerun: true });
  if (!result.success || !result.pdf) {
    const tail = result.log.split("\n").slice(-20).join("\n");
    throw new Error(`LaTeX compilation failed:\n${tail}`);
  }
  return new Blob([result.pdf as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
