import { createClient } from "@supabase/supabase-js";
import type { NormalizedJob, ScoreResult } from "./types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export interface JobRow {
  url: string;
  title: string;
  company: string;
  location: string;
  description: string;
  source: string;
  content_hash: string;
  posted_at: string | null;
  first_seen: string;
  last_seen: string;
  score: number | null;
  ghost_flag: boolean;
}

// ponytail: no .in() chunking — batch sizes are dozens, chunk if a source ever returns 1000+
export async function getExistingByUrls(urls: string[]) {
  if (urls.length === 0) {
    return new Map<string, { url: string; first_seen: string; last_seen: string }>();
  }
  const { data, error } = await supabase
    .from("jobs")
    .select("url, first_seen, last_seen")
    .in("url", urls);
  if (error) throw new Error(`db getExistingByUrls: ${error.message}`);
  return new Map(data.map((r) => [r.url, r]));
}

export async function insertJob(job: NormalizedJob): Promise<void> {
  const { error } = await supabase.from("jobs").insert({
    source: job.source,
    company: job.company,
    title: job.title,
    description: job.description,
    location: job.location,
    url: job.url,
    content_hash: job.contentHash,
    posted_at: job.postedAt,
  });
  if (error) throw new Error(`db insertJob ${job.url}: ${error.message}`);
}

export async function touchJob(url: string, ghost: boolean): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({ last_seen: new Date().toISOString(), ghost_flag: ghost })
    .eq("url", url);
  if (error) throw new Error(`db touchJob ${url}: ${error.message}`);
}

export async function saveScore(url: string, r: ScoreResult): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .update({ score: r.score, reasons: r.reasons, missing_skills: r.missing_skills })
    .eq("url", url);
  if (error) throw new Error(`db saveScore ${url}: ${error.message}`);
}

export async function getUnscored(limit = 40): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .is("score", null)
    .order("first_seen", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`db getUnscored: ${error.message}`);
  return data as JobRow[];
}

export async function logRun(run: {
  started_at: string;
  finished_at: string;
  per_source: Record<string, unknown>;
  total_new: number;
}): Promise<void> {
  const { error } = await supabase.from("scan_runs").insert(run);
  if (error) console.error(`db logRun: ${error.message}`); // non-fatal
}
