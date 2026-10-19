import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { profiles } from "@/lib/mongodb";

const MAX_LATEX_CHARS = 200_000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await (await profiles()).findOne({ clerkUserId: userId });
  return NextResponse.json({ latex: doc?.baseResumeLatex ?? null });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { latex } = (await req.json().catch(() => ({}))) as { latex?: unknown };
  if (typeof latex !== "string" || !latex.includes("\\begin{document}")) {
    return NextResponse.json(
      { error: "Provide a complete LaTeX resume (must contain \\begin{document})." },
      { status: 400 },
    );
  }
  if (latex.length > MAX_LATEX_CHARS) {
    return NextResponse.json({ error: "Resume is too large." }, { status: 413 });
  }

  await (await profiles()).updateOne(
    { clerkUserId: userId },
    { $set: { baseResumeLatex: latex, updatedAt: new Date() } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
