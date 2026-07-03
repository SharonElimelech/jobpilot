import type { JobRow } from "@/lib/db";

export default function SkillRadar({ jobs }: { jobs: JobRow[] }) {
  const counts = new Map<string, number>();
  for (const j of jobs) {
    for (const raw of j.missing_skills ?? []) {
      const s = raw.trim().toLowerCase();
      if (!s) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length === 0) return null;
  const max = top[0][1];

  return (
    <section className="panel" data-reveal>
      <h2>
        📡 Skill Gap Radar
        <span className="tag">מה השוק דורש ואין לך — לפי {jobs.length} משרות שנסרקו</span>
      </h2>
      {top.map(([skill, n], i) => (
        <div className="skill" key={skill}>
          <span>{skill}</span>
          <span className="bar">
            <i style={{ width: `${(n / max) * 100}%`, animationDelay: `${i * 0.05}s` }} />
          </span>
          <span className="n">{n}</span>
        </div>
      ))}
    </section>
  );
}
