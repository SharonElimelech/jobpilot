import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getCv, type JobRow } from "./db";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// uploaded CV (Supabase Storage) wins; bundled cv.md is the fallback
async function cv(): Promise<string> {
  return (await getCv()) ?? readFileSync(join(process.cwd(), "cv.md"), "utf8");
}

export async function tailorCv(job: JobRow & { description?: string }): Promise<string> {
  const response = await anthropic().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 6000,
    system: `You tailor one specific candidate's CV to a specific job posting.

STRICT HONESTY RULES — violating any of these makes the output worthless:
- You may ONLY reorder sections, rephrase existing content, and emphasize genuinely relevant items.
- You may align terminology with the posting's keywords ONLY when the CV truly contains that skill/experience.
- NEVER invent skills, tools, experience, employers, dates, titles, or metrics that are not in the original CV.
- If the posting requires something the candidate lacks — do NOT claim it. Leave the gap.
- Every change must be traceable to the original CV.

Candidate's original CV:

${await cv()}`,
    messages: [{
      role: "user",
      content: `Tailor the CV to this posting. Output exactly this markdown structure:

## מה שונה
Bullet list in Hebrew. Each bullet: what was changed + one-line why. Only real changes (reordering, rephrasing, emphasis). If a section was left untouched, don't mention it.

---

Then the complete tailored CV in English, clean markdown, ATS-friendly (no tables, standard section headers).

Job posting:
Title: ${job.title}
Company: ${job.company}
Description:
${job.description?.slice(0, 8000) ?? ""}`,
    }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text in tailor response");
  return text.text;
}

export async function generateKit(job: JobRow): Promise<string> {
  const response = await anthropic().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: `You are an expert Israeli tech career coach and CV writer. You help one specific candidate.
Candidate CV:

${await cv()}

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
