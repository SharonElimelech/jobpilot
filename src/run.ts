import { buildSources } from "./sources/index.js";
import { normalize, isRelevantTitle } from "./normalize.js";
import { ghostFlag } from "./ghost.js";
import { scoreJob } from "./score.js";
import { formatAlert, sendTelegram } from "./notify.js";
import {
  getExistingByUrls, insertJob, touchJob, saveScore, getUnscored, logRun,
} from "./db.js";
import type { NormalizedJob, RawJob } from "./types.js";

const ALERT_THRESHOLD = 70;

async function main() {
  const startedAt = new Date().toISOString();
  const perSource: Record<string, { found: number; error?: string }> = {};
  const raw: RawJob[] = [];

  for (const src of buildSources()) {
    try {
      const jobs = await src.fetchJobs();
      perSource[src.name] = { found: jobs.length };
      raw.push(...jobs);
      console.log(`${src.name}: ${jobs.length} jobs`);
    } catch (e) {
      perSource[src.name] = { found: 0, error: String(e) };
      console.error(`${src.name} FAILED: ${e}`);
    }
  }

  // filter + normalize + dedupe within batch by url
  const byUrl = new Map<string, NormalizedJob>();
  for (const r of raw) {
    if (!isRelevantTitle(r.title)) continue;
    const n = normalize(r);
    if (!byUrl.has(n.url)) byUrl.set(n.url, n);
  }
  const batch = [...byUrl.values()];
  console.log(`${raw.length} scraped → ${batch.length} relevant unique`);

  // split new vs existing
  const existing = await getExistingByUrls(batch.map((j) => j.url));
  const ghosts = new Map<string, boolean>();
  let totalNew = 0;
  for (const job of batch) {
    const row = existing.get(job.url);
    const ghost = ghostFlag(row ?? null);
    ghosts.set(job.url, ghost);
    if (row) {
      await touchJob(job.url, ghost);
    } else {
      await insertJob(job);
      totalNew++;
    }
  }
  console.log(`${totalNew} new jobs inserted`);

  // score unscored (new + previously failed), alert on high match
  const unscored = await getUnscored();
  for (const row of unscored) {
    const job: NormalizedJob = {
      source: row.source, company: row.company, title: row.title,
      description: row.description, location: row.location, url: row.url,
      postedAt: row.posted_at, contentHash: row.content_hash,
    };
    try {
      const result = await scoreJob(job);
      await saveScore(row.url, result);
      console.log(`scored ${result.score}: ${row.title} @ ${row.company}`);
      if (result.score >= ALERT_THRESHOLD) {
        await sendTelegram(formatAlert(job, result, ghosts.get(row.url) ?? row.ghost_flag));
      }
    } catch (e) {
      console.error(`scoring failed for ${row.url}: ${e}`); // stays unscored, retried next run
    }
  }

  await logRun({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    per_source: perSource,
    total_new: totalNew,
  });

  const allFailed = Object.values(perSource).every((s) => s.error);
  if (allFailed) {
    console.error("all sources failed");
    process.exit(1); // fails the Action → GitHub emails Sharon
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
