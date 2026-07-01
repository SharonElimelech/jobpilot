import { getJobs } from "@/lib/db";
import JobBoard from "@/components/JobBoard";
import SkillRadar from "@/components/SkillRadar";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function Home() {
  const jobs = await getJobs();
  const now = Date.now();

  const newWeek = jobs.filter((j) => now - new Date(j.first_seen).getTime() < 7 * DAY).length;
  const hot = jobs.filter((j) => j.posted_at && now - new Date(j.posted_at).getTime() < DAY).length;
  const high = jobs.filter((j) => (j.score ?? 0) >= 70).length;
  const applied = jobs.filter((j) => j.app_status !== null).length;

  return (
    <main>
      <header className="hdr">
        <h1>
          JOBPILOT<span className="blip" />
        </h1>
        <span className="sub">סורק את השוק כל שעתיים · ‏{jobs.length} משרות במעקב</span>
      </header>

      <div className="stats">
        <div className="stat"><div className="num">{jobs.length}</div><div className="lbl">משרות רלוונטיות</div></div>
        <div className="stat"><div className="num">{high}</div><div className="lbl">התאמה 70+</div></div>
        <div className="stat hot"><div className="num">{hot}</div><div className="lbl">🔥 טריות מ-24 שעות</div></div>
        <div className="stat"><div className="num">{newWeek}</div><div className="lbl">חדשות השבוע</div></div>
        <div className="stat ghost"><div className="num">{applied}</div><div className="lbl">הגשות פעילות</div></div>
      </div>

      <JobBoard jobs={jobs} />
      <SkillRadar jobs={jobs} />
    </main>
  );
}
