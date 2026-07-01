import * as cheerio from "cheerio";
import type { RawJob } from "../types.js";

interface GreenhouseJob {
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  content?: string; // HTML-escaped HTML
}

export function mapGreenhouseJob(j: GreenhouseJob, company: string): RawJob {
  // content is HTML-escaped HTML: unescape by parsing once, then strip tags
  const unescaped = cheerio.load(j.content ?? "").text();
  const description = cheerio.load(unescaped).text().replace(/\s+/g, " ").trim();
  return {
    source: "greenhouse",
    company,
    title: j.title,
    description,
    location: j.location?.name ?? "",
    url: j.absolute_url,
    postedAt: j.updated_at ?? null,
  };
}

export async function fetchGreenhouse(slug: string, company: string): Promise<RawJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  if (!res.ok) throw new Error(`greenhouse ${slug}: HTTP ${res.status}`);
  const data = (await res.json()) as { jobs: GreenhouseJob[] };
  return data.jobs.map((j) => mapGreenhouseJob(j, company));
}
