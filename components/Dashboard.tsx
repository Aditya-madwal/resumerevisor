"use client";

import { useEffect, useState } from "react";
import BaseResumeForm from "./BaseResumeForm";
import { compileLatexToPdf, downloadBlob } from "@/lib/compileLatex";

type Stage = "idle" | "tailoring" | "compiling";

const MAX_REPAIRS = 2;

export default function Dashboard() {
  const [baseLatex, setBaseLatex] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [jd, setJd] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => setBaseLatex(d.latex ?? null))
      .catch(() => setBaseLatex(null));
  }, []);

  async function generate() {
    setError(null);
    try {
      setStage("tailoring");
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to tailor resume");

      // LLM output occasionally has LaTeX errors; on failure, feed the compile log back for a fix.
      let latex: string = data.latex;
      for (let attempt = 0; ; attempt++) {
        setStage("compiling");
        try {
          downloadBlob(await compileLatexToPdf(latex), "tailored-resume.pdf");
          break;
        } catch (e) {
          if (attempt >= MAX_REPAIRS) throw e;
          setStage("tailoring");
          const fix = await fetch("/api/tailor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brokenLatex: latex,
              compileError: e instanceof Error ? e.message : String(e),
            }),
          });
          const fixed = await fix.json();
          if (!fix.ok) throw e;
          latex = fixed.latex;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStage("idle");
    }
  }

  if (baseLatex === undefined) return <p className="muted">Loading…</p>;

  if (baseLatex === null || editing) {
    return (
      <BaseResumeForm
        initialLatex={baseLatex ?? ""}
        onSaved={(l) => {
          setBaseLatex(l);
          setEditing(false);
        }}
        onCancel={baseLatex ? () => setEditing(false) : undefined}
      />
    );
  }

  const busy = stage !== "idle";
  return (
    <div className="stack">
      <h2>Tailor your resume</h2>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the job description here…"
        rows={16}
        disabled={busy}
      />
      {error && <pre className="error">{error}</pre>}
      <div className="row">
        <button onClick={generate} disabled={busy || jd.trim().length < 30}>
          {stage === "tailoring"
            ? "Tailoring with Gemini…"
            : stage === "compiling"
              ? "Compiling PDF…"
              : "Generate tailored resume"}
        </button>
        <button className="secondary" onClick={() => setEditing(true)} disabled={busy}>
          Edit base resume
        </button>
      </div>
      {stage === "compiling" && (
        <p className="muted">First compile downloads the LaTeX engine and can take a bit.</p>
      )}
    </div>
  );
}
