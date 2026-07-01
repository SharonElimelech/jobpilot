import type { RawJob } from "../types.js";

const QUERIES = ["junior developer", "student software", "full stack junior", "מפתח ג'וניור"];

interface DrushimItem {
  Company?: { CompanyDisplayName?: string };
  JobContent?: {
    Name?: string;
    Description?: string;
    Requirements?: string;
    Regions?: { NameInHebrew?: string }[];
  };
  JobInfo?: { Link?: string; Date?: string };
}

// ponytail: unofficial endpoint — expect breakage, per-source isolation in run.ts covers it
export async function fetchDrushim(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  for (const q of QUERIES) {
    const res = await fetch(
      `https://www.drushim.co.il/api/jobs/search?searchterm=${encodeURIComponent(q)}&ssaen=1`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) throw new Error(`drushim "${q}": HTTP ${res.status}`);
    const data = (await res.json()) as { ExtentionResultList?: DrushimItem[] };
    for (const item of data.ExtentionResultList ?? []) {
      const link = item.JobInfo?.Link ?? "";
      const title = item.JobContent?.Name ?? "";
      if (!link || !title) continue;
      const description = [item.JobContent?.Description, item.JobContent?.Requirements]
        .filter(Boolean)
        .join("\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      jobs.push({
        source: "drushim",
        company: item.Company?.CompanyDisplayName ?? "",
        title,
        description,
        location: (item.JobContent?.Regions ?? [])
          .map((r) => r.NameInHebrew)
          .filter(Boolean)
          .join(", "),
        url: `https://www.drushim.co.il${link}`,
        postedAt: item.JobInfo?.Date ?? null,
      });
    }
  }
  return jobs;
}
