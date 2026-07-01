import * as cheerio from "cheerio";
import type { RawJob } from "../types.js";

// ponytail: fragile HTML scrape — throws → skipped by run isolation.
// If AllJobs 403s from GitHub Actions IPs, unregister in sources/index.ts and note in README.
export async function fetchAllJobs(): Promise<RawJob[]> {
  const res = await fetch(
    "https://www.alljobs.co.il/SearchResultsGuest.aspx?page=1&position=235,1970&type=&freetxt=junior&city=&region=",
    { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } },
  );
  if (!res.ok) throw new Error(`alljobs: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const jobs: RawJob[] = [];
  const seen = new Set<string>();

  $("a[href*='UploadSingle']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const title = ($(el).attr("title") ?? $(el).text())
      .replace(/^(דרושים|הצעות עבודה) \| /, "")
      .replace(/ \| .*$/, "")
      .trim();
    if (!href || !title || seen.has(href)) return;
    seen.add(href);
    // the job card container holds company + description near the link
    const card = $(el).closest("[class*='job-content-top']").parent();
    const desc = card.find("[class*='job-content-top-desc']").first().text().trim();
    const company = card.find("a[href*='Employer']").first().text().trim();
    jobs.push({
      source: "alljobs",
      company,
      title,
      description: desc,
      location: "",
      url: new URL(href, "https://www.alljobs.co.il").href,
      postedAt: null,
    });
  });
  return jobs;
}
