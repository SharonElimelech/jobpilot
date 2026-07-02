"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { JobRow } from "@/lib/db";
import { toId } from "@/lib/id";
import { setStatus } from "@/app/actions";

type Filter = "all" | "hot" | "high" | "applied" | "ghost";

const DAY = 86_400_000;

function scoreClass(s: number | null): string {
  if (s === null) return "s-na";
  if (s >= 80) return "s-hi";
  if (s >= 60) return "s-ok";
  return "s-lo";
}

function isHot(j: JobRow): boolean {
  return j.posted_at !== null && Date.now() - new Date(j.posted_at).getTime() < DAY;
}

const STATUSES = [
  { key: "applied", label: "הגשתי" },
  { key: "interview", label: "ראיון" },
  { key: "rejected", label: "נדחה" },
] as const;

export default function JobBoard({ jobs }: { jobs: JobRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list: JobRow[];
    switch (filter) {
      case "hot": list = jobs.filter(isHot); break;
      case "high": list = jobs.filter((j) => (j.score ?? 0) >= 70); break;
      case "applied": list = jobs.filter((j) => j.app_status !== null); break;
      case "ghost": list = jobs.filter((j) => j.ghost_flag); break;
      default: list = jobs;
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((j) =>
      [j.title, j.company, j.location].filter(Boolean).join(" ").toLowerCase().includes(needle),
    );
  }, [jobs, filter, q]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: `הכל (${jobs.length})` },
    { key: "high", label: `התאמה 70+ (${jobs.filter((j) => (j.score ?? 0) >= 70).length})` },
    { key: "hot", label: `🔥 טריות (${jobs.filter(isHot).length})` },
    { key: "applied", label: `הגשתי (${jobs.filter((j) => j.app_status !== null).length})` },
    { key: "ghost", label: `👻 רפאים (${jobs.filter((j) => j.ghost_flag).length})` },
  ];

  return (
    <section className="panel">
      <h2>🎯 משרות</h2>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="חיפוש תפקיד, חברה או מיקום…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="חיפוש משרות"
        />
        <div className="filters" role="group" aria-label="סינון משרות">
          {chips.map((c) => (
            <button
              key={c.key}
              className={`chip ${filter === c.key ? "on" : ""}`}
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <b>לא נמצאו משרות</b>
          {q ? "נסה חיפוש אחר או נקה את הסינון." : "אין משרות בסינון הזה."}
        </div>
      )}

      {filtered.map((j, i) => (
        <div className="job" key={j.url} style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}>
          <div className={`score ${scoreClass(j.score)}`}>{j.score ?? "—"}</div>
          <div>
            <div className="t">
              <Link href={`/job/${toId(j.url)}`}>{j.title}</Link>
              {isHot(j) && <span className="badge" title="פורסם ב-24 השעות האחרונות" role="img" aria-label="משרה טרייה">🔥</span>}
              {j.ghost_flag && <span className="badge" title="חשד למשרת רפאים" role="img" aria-label="משרת רפאים">👻</span>}
              <a href={j.url} target="_blank" rel="noreferrer" className="badge" style={{ color: "var(--dim)" }} aria-label="פתח מודעה מקורית">↗</a>
            </div>
            <div className="m">
              {[j.company, j.location, j.source].filter(Boolean).join(" · ")}
            </div>
            {j.reasons && j.reasons.length > 0 && <div className="why">✓ {j.reasons.join(" · ")}</div>}
            {j.missing_skills && j.missing_skills.length > 0 && (
              <div className="why miss">חסר: {j.missing_skills.join(", ")}</div>
            )}
          </div>
          <div className="acts">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                className={`act ${j.app_status === s.key ? `on-${s.key}` : ""}`}
                onClick={() =>
                  startTransition(() => setStatus(j.url, j.app_status === s.key ? null : s.key))
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
