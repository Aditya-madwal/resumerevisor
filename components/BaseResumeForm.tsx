"use client";

import { useState } from "react";

export default function BaseResumeForm({
  initialLatex,
  onSaved,
  onCancel,
}: {
  initialLatex: string;
  onSaved: (latex: string) => void;
  onCancel?: () => void;
}) {
  const [latex, setLatex] = useState(initialLatex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (file) setLatex(await file.text());
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save resume");
      onSaved(latex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save resume");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <h2>Your base resume</h2>
      <p className="muted">
        Upload a <code>.tex</code> file or paste your resume LaTeX. It is stored as plain text and
        used as the starting point for every tailored resume.
      </p>
      <input type="file" accept=".tex,text/plain" onChange={(e) => onFile(e.target.files?.[0])} />
      <textarea
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        placeholder="\documentclass{article} ..."
        rows={18}
        spellCheck={false}
        className="mono"
      />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button onClick={save} disabled={saving || !latex.trim()}>
          {saving ? "Saving…" : "Save base resume"}
        </button>
        {onCancel && (
          <button className="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
