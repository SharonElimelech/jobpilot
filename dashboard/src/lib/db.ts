import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// lazy server-only client (service key never reaches the browser; no env needed at build time)
let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  client ??= createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  );
  return client;
}

export interface JobRow {
  url: string;
  title: string;
  company: string;
  location: string;
  source: string;
  posted_at: string | null;
  first_seen: string;
  score: number | null;
  reasons: string[] | null;
  missing_skills: string[] | null;
  ghost_flag: boolean;
  app_status: string | null;
  applied_at: string | null;
}

export async function getJob(url: string): Promise<(JobRow & { description: string }) | null> {
  const { data, error } = await supabase().from("jobs").select("*").eq("url", url).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getKit(url: string): Promise<string | null> {
  const { data, error } = await supabase().from("apply_kits").select("kit_md").eq("url", url).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.kit_md ?? null;
}

export async function saveKit(url: string, kitMd: string): Promise<void> {
  const { error } = await supabase().from("apply_kits").upsert({ url, kit_md: kitMd });
  if (error) throw new Error(error.message);
}

// ── CV storage (Supabase Storage bucket, no schema changes needed) ──
const CV_BUCKET = "cv";

async function ensureBucket(): Promise<void> {
  // idempotent; errors if exists — ignored
  await supabase().storage.createBucket(CV_BUCKET, { public: false }).catch(() => {});
}

async function readText(path: string): Promise<string | null> {
  const { data, error } = await supabase().storage.from(CV_BUCKET).download(path);
  if (error || !data) return null;
  return data.text();
}

async function writeText(path: string, content: string): Promise<void> {
  await ensureBucket();
  const { error } = await supabase().storage.from(CV_BUCKET).upload(path, new Blob([content], { type: "text/markdown" }), { upsert: true });
  if (error) throw new Error(error.message);
}

export const getCv = () => readText("profile.md");
export const saveCv = (md: string) => writeText("profile.md", md);

const tailoredPath = (url: string) => `tailored/${Buffer.from(url).toString("base64url")}.md`;
export const getTailoredCv = (url: string) => readText(tailoredPath(url));
export const saveTailoredCv = (url: string, md: string) => writeText(tailoredPath(url), md);

export async function getJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase()
    .from("jobs")
    .select("url, title, company, location, source, posted_at, first_seen, score, reasons, missing_skills, ghost_flag, app_status, applied_at")
    .order("score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data as JobRow[];
}
