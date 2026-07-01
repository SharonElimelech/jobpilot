import Anthropic from "@anthropic-ai/sdk";
import { supabase, type JobRow } from "./db";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export interface InterviewRow {
  chat_id: string;
  job_url: string;
  job_title: string;
  questions: string[];
  current: number;
  transcript: { q: string; a: string }[];
  active: boolean;
}

export async function getActiveInterview(chatId: string): Promise<InterviewRow | null> {
  const { data, error } = await supabase()
    .from("mock_interviews").select("*").eq("chat_id", chatId).eq("active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function pickInterviewJob(): Promise<(JobRow & { description: string }) | null> {
  // prefer a job you applied to; otherwise the highest-scored one
  const applied = await supabase()
    .from("jobs").select("*").eq("app_status", "applied")
    .order("applied_at", { ascending: false }).limit(1).maybeSingle();
  if (applied.data) return applied.data;
  const top = await supabase()
    .from("jobs").select("*").not("score", "is", null)
    .order("score", { ascending: false }).limit(1).maybeSingle();
  return top.data ?? null;
}

export async function generateQuestions(job: { title: string; company: string; description: string }): Promise<string[]> {
  const response = await anthropic().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { questions: { type: "array", items: { type: "string" } } },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
    messages: [{
      role: "user",
      content: `Generate exactly 5 mock-interview questions in Hebrew for a junior candidate interviewing for this role. Mix: 3 technical (based on the posting's actual stack), 1 behavioral, 1 about the candidate's own projects. Short, direct questions a real Israeli interviewer would ask.\n\nRole: ${job.title} @ ${job.company}\n${job.description.slice(0, 5000)}`,
    }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no questions generated");
  return (JSON.parse(text.text) as { questions: string[] }).questions.slice(0, 5);
}

export async function startInterview(chatId: string, job: JobRow & { description: string }): Promise<string> {
  const questions = await generateQuestions(job);
  const { error } = await supabase().from("mock_interviews").upsert({
    chat_id: chatId, job_url: job.url, job_title: job.title,
    questions, current: 0, transcript: [], active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return questions[0];
}

export async function processAnswer(iv: InterviewRow, answer: string): Promise<string> {
  const q = iv.questions[iv.current];
  const transcript = [...iv.transcript, { q, a: answer }];
  const done = iv.current + 1 >= iv.questions.length;

  const prompt = done
    ? `The mock interview for "${iv.job_title}" is over. Full transcript:\n${transcript.map((t, i) => `Q${i + 1}: ${t.q}\nA: ${t.a}`).join("\n\n")}\n\nGive the candidate, in Hebrew: (1) one-sentence feedback on the last answer, (2) overall score 1-10, (3) the 2 strongest moments, (4) the 2 most important things to improve, each with a concrete better phrasing. Telegram-friendly, no markdown headers, use emoji sparingly.`
    : `Mock interview for "${iv.job_title}". Question asked: "${q}". Candidate answered: "${answer}".\n\nIn Hebrew: give 1-2 sentences of specific feedback (what was good, what to sharpen), then ask the next question: "${iv.questions[iv.current + 1]}". Format: feedback, blank line, then the question prefixed with the number ${iv.current + 2}/5. No markdown headers.`;

  const response = await anthropic().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no feedback generated");

  const { error } = await supabase().from("mock_interviews").update({
    transcript, current: iv.current + 1, active: !done,
    updated_at: new Date().toISOString(),
  }).eq("chat_id", iv.chat_id);
  if (error) throw new Error(error.message);

  return text.text;
}

export async function stopInterview(chatId: string): Promise<void> {
  await supabase().from("mock_interviews").update({ active: false }).eq("chat_id", chatId);
}
