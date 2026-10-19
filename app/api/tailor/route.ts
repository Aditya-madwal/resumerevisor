import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { profiles } from "@/lib/mongodb";
import { repairLatex, tailorResume } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    jobDescription?: unknown;
    brokenLatex?: unknown;
    compileError?: unknown;
  };

  try {
    // Repair mode: the browser compile failed, ask the model to fix the reported error.
    if (typeof body.brokenLatex === "string" && typeof body.compileError === "string") {
      if (body.brokenLatex.length > 200_000) {
        return NextResponse.json({ error: "Resume is too large." }, { status: 413 });
      }
      const latex = await repairLatex(body.brokenLatex, body.compileError);
      return NextResponse.json({ latex });
    }

    const { jobDescription } = body;
    if (typeof jobDescription !== "string" || jobDescription.trim().length < 30) {
      return NextResponse.json({ error: "Paste the full job description." }, { status: 400 });
    }
    if (jobDescription.length > 30_000) {
      return NextResponse.json({ error: "Job description is too long." }, { status: 413 });
    }

    const doc = await (await profiles()).findOne({ clerkUserId: userId });
    if (!doc) {
      return NextResponse.json({ error: "Upload your base resume first." }, { status: 409 });
    }

    const latex = await tailorResume(doc.baseResumeLatex, jobDescription);
    return NextResponse.json({ latex });
  } catch (err) {
    console.error("tailor failed", err);
    return NextResponse.json({ error: "Failed to tailor resume. Try again." }, { status: 502 });
  }
}
