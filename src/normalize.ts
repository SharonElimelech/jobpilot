import { createHash } from "node:crypto";
import type { RawJob, NormalizedJob } from "./types.js";

export function contentHash(company: string, title: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const key = `${clean(company)}|${clean(title)}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

// ponytail: keyword filter, LLM scoring catches nuance downstream
const RELEVANT = [
  /student/i, /junior/i, /entry[- ]level/i, /full[- ]?stack/i,
  /front[- ]?end/i, /back[- ]?end/i, /react/i, /node/i,
  /software (engineer|developer)/i, /web developer/i,
  /סטודנט/, /ג'וניור/, /מתכנת/, /מפתח/,
];
const EXCLUDE = [
  /senior/i, /\blead\b/i, /principal/i, /staff/i, /manager/i,
  /architect/i, /director/i, /בכיר/, /ראש צוות/,
];

export function isRelevantTitle(title: string): boolean {
  return RELEVANT.some((r) => r.test(title)) && !EXCLUDE.some((r) => r.test(title));
}

export function normalize(raw: RawJob): NormalizedJob {
  const company = raw.company.trim();
  const title = raw.title.replace(/\s+/g, " ").trim();
  return {
    ...raw,
    company,
    title,
    location: raw.location.trim(),
    description: raw.description.trim(),
    contentHash: contentHash(company, title),
  };
}
