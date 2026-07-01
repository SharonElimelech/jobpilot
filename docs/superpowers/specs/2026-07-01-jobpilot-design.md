# JobPilot — Design Spec

**Date:** 2026-07-01
**Owner:** Sharon Elimelech
**Status:** Approved

## Overview

JobPilot is an autonomous job-hunt agent for a single user (Sharon). It scans
Israeli job sources on a schedule, scores each new posting against Sharon's CV
using Claude, and sends instant Telegram alerts for high-match jobs — with
freshness priority, ghost-job flags, and the skill gaps behind every miss.

Daily-use goal: find relevant junior/student dev positions within hours of
posting. Portfolio goal: demonstrate a real scheduled data pipeline, LLM
integration, and production discipline (tests, CI, logging).

## Target roles & sources

- **Roles:** Student Software Developer, Junior Full-Stack, Junior Frontend,
  Junior Backend. Location: Israel center region, hybrid, or remote.
- **Sources (v1):** Greenhouse boards API, Lever postings API, Comeet career
  pages (curated list of Israeli companies), Drushim, AllJobs.
- **Excluded:** LinkedIn (aggressive anti-bot, ToS risk).

## Architecture (no server)

```
GitHub Actions cron (every 2 hours)
  └─ scraper run (Node.js + TypeScript)
      ├─ fetch all sources (per-source isolation)
      ├─ normalize → RawJob
      ├─ dedupe (content hash: normalized company+title; unique URL)
      ├─ upsert into Supabase Postgres
      ├─ new jobs → score with Claude Haiku vs cv.md
      └─ score ≥ 70 → Telegram alert
```

- **Runner:** GitHub Actions scheduled workflow. Free, doesn't sleep, every
  run visible in logs. Manual trigger (`workflow_dispatch`) also enabled.
- **DB:** Supabase Postgres free tier.
- **Notifications:** Telegram Bot API `sendMessage` (one-way in v1).
- **No embeddings in v1.** Direct LLM scoring is more accurate at this volume
  (dozens of jobs/day). pgvector may be added in phase 2 for dashboard search.

## Components

| Path | Responsibility |
|---|---|
| `src/sources/*.ts` | One module per source. Each exports `fetchJobs(): Promise<RawJob[]>`. A failing source is caught, logged, and skipped — never kills the run. |
| `src/normalize.ts` | Trim/normalize fields, compute content hash. |
| `src/score.ts` | Claude Haiku prompt: CV text + job description → strict JSON `{score: 0-100, reasons: string[], missing_skills: string[]}`. `missing_skills` is stored now to power the phase-2 Skill Gap Radar. |
| `src/ghost.ts` | Ghost-job detection: a hash that disappeared and reappeared, or a posting listed 45+ days → `ghost_flag`, 👻 shown in alerts. |
| `src/notify.ts` | Telegram alert: title, company, location, score, match reasons, missing skills, 🔥 if posted in the last 24h, 👻 if ghost-flagged, link. |
| `src/run.ts` | Orchestrates a scan run, writes `scan_runs` row. |
| `cv.md` | Sharon's CV as plain text (already public on his portfolio site). |

## Data model (Supabase)

```sql
jobs (
  id uuid pk,
  source text,
  company text,
  title text,
  description text,
  location text,
  url text unique,
  content_hash text,
  posted_at timestamptz null,
  first_seen timestamptz,
  last_seen timestamptz,
  score int null,
  reasons jsonb null,
  missing_skills jsonb null,
  ghost_flag boolean default false
)

scan_runs (
  id uuid pk,
  started_at timestamptz,
  finished_at timestamptz,
  per_source jsonb,   -- {source: {found, new, error}}
  total_new int
)
```

## Error handling

- Per-source try/catch; errors recorded in `scan_runs.per_source`.
- Total failure → the Action fails → GitHub emails Sharon automatically.
- Scoring failure for a job → job saved without a score, retried next run
  (query: `score is null`).
- Telegram send failure → logged, job stays in DB, visible in phase-2
  dashboard; no retry queue in v1.

## Testing

Built-in `node:test`, no framework:
1. normalize/dedupe: same job from two sources → one hash; field trimming.
2. score response parsing: valid JSON, malformed JSON, out-of-range score.

## Secrets

GitHub Actions secrets only, nothing in code:
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Phases

- **Phase 1 (this spec):** scraping, dedupe, scoring, Speed Score (🔥
  freshness in alerts), ghost detection, Telegram alerts, tests, CI.
- **Phase 2:** Next.js dashboard on Vercel (reads same Supabase), Skill Gap
  Radar (aggregate `missing_skills` → data-driven learning roadmap),
  application tracking (`applications` table).
- **Phase 3:** Apply Kit (ATS-tailored CV per job + cover letter + common
  answers), Interview Prep Pack (company brief + predicted questions), mock
  interview via two-way Telegram (webhook on a Vercel function), follow-up
  nudges.

## Out of scope

- LinkedIn scraping.
- Auto-submitting applications (anti-bot + block risk).
- Multi-user support.
- Retry queues / sophisticated backoff — YAGNI at this volume.
