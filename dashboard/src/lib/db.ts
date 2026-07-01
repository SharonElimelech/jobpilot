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

export async function getJobs(): Promise<JobRow[]> {
  const { data, error } = await supabase()
    .from("jobs")
    .select("url, title, company, location, source, posted_at, first_seen, score, reasons, missing_skills, ghost_flag, app_status, applied_at")
    .order("score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data as JobRow[];
}
