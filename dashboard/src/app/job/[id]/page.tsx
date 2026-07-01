import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob, getKit } from "@/lib/db";
import { fromId } from "@/lib/id";
import { mdToHtml } from "@/lib/md";
import KitPanel from "@/components/KitPanel";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // kit generation server action can take ~30s

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = fromId(id);
  const job = await getJob(url);
  if (!job) notFound();
  const kitMd = await getKit(url);

  return (
    <main>
      <header className="hdr">
        <h1 style={{ fontSize: 24 }}>
          <Link href="/" style={{ color: "var(--acc)", textDecoration: "none" }}>JOBPILOT</Link>
        </h1>
        <span className="sub">← <Link href="/" style={{ color: "var(--dim)" }}>חזרה ללוח</Link></span>
      </header>

      <section className="panel">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{job.title}</h2>
            <div style={{ color: "var(--dim)", fontSize: 14 }}>
              {[job.company, job.location, job.source].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {job.score !== null && (
              <span className="score s-hi" style={{ padding: "8px 16px" }}>{job.score}</span>
            )}
            <a className="chip on" href={job.url} target="_blank" rel="noreferrer">למשרה המקורית ↗</a>
          </div>
        </div>
        {job.reasons && job.reasons.length > 0 && (
          <p className="why" style={{ marginTop: 10 }}>✓ {job.reasons.join(" · ")}</p>
        )}
        {job.missing_skills && job.missing_skills.length > 0 && (
          <p className="why miss">חסר: {job.missing_skills.join(", ")}</p>
        )}
      </section>

      <KitPanel url={url} kitMd={kitMd} kitHtml={kitMd ? mdToHtml(kitMd) : null} />

      <section className="panel">
        <h2>תיאור המשרה</h2>
        <p style={{ whiteSpace: "pre-wrap", color: "#a9bccb", fontSize: 14, lineHeight: 1.7 }}>
          {job.description}
        </p>
      </section>
    </main>
  );
}
