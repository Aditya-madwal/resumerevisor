import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are an expert resume writer and ATS (Applicant Tracking System) specialist.
You receive a candidate's base resume as LaTeX source and a target job description.
Rewrite the resume content to fit the job description:
- Mirror the job description's relevant keywords and terminology, but only where the candidate's experience truthfully supports them. Never invent employers, titles, dates, degrees, skills or metrics.
- Reorder and rephrase bullets so the most relevant experience comes first; trim the least relevant.
- Use strong action verbs and quantified impact already present in the base resume.
- Keep the resume ATS-friendly: single column, standard section headings, plain text content, no images, no tables for layout, no text in graphics.
- Preserve the LaTeX preamble, document class, packages and overall structure/macros so the document still compiles with pdfLaTeX. Do not add packages that are not already used.
- Edit only the human-readable text. Never change, add or remove macro definitions, environments or braces: every { must have a matching } exactly as in the base resume. Reuse the base resume's own macros instead of expanding them inline.
- Escape special characters in text (& % $ # _) as LaTeX requires.
- Keep the length to the same page count as the base resume.
Output ONLY the complete LaTeX source, from \\documentclass to \\end{document}. No markdown fences, no commentary.`;

function stripFences(text: string): string {
  const fenced = text.match(/```(?:latex|tex)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

/** Net count of unescaped braces outside comments; 0 means balanced. */
export function braceImbalance(latex: string): number {
  let depth = 0;
  for (const line of latex.split("\n")) {
    const code = line
      .replace(/\\\\/g, "")
      .replace(/\\[{}%]/g, "")
      .replace(/%.*$/, "");
    for (const ch of code) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
  }
  return depth;
}

async function generate(contents: string, temperature: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const response = await new GoogleGenAI({ apiKey }).models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents,
    config: { systemInstruction: SYSTEM_INSTRUCTION, temperature },
  });

  const latex = stripFences(response.text ?? "");
  if (!latex.includes("\\begin{document}") || !latex.includes("\\end{document}")) {
    throw new Error("Model did not return a complete LaTeX document");
  }
  return latex;
}

export function repairLatex(brokenLatex: string, compileError: string): Promise<string> {
  return generate(
    `The LaTeX below failed to compile with pdfLaTeX. Fix only the error(s); keep the content otherwise unchanged.\n\n<compile_error>\n${compileError.slice(-3000)}\n</compile_error>\n\n<latex>\n${brokenLatex}\n</latex>`,
    0.1,
  );
}

export async function tailorResume(
  baseLatex: string,
  jobDescription: string,
): Promise<string> {
  let latex = await generate(
    `<job_description>\n${jobDescription}\n</job_description>\n\n<base_resume_latex>\n${baseLatex}\n</base_resume_latex>`,
    0.4,
  );
  const imbalance = braceImbalance(latex);
  if (imbalance !== 0) {
    latex = await repairLatex(
      latex,
      `Unbalanced braces: ${imbalance > 0 ? `${imbalance} unclosed {` : `${-imbalance} extra }`}`,
    );
  }
  return latex;
}
