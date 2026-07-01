import type { NormalizedJob, ScoreResult } from "./types.js";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function formatAlert(
  job: NormalizedJob,
  score: ScoreResult,
  ghost: boolean,
  now: Date = new Date(),
): string {
  const fresh =
    job.postedAt !== null &&
    now.getTime() - new Date(job.postedAt).getTime() < 86_400_000;
  const badges = [fresh ? "🔥" : "", ghost ? "👻" : ""].filter(Boolean).join(" ");
  const lines = [
    `${badges ? badges + " " : ""}<b>${esc(job.title)}</b> — ${esc(job.company)}`,
    `📍 ${esc(job.location || "לא צוין")} | ציון התאמה: <b>${score.score}</b>`,
    score.reasons.length ? `✅ ${esc(score.reasons.join(" · "))}` : "",
    score.missing_skills.length ? `📚 חסר: ${esc(score.missing_skills.join(", "))}` : "",
    ghost ? `👻 חשד למשרת רפאים — מפורסמת זמן רב או פורסמה מחדש` : "",
    esc(job.url),
  ];
  return lines.filter(Boolean).join("\n");
}

export async function sendTelegram(html: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    // ponytail: log and continue — job is in DB, alert loss is non-fatal
    console.error(`telegram send failed: ${res.status} ${await res.text()}`);
  }
}
