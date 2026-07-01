# JobPilot 🛩️

**An autonomous job-hunt agent.** Scans Israeli job sources every 2 hours, scores each new posting against my CV with Claude, and pings me on Telegram the moment a high-match job appears — with freshness priority and ghost-job detection.

Built because speed wins: candidates who apply within the first 24 hours get dramatically more responses. JobPilot makes sure I'm always first in line.

## How it works

```
GitHub Actions (cron, every 2h)
  └─ scraper run (Node.js + TypeScript)
      ├─ fetch sources (Greenhouse boards, Lever, Drushim, AllJobs)
      │    └─ per-source isolation: one failing source never kills the run
      ├─ normalize → dedupe (content hash + unique URL)
      ├─ upsert into Supabase Postgres
      ├─ new jobs → scored by Claude Haiku against cv.md
      │    └─ structured JSON output: score, match reasons, missing skills
      └─ score ≥ 70 → instant Telegram alert
```

No server. Zero hosting cost. Every run is visible in the Actions log.

## Features

- **🎯 CV match scoring** — Claude reads each job description against my actual CV and returns a 0-100 fit score with reasons, via strict JSON schema output.
- **🔥 Speed Score** — jobs posted in the last 24h are flagged; freshness is the #1 predictor of application response rates.
- **👻 Ghost Job Detector** — postings that disappear and reappear, or sit open for 45+ days, get flagged as likely ghost jobs so I don't waste applications on them.
- **📚 Skill gap capture** — every scoring pass stores `missing_skills`, building a dataset of what the junior market actually demands (powers the upcoming Skill Gap Radar).
- **📊 Run telemetry** — every scan logs per-source counts and errors to `scan_runs`.

## Tech

TypeScript · Node.js · Claude API (Haiku, structured outputs) · Supabase Postgres · GitHub Actions cron · cheerio · built-in `node:test`

## Dashboard (Phase 2)

Password-protected Next.js dashboard on Vercel ([dashboard/](dashboard/)): scrollable jobs board with score/freshness/ghost filters, one-click application tracking (applied → interview → rejected), live **Skill Gap Radar** built from every scanned posting, and pipeline stats. Server components + server actions over the same Supabase — the service key never reaches the browser.

## Setup

See [SETUP.md](SETUP.md) — Supabase project, Telegram bot via BotFather, five GitHub secrets. ~15 minutes.

```bash
npm install
npm test     # 18 unit tests, no framework
npm run scan # one full scan locally (.env)
```

Company career boards are configured in [companies.json](companies.json) — add a Greenhouse/Lever slug, no code changes needed.

## Roadmap

- **Phase 2** — Next.js dashboard (application pipeline tracking) + **Skill Gap Radar**: aggregate `missing_skills` across all scanned jobs into a data-driven "learn this next" roadmap.
- **Phase 3** — Apply Kit (ATS-tailored CV per job + cover letter), interview prep pack with predicted questions, mock interviews over Telegram, follow-up nudges.

## Known limitations

- LinkedIn is excluded by design (aggressive anti-bot, ToS risk).
- Drushim/AllJobs rely on unofficial endpoints/HTML — they may break; per-source isolation keeps the rest of the scan alive and errors are logged to `scan_runs`.
- Comeet career pages are not yet implemented (`companies.json` has a placeholder section).
