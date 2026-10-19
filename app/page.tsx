import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="center">
      <div className="hero">
        <h1>Resume Revisor</h1>
        <p className="muted">
          Paste a job description, get your LaTeX resume rewritten for it and downloaded as an
          ATS-friendly PDF.
        </p>
        <div className="row">
          <Link className="btn" href="/sign-up">Get started</Link>
          <Link className="btn" style={{ background: "transparent", color: "inherit", border: "1px solid var(--border)" }} href="/sign-in">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
