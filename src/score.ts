import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import type { NormalizedJob, ScoreResult } from "./types.js";

export function parseScore(text: string): ScoreResult {
  const data = JSON.parse(text);
  if (
    typeof data.score !== "number" ||
    !Array.isArray(data.reasons) ||
    !Array.isArray(data.missing_skills)
  ) {
    throw new Error(`bad score shape: ${text.slice(0, 200)}`);
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(data.score))),
    reasons: data.reasons.map(String),
    missing_skills: data.missing_skills.map(String),
  };
}

const SCORE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", description: "Overall fit 0-100" },
    reasons: {
      type: "array",
      items: { type: "string" },
      description: "Top reasons this job fits, max 3, short",
    },
    missing_skills: {
      type: "array",
      items: { type: "string" },
      description: "Skills the job requires that the CV lacks",
    },
  },
  required: ["score", "reasons", "missing_skills"],
  additionalProperties: false,
};

// lazy so importing parseScore in tests doesn't require ANTHROPIC_API_KEY
let client: Anthropic | null = null;
let system: string | null = null;

function init() {
  if (!client) {
    client = new Anthropic();
    const cv = readFileSync("cv.md", "utf8");
    system = `You score job postings for one specific candidate.
Candidate CV:

${cv}

Scoring guide:
- 90-100: near-perfect fit (student/junior role, candidate's exact stack, Israel center/hybrid/remote)
- 70-89: strong fit, worth applying immediately
- 40-69: partial fit (stack mismatch, borderline seniority, or far location)
- 0-39: poor fit (senior role, unrelated stack, or non-Israel on-site)
List missing_skills only for skills the posting explicitly requires.`;
  }
  return { client, system: system! };
}

export async function scoreJob(job: NormalizedJob): Promise<ScoreResult> {
  const { client, system } = init();
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: SCORE_SCHEMA } },
    system,
    messages: [{
      role: "user",
      content: `Score this job posting.\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription:\n${job.description.slice(0, 6000)}`,
    }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block in scoring response");
  return parseScore(text.text);
}
