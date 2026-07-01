import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { JobRow } from "./db.js";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// ponytail: cv.md duplicated from repo root (dashboard deploys alone) — update both on CV change
function cv(): string {
  return readFileSync(join(process.cwd(), "cv.md"), "utf8");
}

export async function generateKit(job: JobRow): Promise<string> {
  const response = await anthropic().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: `You are an expert Israeli tech career coach and CV writer. You help one specific candidate.
Candidate CV:

${cv()}

Write in the language of the job posting (Hebrew posting → Hebrew, English posting → English). CV content itself always in English (Israeli tech standard). Be concrete, no fluff, no invented experience — only reframe what the CV actually contains.`,
    messages: [{
      role: "user",
      content: `Create a complete application kit for this job posting, as markdown with exactly these sections:

## תקציר התאמה
3-4 bullet points: why this candidate fits, and what to emphasize.

## קורות חיים מותאמים (ATS)
Full tailored CV in English, markdown. Reorder and rephrase the candidate's real experience to mirror this posting's keywords and priorities. Do not invent anything.

## מכתב מקדים
Short cover letter (120-180 words) in the posting's language. Specific to this company and role, no generic phrases.

## תשובות לשאלות נפוצות
Prepared answers (3-5 sentences each) for: "ספר על עצמך", "למה החברה הזאת", "למה שנקח אותך בלי ניסיון תעשייתי".

## הכנה לראיון
- One-paragraph brief on the company (from the posting only — do not invent facts).
- 8 likely interview questions for this specific role and stack: 4 technical (based on the posting's technologies), 2 behavioral, 2 about the candidate's projects.

Job posting:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${(job as JobRow & { description?: string }).description?.slice(0, 8000) ?? ""}`,
    }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text in kit response");
  return text.text;
}
