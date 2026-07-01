// Scrape + filter only — no DB, no API keys. Sanity check for the pipeline.
import { buildSources } from "../src/sources/index.js";
import { normalize, isRelevantTitle } from "../src/normalize.js";
import type { NormalizedJob, RawJob } from "../src/types.js";

const raw: RawJob[] = [];
for (const src of buildSources()) {
  try {
    const jobs = await src.fetchJobs();
    console.log(`${src.name}: ${jobs.length}`);
    raw.push(...jobs);
  } catch (e) {
    console.error(`${src.name} FAILED: ${e}`);
  }
}

const byUrl = new Map<string, NormalizedJob>();
for (const r of raw) {
  if (!isRelevantTitle(r.title)) continue;
  const n = normalize(r);
  if (!byUrl.has(n.url)) byUrl.set(n.url, n);
}

console.log(`\n${raw.length} scraped → ${byUrl.size} relevant unique`);
console.log("\nSample relevant titles:");
for (const j of [...byUrl.values()].slice(0, 15)) {
  console.log(` - [${j.source}] ${j.title} @ ${j.company}`);
}
