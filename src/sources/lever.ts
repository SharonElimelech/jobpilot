import type { RawJob } from "../types.js";

interface LeverJob {
  text: string;
  hostedUrl: string;
  categories?: { location?: string };
  createdAt?: number; // epoch ms
  descriptionPlain?: string;
}

export function mapLeverJob(j: LeverJob, company: string): RawJob {
  return {
    source: "lever",
    company,
    title: j.text,
    description: (j.descriptionPlain ?? "").replace(/\s+/g, " ").trim(),
    location: j.categories?.location ?? "",
    url: j.hostedUrl,
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
  };
}

export async function fetchLever(slug: string, company: string): Promise<RawJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (!res.ok) throw new Error(`lever ${slug}: HTTP ${res.status}`);
  const data = (await res.json()) as LeverJob[];
  return data.map((j) => mapLeverJob(j, company));
}
