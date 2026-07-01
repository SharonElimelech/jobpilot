// One-off: send alerts for already-scored high-match jobs (alerts that failed pre-token).
import { createClient } from "@supabase/supabase-js";
import { formatAlert, sendTelegram } from "../src/notify.js";
import type { NormalizedJob, ScoreResult } from "../src/types.js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const { data, error } = await supabase.from("jobs").select("*").gte("score", 70);
if (error) throw error;

await sendTelegram("🛩️ <b>JobPilot מחובר!</b> מעכשיו תקבל כאן התראות על משרות חמות. הנה מה שכבר נמצא:");

for (const row of data) {
  const job: NormalizedJob = {
    source: row.source, company: row.company, title: row.title,
    description: row.description, location: row.location, url: row.url,
    postedAt: row.posted_at, contentHash: row.content_hash,
  };
  const score: ScoreResult = {
    score: row.score, reasons: row.reasons ?? [], missing_skills: row.missing_skills ?? [],
  };
  await sendTelegram(formatAlert(job, score, row.ghost_flag));
  console.log(`sent: ${row.score} ${row.title}`);
}
console.log(`done, ${data.length} alerts sent`);
