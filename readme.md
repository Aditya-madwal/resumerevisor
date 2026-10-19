# Resume Revisor

Paste a job description, get your LaTeX resume tailored by Gemini and downloaded as a PDF compiled in your browser.

Stack: Next.js (App Router), Clerk, MongoDB, Gemini API, BusyTeX (pdfTeX WASM, self-hosted).

## Setup

1. `npm install`
2. Download the LaTeX engine assets (~500 MB download, ~690 MB on disk, git-ignored). If `tar` fails on Windows, extract `public/core/busytex-assets.tar.gz` manually from inside `public/core`:
   `npx texlyre-busytex download-assets ./public/core`
3. Fill in the placeholders in `.env` (see `.env.example`):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `MONGODB_URI`, `MONGODB_DB_NAME`
   - `GEMINI_API_KEY`, `GEMINI_MODEL`
4. `npm run dev`, then open http://localhost:3000

## How it works

- `/api/resume` stores/returns the user's base resume as a raw LaTeX string (collection `profiles`, keyed by Clerk user id).
- `/api/tailor` loads that LaTeX, sends it with the job description to Gemini, and returns the tailored LaTeX.
- The browser compiles the LaTeX with BusyTeX (assets served from `public/core/busytex`) and downloads the PDF. Nothing is sent to a third-party TeX server. Only `texlive-extra` (a superset of basic and recommended) is loaded; the first compile downloads it (~340 MB) and the browser caches them. BusyTeX is AGPL-3.0 licensed.
