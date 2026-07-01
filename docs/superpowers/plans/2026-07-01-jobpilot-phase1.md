# JobPilot Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scheduled job scanner that scrapes Israeli job sources, scores each new posting against Sharon's CV with Claude Haiku, and sends Telegram alerts for high-match jobs with freshness (🔥) and ghost-job (👻) flags.

**Architecture:** A Node.js/TypeScript script run by a GitHub Actions cron every 2 hours. No server. Supabase Postgres stores jobs and run logs. Per-source isolation: one failing source never kills the run.

**Tech Stack:** Node 20+, TypeScript (run via tsx), `@anthropic-ai/sdk`, `@supabase/supabase-js`, `cheerio`, built-in `node:test`.

## Global Constraints

- Model for scoring: `claude-haiku-4-5` (exact string).
- Structured output via `output_config: { format: { type: "json_schema", schema } }` — never the deprecated top-level `output_format`.
- Alert threshold: score ≥ 70. Ghost rules: relisted after ≥ 7-day gap, or listed ≥ 45 days.
- Secrets only from env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Nothing hardcoded.
- Tests: built-in `node:test` only, run with `npm test`. No test frameworks.
- All src files are ES modules (`"type": "module"`); intra-project imports use `.js` extension (`./types.js`).
- Commit after every task.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `companies.json`, `cv.md`

**Interfaces:**
- Produces: `npm test` (runs node:test over `tests/`), `npm run scan` (runs `src/run.ts`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "jobpilot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "scan": "tsx src/run.ts",
    "test": "tsx --test tests/*.test.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "@supabase/supabase-js": "^2",
    "cheerio": "^1"
  },
  "devDependencies": {
    "@types/node": "^22",
    "tsx": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 4: Create `.env.example`**

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

- [ ] **Step 5: Create `companies.json`** (starter list — Israeli companies on Greenhouse/Lever boards; editable without code changes)

```json
{
  "greenhouse": [
    { "slug": "monday", "company": "monday.com" },
    { "slug": "wix", "company": "Wix" },
    { "slug": "lemonade", "company": "Lemonade" },
    { "slug": "riskified", "company": "Riskified" },
    { "slug": "similarweb", "company": "Similarweb" },
    { "slug": "melio", "company": "Melio" }
  ],
  "lever": [
    { "slug": "fireblocks", "company": "Fireblocks" }
  ],
  "comeet": []
}
```

Note: some slugs may return 404 — the per-source error isolation handles that; verify and prune during Task 10 E2E.

- [ ] **Step 6: Create `cv.md`** — plain-text version of Sharon's CV. Source: `C:\Users\שרון אלימלך\Desktop\shit\שרון קורות חיים\Sharon_Elimelech_CV_EN.pdf`. Content (already extracted):

```markdown
# Sharon Elimelech — Full-Stack Developer, B.Sc. CS Student

Gan Yavne, Israel. Third-year B.Sc. Computer Science student at HIT (expected 2027).

## Skills
- Languages: JavaScript (ES6+), TypeScript, Python, C++, C, Java, SQL
- Frontend: React, Next.js, Tailwind CSS, HTML5, CSS3, responsive design, PWAs
- Backend: Node.js, Express, REST APIs, webhooks, asynchronous processing
- AI/LLM: OpenAI API, Anthropic Claude API, prompt engineering, tool-calling
- Tools: Git, GitHub, Vercel, Cloudflare, VS Code

## Projects
- WhatsApp AI customer-service bot — in production for a live business (Node.js, Express, WhatsApp Cloud API, Claude API): webhook signature verification, async message processing, per-customer conversation state, LLM constrained to knowledge base, human escalation via tool-calling.
- Personal portfolio (React, TypeScript, Vite, Tailwind, shadcn/ui), CI/CD on Vercel.
- Math Tutor App (PWA): student records, lesson calendar, WhatsApp payment reminders, offline-capable via service workers.
- Amdocs Job Watcher (Node.js): monitors job listings, instant notifications.
- CRM Cloud: client/contact/pipeline tracking, deployed for real use.
- Bank Account Simulator (C++, OOP).

## Military
Israeli Navy — Shayetet 13 (Naval Special Forces), 2 yrs 9 mos.

## Languages
Hebrew (native), English (professional).

## Looking for
Student Software Developer / Junior Full-Stack / Junior Frontend / Junior Backend positions. Israel center region, hybrid, or remote.
```

- [ ] **Step 7: Install and commit**

Run: `npm install`
Expected: node_modules created, no errors.

```bash
git add package.json package-lock.json tsconfig.json .gitignore .env.example companies.json cv.md
git commit -m "chore: scaffold JobPilot project"
```

---

### Task 2: Types + normalize (TDD)

**Files:**
- Create: `src/types.ts`, `src/normalize.ts`
- Test: `tests/normalize.test.ts`

**Interfaces:**
- Produces:
  - `RawJob { source, company, title, description, location, url, postedAt: string | null }`
  - `NormalizedJob extends RawJob { contentHash: string }`
  - `ScoreResult { score: number, reasons: string[], missing_skills: string[] }`
  - `contentHash(company: string, title: string): string`
  - `isRelevantTitle(title: string): boolean`
  - `normalize(raw: RawJob): NormalizedJob`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export interface RawJob {
  source: string;
  company: string;
  title: string;
  description: string;
  location: string;
  url: string;
  postedAt: string | null; // ISO 8601 or null when the source doesn't expose it
}

export interface NormalizedJob extends RawJob {
  contentHash: string;
}

export interface ScoreResult {
  score: number;
  reasons: string[];
  missing_skills: string[];
}
```

- [ ] **Step 2: Write the failing test `tests/normalize.test.ts`**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { contentHash, isRelevantTitle, normalize } from "../src/normalize.js";

test("contentHash ignores case and extra whitespace", () => {
  assert.equal(contentHash("Wix ", "Junior  Developer"), contentHash("wix", "junior developer"));
});

test("contentHash differs for different jobs", () => {
  assert.notEqual(contentHash("Wix", "Junior Developer"), contentHash("Wix", "Senior Developer"));
});

test("isRelevantTitle accepts junior/student roles", () => {
  assert.ok(isRelevantTitle("Junior Full Stack Developer"));
  assert.ok(isRelevantTitle("Student Software Engineer"));
  assert.ok(isRelevantTitle("Frontend Developer (React)"));
  assert.ok(isRelevantTitle("מפתח פול סטאק ג'וניור"));
});

test("isRelevantTitle rejects senior roles", () => {
  assert.equal(isRelevantTitle("Senior Backend Engineer"), false);
  assert.equal(isRelevantTitle("Engineering Manager"), false);
  assert.equal(isRelevantTitle("Staff Software Engineer"), false);
});

test("normalize trims fields and adds hash", () => {
  const n = normalize({
    source: "greenhouse", company: " Wix ", title: " Junior Dev ",
    description: "d", location: " TLV ", url: "https://x/1", postedAt: null,
  });
  assert.equal(n.company, "Wix");
  assert.equal(n.title, "Junior Dev");
  assert.equal(n.location, "TLV");
  assert.ok(n.contentHash.length >= 16);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find `../src/normalize.js`.

- [ ] **Step 4: Create `src/normalize.ts`**

```typescript
import { createHash } from "node:crypto";
import type { RawJob, NormalizedJob } from "./types.js";

export function contentHash(company: string, title: string): string {
  const key = `${company}|${title}`.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

// ponytail: keyword filter, LLM scoring catches nuance downstream
const RELEVANT = [
  /student/i, /junior/i, /entry[- ]level/i, /full[- ]?stack/i,
  /front[- ]?end/i, /back[- ]?end/i, /react/i, /node/i,
  /software (engineer|developer)/i, /web developer/i,
  /סטודנט/, /ג'וניור/, /מתכנת/, /מפתח/,
];
const EXCLUDE = [
  /senior/i, /\blead\b/i, /principal/i, /staff/i, /manager/i,
  /architect/i, /director/i, /בכיר/, /ראש צוות/,
];

export function isRelevantTitle(title: string): boolean {
  return RELEVANT.some((r) => r.test(title)) && !EXCLUDE.some((r) => r.test(title));
}

export function normalize(raw: RawJob): NormalizedJob {
  const company = raw.company.trim();
  const title = raw.title.replace(/\s+/g, " ").trim();
  return {
    ...raw,
    company,
    title,
    location: raw.location.trim(),
    description: raw.description.trim(),
    contentHash: contentHash(company, title),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/normalize.ts tests/normalize.test.ts
git commit -m "feat: job types, normalization, dedupe hash, relevance filter"
```

---

### Task 3: Claude scoring (TDD on parser)

**Files:**
- Create: `src/score.ts`
- Test: `tests/score.test.ts`

**Interfaces:**
- Consumes: `NormalizedJob`, `ScoreResult` from `src/types.ts`.
- Produces: `parseScore(text: string): ScoreResult` (throws on bad shape), `scoreJob(job: NormalizedJob): Promise<ScoreResult>`.

- [ ] **Step 1: Write the failing test `tests/score.test.ts`**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { parseScore } from "../src/score.js";

test("parseScore parses valid JSON", () => {
  const r = parseScore('{"score": 85, "reasons": ["React match"], "missing_skills": ["Docker"]}');
  assert.equal(r.score, 85);
  assert.deepEqual(r.reasons, ["React match"]);
  assert.deepEqual(r.missing_skills, ["Docker"]);
});

test("parseScore clamps out-of-range score", () => {
  assert.equal(parseScore('{"score": 150, "reasons": [], "missing_skills": []}').score, 100);
  assert.equal(parseScore('{"score": -5, "reasons": [], "missing_skills": []}').score, 0);
});

test("parseScore throws on malformed JSON", () => {
  assert.throws(() => parseScore("not json"));
});

test("parseScore throws on missing fields", () => {
  assert.throws(() => parseScore('{"score": 50}'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find `../src/score.js`.

- [ ] **Step 3: Create `src/score.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import type { NormalizedJob, ScoreResult } from "./types.js";

export function parseScore(text: string): ScoreResult {
  const data = JSON.parse(text);
  if (
    typeof data.score !== "number" ||
    !Array.isArray(data.reasons) ||
    !Array.isArray(data.missing_skills)
  ) {
    throw new Error(`bad score shape: ${text.slice(0, 200)}`);
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(data.score))),
    reasons: data.reasons.map(String),
    missing_skills: data.missing_skills.map(String),
  };
}

const SCORE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", description: "Overall fit 0-100" },
    reasons: { type: "array", items: { type: "string" }, description: "Top reasons this job fits, max 3, short" },
    missing_skills: { type: "array", items: { type: "string" }, description: "Skills the job requires that the CV lacks" },
  },
  required: ["score", "reasons", "missing_skills"],
  additionalProperties: false,
};

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
const cv = readFileSync("cv.md", "utf8");

const SYSTEM = `You score job postings for one specific candidate.
Candidate CV:

${cv}

Scoring guide:
- 90-100: near-perfect fit (student/junior role, candidate's exact stack, Israel center/hybrid/remote)
- 70-89: strong fit, worth applying immediately
- 40-69: partial fit (stack mismatch, borderline seniority, or far location)
- 0-39: poor fit (senior role, unrelated stack, requires a degree already completed, or non-Israel on-site)
List missing_skills only for skills the posting explicitly requires.`;

export async function scoreJob(job: NormalizedJob): Promise<ScoreResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: SCORE_SCHEMA } },
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Score this job posting.\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription:\n${job.description.slice(0, 6000)}`,
    }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block in scoring response");
  return parseScore(text.text);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS (parseScore tests; `scoreJob` is exercised in Task 10 E2E).

- [ ] **Step 5: Commit**

```bash
git add src/score.ts tests/score.test.ts
git commit -m "feat: Claude Haiku job scoring with structured JSON output"
```

---

### Task 4: Ghost-job detection (TDD)

**Files:**
- Create: `src/ghost.ts`
- Test: `tests/ghost.test.ts`

**Interfaces:**
- Produces: `ghostFlag(existing: { first_seen: string; last_seen: string } | null, now?: Date): boolean`

- [ ] **Step 1: Write the failing test `tests/ghost.test.ts`**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { ghostFlag } from "../src/ghost.js";

const now = new Date("2026-07-01T00:00:00Z");
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

test("new job is not a ghost", () => {
  assert.equal(ghostFlag(null, now), false);
});

test("fresh continuously-listed job is not a ghost", () => {
  assert.equal(ghostFlag({ first_seen: iso(3), last_seen: iso(0.1) }, now), false);
});

test("job reappearing after 7+ day gap is a ghost", () => {
  assert.equal(ghostFlag({ first_seen: iso(30), last_seen: iso(10) }, now), true);
});

test("job listed 45+ days is a ghost", () => {
  assert.equal(ghostFlag({ first_seen: iso(50), last_seen: iso(0.1) }, now), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find `../src/ghost.js`.

- [ ] **Step 3: Create `src/ghost.ts`**

```typescript
const REAPPEAR_GAP_DAYS = 7;
const STALE_AGE_DAYS = 45;

export function ghostFlag(
  existing: { first_seen: string; last_seen: string } | null,
  now: Date = new Date(),
): boolean {
  if (!existing) return false;
  const days = (t: string) => (now.getTime() - new Date(t).getTime()) / 86_400_000;
  return days(existing.last_seen) >= REAPPEAR_GAP_DAYS || days(existing.first_seen) >= STALE_AGE_DAYS;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ghost.ts tests/ghost.test.ts
git commit -m "feat: ghost-job detection (relist gap + stale age)"
```

---

### Task 5: Telegram notify (TDD on formatting)

**Files:**
- Create: `src/notify.ts`
- Test: `tests/notify.test.ts`

**Interfaces:**
- Consumes: `NormalizedJob`, `ScoreResult`.
- Produces: `formatAlert(job, score, ghost, now?): string` (Telegram HTML), `sendTelegram(html: string): Promise<void>`.

- [ ] **Step 1: Write the failing test `tests/notify.test.ts`**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { formatAlert } from "../src/notify.js";

const job = {
  source: "greenhouse", company: "Wix", title: "Junior <Dev>",
  description: "", location: "Tel Aviv", url: "https://x/1",
  postedAt: new Date(Date.now() - 3600_000).toISOString(), contentHash: "h",
};
const score = { score: 88, reasons: ["React"], missing_skills: ["Docker"] };

test("fresh job gets fire emoji and escapes HTML", () => {
  const msg = formatAlert(job, score, false);
  assert.ok(msg.includes("🔥"));
  assert.ok(msg.includes("&lt;Dev&gt;"));
  assert.ok(msg.includes("88"));
  assert.ok(msg.includes("https://x/1"));
});

test("ghost job gets ghost emoji", () => {
  assert.ok(formatAlert({ ...job, postedAt: null }, score, true).includes("👻"));
});

test("old job gets no fire emoji", () => {
  const old = { ...job, postedAt: new Date(Date.now() - 3 * 86_400_000).toISOString() };
  assert.equal(formatAlert(old, score, false).includes("🔥"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — expected FAIL, module not found.

- [ ] **Step 3: Create `src/notify.ts`**

```typescript
import type { NormalizedJob, ScoreResult } from "./types.js";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function formatAlert(
  job: NormalizedJob,
  score: ScoreResult,
  ghost: boolean,
  now: Date = new Date(),
): string {
  const fresh = job.postedAt !== null &&
    now.getTime() - new Date(job.postedAt).getTime() < 86_400_000;
  const badges = [fresh ? "🔥" : "", ghost ? "👻" : ""].filter(Boolean).join(" ");
  const lines = [
    `${badges ? badges + " " : ""}<b>${esc(job.title)}</b> — ${esc(job.company)}`,
    `📍 ${esc(job.location || "לא צוין")} | ציון התאמה: <b>${score.score}</b>`,
    score.reasons.length ? `✅ ${esc(score.reasons.join(" · "))}` : "",
    score.missing_skills.length ? `📚 חסר: ${esc(score.missing_skills.join(", "))}` : "",
    ghost ? `👻 חשד למשרת רפאים — מפורסמת זמן רב או פורסמה מחדש` : "",
    esc(job.url),
  ];
  return lines.filter(Boolean).join("\n");
}

export async function sendTelegram(html: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    // ponytail: log and continue — job is in DB, alert loss is non-fatal
    console.error(`telegram send failed: ${res.status} ${await res.text()}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notify.ts tests/notify.test.ts
git commit -m "feat: Telegram alerts with freshness and ghost badges"
```

---

### Task 6: Supabase DB layer

**Files:**
- Create: `src/db.ts`, `supabase/schema.sql`

**Interfaces:**
- Consumes: `NormalizedJob`, `ScoreResult`, `ghostFlag`.
- Produces:
  - `getExistingByUrls(urls: string[]): Promise<Map<string, { url; first_seen; last_seen }>>`
  - `insertJob(job: NormalizedJob): Promise<void>`
  - `touchJob(url: string, ghost: boolean): Promise<void>`
  - `saveScore(url: string, r: ScoreResult): Promise<void>`
  - `getUnscored(limit?: number): Promise<JobRow[]>` where `JobRow` includes all `jobs` columns
  - `logRun(run: { started_at: string; finished_at: string; per_source: object; total_new: number }): Promise<void>`

No unit test — thin I/O wrapper; exercised in Task 10 E2E.

- [ ] **Step 1: Create `supabase/schema.sql`**

```sql
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  company text not null,
  title text not null,
  description text not null default '',
  location text not null default '',
  url text not null unique,
  content_hash text not null,
  posted_at timestamptz,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  score int,
  reasons jsonb,
  missing_skills jsonb,
  ghost_flag boolean not null default false
);

create index if not exists jobs_content_hash_idx on jobs (content_hash);
create index if not exists jobs_score_idx on jobs (score);

create table if not exists scan_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  per_source jsonb not null,
  total_new int not null default 0
);
```

- [ ] **Step 2: Create `src/db.ts`**

```typescript
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
  if (urls.length === 0) return new Map<string, { url: string; first_seen: string; last_seen: string }>();
  const { data, error } = await supabase
    .from("jobs").select("url, first_seen, last_seen").in("url", urls);
  if (error) throw new Error(`db getExistingByUrls: ${error.message}`);
  return new Map(data.map((r) => [r.url, r]));
}

export async function insertJob(job: NormalizedJob): Promise<void> {
  const { error } = await supabase.from("jobs").insert({
    source: job.source, company: job.company, title: job.title,
    description: job.description, location: job.location, url: job.url,
    content_hash: job.contentHash, posted_at: job.postedAt,
  });
  if (error) throw new Error(`db insertJob ${job.url}: ${error.message}`);
}

export async function touchJob(url: string, ghost: boolean): Promise<void> {
  const { error } = await supabase.from("jobs")
    .update({ last_seen: new Date().toISOString(), ghost_flag: ghost })
    .eq("url", url);
  if (error) throw new Error(`db touchJob ${url}: ${error.message}`);
}

export async function saveScore(url: string, r: ScoreResult): Promise<void> {
  const { error } = await supabase.from("jobs")
    .update({ score: r.score, reasons: r.reasons, missing_skills: r.missing_skills })
    .eq("url", url);
  if (error) throw new Error(`db saveScore ${url}: ${error.message}`);
}

export async function getUnscored(limit = 40): Promise<JobRow[]> {
  const { data, error } = await supabase.from("jobs")
    .select("*").is("score", null).order("first_seen", { ascending: false }).limit(limit);
  if (error) throw new Error(`db getUnscored: ${error.message}`);
  return data as JobRow[];
}

export async function logRun(run: {
  started_at: string; finished_at: string;
  per_source: Record<string, unknown>; total_new: number;
}): Promise<void> {
  const { error } = await supabase.from("scan_runs").insert(run);
  if (error) console.error(`db logRun: ${error.message}`); // non-fatal
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/db.ts supabase/schema.sql
git commit -m "feat: Supabase schema and DB layer"
```

---

### Task 7: Sources — Greenhouse + Lever (JSON APIs)

**Files:**
- Create: `src/sources/greenhouse.ts`, `src/sources/lever.ts`, `src/sources/index.ts`
- Test: `tests/sources.test.ts`

**Interfaces:**
- Produces: `Source { name: string; fetchJobs(): Promise<RawJob[]> }`, `buildSources(): Source[]` (reads `companies.json`), plus exported pure mappers `mapGreenhouseJob`, `mapLeverJob` for fixture tests.

- [ ] **Step 1: Write the failing test `tests/sources.test.ts`**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { mapGreenhouseJob } from "../src/sources/greenhouse.js";
import { mapLeverJob } from "../src/sources/lever.js";

test("mapGreenhouseJob maps and strips HTML", () => {
  const j = mapGreenhouseJob({
    title: "Junior Developer",
    absolute_url: "https://boards.greenhouse.io/wix/jobs/1",
    location: { name: "Tel Aviv" },
    updated_at: "2026-06-30T10:00:00Z",
    content: "&lt;p&gt;Build &lt;b&gt;cool&lt;/b&gt; stuff&lt;/p&gt;",
  }, "Wix");
  assert.equal(j.source, "greenhouse");
  assert.equal(j.company, "Wix");
  assert.equal(j.title, "Junior Developer");
  assert.equal(j.location, "Tel Aviv");
  assert.ok(j.description.includes("cool stuff"));
  assert.equal(j.description.includes("<"), false);
});

test("mapLeverJob maps fields", () => {
  const j = mapLeverJob({
    text: "Junior Backend Engineer",
    hostedUrl: "https://jobs.lever.co/fireblocks/abc",
    categories: { location: "Tel Aviv" },
    createdAt: 1751300000000,
    descriptionPlain: "Node.js role",
  }, "Fireblocks");
  assert.equal(j.source, "lever");
  assert.equal(j.title, "Junior Backend Engineer");
  assert.equal(j.location, "Tel Aviv");
  assert.equal(j.postedAt, new Date(1751300000000).toISOString());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` — expected FAIL, modules not found.

- [ ] **Step 3: Create `src/sources/greenhouse.ts`**

```typescript
import * as cheerio from "cheerio";
import type { RawJob } from "../types.js";

interface GreenhouseJob {
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  content?: string; // HTML-escaped HTML
}

export function mapGreenhouseJob(j: GreenhouseJob, company: string): RawJob {
  // content is HTML-escaped HTML: unescape by parsing once, then strip tags
  const unescaped = cheerio.load(j.content ?? "").text();
  const description = cheerio.load(unescaped).text().replace(/\s+/g, " ").trim();
  return {
    source: "greenhouse",
    company,
    title: j.title,
    description,
    location: j.location?.name ?? "",
    url: j.absolute_url,
    postedAt: j.updated_at ?? null,
  };
}

export async function fetchGreenhouse(slug: string, company: string): Promise<RawJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  if (!res.ok) throw new Error(`greenhouse ${slug}: HTTP ${res.status}`);
  const data = (await res.json()) as { jobs: GreenhouseJob[] };
  return data.jobs.map((j) => mapGreenhouseJob(j, company));
}
```

- [ ] **Step 4: Create `src/sources/lever.ts`**

```typescript
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
```

- [ ] **Step 5: Create `src/sources/index.ts`**

```typescript
import { readFileSync } from "node:fs";
import type { RawJob } from "../types.js";
import { fetchGreenhouse } from "./greenhouse.js";
import { fetchLever } from "./lever.js";

export interface Source {
  name: string;
  fetchJobs(): Promise<RawJob[]>;
}

interface Companies {
  greenhouse: { slug: string; company: string }[];
  lever: { slug: string; company: string }[];
  comeet: { slug: string; company: string }[];
}

export function buildSources(): Source[] {
  const companies = JSON.parse(readFileSync("companies.json", "utf8")) as Companies;
  return [
    ...companies.greenhouse.map((c) => ({
      name: `greenhouse:${c.slug}`,
      fetchJobs: () => fetchGreenhouse(c.slug, c.company),
    })),
    ...companies.lever.map((c) => ({
      name: `lever:${c.slug}`,
      fetchJobs: () => fetchLever(c.slug, c.company),
    })),
  ];
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test` — expected: all PASS.

- [ ] **Step 7: Live smoke check one board**

Run: `npx tsx -e "import('./src/sources/greenhouse.js').then(async m => { const j = await m.fetchGreenhouse('monday','monday.com'); console.log(j.length, j[0]?.title); })"`
Expected: a job count > 0 and a real title. If 404, replace the slug in `companies.json` with a valid one (check `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs` in a browser) — do not delete the source module.

- [ ] **Step 8: Commit**

```bash
git add src/sources tests/sources.test.ts
git commit -m "feat: Greenhouse and Lever job sources"
```

---

### Task 8: Sources — Drushim + AllJobs (best-effort scraping)

**Files:**
- Create: `src/sources/drushim.ts`, `src/sources/alljobs.ts`
- Modify: `src/sources/index.ts`

**Interfaces:**
- Produces: `fetchDrushim(): Promise<RawJob[]>`, `fetchAllJobs(): Promise<RawJob[]>`; both registered in `buildSources()`.

These sites have no stable public API — the exact response shape must be verified live. The steps below define the contract and the discovery procedure; adapt the field mapping to what the live response actually returns. Both sources throw on failure and are skipped by the per-source isolation in `run.ts`.

- [ ] **Step 1: Discover the Drushim endpoint shape**

Run: `curl -s "https://www.drushim.co.il/api/jobs/search?searchterm=junior%20developer&ssaen=1" -H "User-Agent: Mozilla/5.0" | head -c 2000`
Inspect the JSON keys (expected something like `ResultList` with title/company/link fields). If the endpoint 404s, open drushim.co.il search in a browser DevTools Network tab and copy the real XHR URL.

- [ ] **Step 2: Create `src/sources/drushim.ts`** (adapt field names to Step 1 findings)

```typescript
import type { RawJob } from "../types.js";

const QUERIES = ["junior developer", "student software", "full stack junior", "מפתח ג'וניור"];

// ponytail: unofficial endpoint, mapping adapted to live response — expect breakage, per-source isolation covers it
export async function fetchDrushim(): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  for (const q of QUERIES) {
    const res = await fetch(
      `https://www.drushim.co.il/api/jobs/search?searchterm=${encodeURIComponent(q)}&ssaen=1`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) throw new Error(`drushim "${q}": HTTP ${res.status}`);
    const data = await res.json();
    // ADAPT: map the actual response items to RawJob here based on Step 1
    for (const item of data.ResultList ?? []) {
      jobs.push({
        source: "drushim",
        company: item.Company?.CompanyDisplayName ?? "",
        title: item.JobInfo?.Names?.[0] ?? "",
        description: item.JobContent?.FullDescription ?? item.JobInfo?.Description ?? "",
        location: item.JobContent?.Addresses?.map((a: { CityEnglish?: string }) => a.CityEnglish).join(", ") ?? "",
        url: `https://www.drushim.co.il${item.JobInfo?.Link ?? ""}`,
        postedAt: item.JobInfo?.Date ?? null,
      });
    }
  }
  return jobs.filter((j) => j.title && j.url.length > "https://www.drushim.co.il".length);
}
```

- [ ] **Step 3: Live-verify Drushim mapping**

Run: `npx tsx -e "import('./src/sources/drushim.js').then(async m => { const j = await m.fetchDrushim(); console.log(j.length); console.log(j[0]); })"`
Expected: count > 0 and a sensible first job (real title, absolute URL). Fix the mapping until it is.

- [ ] **Step 4: Create `src/sources/alljobs.ts`** — HTML scrape with cheerio

```typescript
import * as cheerio from "cheerio";
import type { RawJob } from "../types.js";

// ponytail: fragile HTML scrape behind possible anti-bot; throws → skipped by run isolation.
// If AllJobs consistently 403s from GitHub Actions IPs, remove it from buildSources and note it in README.
export async function fetchAllJobs(): Promise<RawJob[]> {
  const res = await fetch(
    "https://www.alljobs.co.il/SearchResultsGuest.aspx?page=1&position=235,1970&type=&freetxt=junior&city=&region=",
    { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } },
  );
  if (!res.ok) throw new Error(`alljobs: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const jobs: RawJob[] = [];
  // ADAPT selectors after inspecting the live page (Step 5)
  $(".job-content-top").each((_, el) => {
    const title = $(el).find(".job-content-top-title").text().trim();
    const href = $(el).find("a[href*='UploadSingle']").attr("href") ?? "";
    const company = $(el).find(".T14 a").first().text().trim();
    const desc = $(el).find(".job-content-top-desc").text().trim();
    if (title && href) {
      jobs.push({
        source: "alljobs", company, title, description: desc,
        location: "", url: new URL(href, "https://www.alljobs.co.il").href, postedAt: null,
      });
    }
  });
  return jobs;
}
```

- [ ] **Step 5: Live-verify AllJobs selectors**

Run: `npx tsx -e "import('./src/sources/alljobs.js').then(async m => { const j = await m.fetchAllJobs(); console.log(j.length); console.log(j[0]); })"`
If 0 results: fetch the page, save to a file, inspect the real class names, adjust selectors. If HTTP 403 persists (anti-bot), leave the module in place but do not register it in `buildSources()`, and note it in the README known-limitations section.

- [ ] **Step 6: Register both in `src/sources/index.ts`**

Add imports and entries:

```typescript
import { fetchDrushim } from "./drushim.js";
import { fetchAllJobs } from "./alljobs.js";
// inside buildSources() return array, append:
    { name: "drushim", fetchJobs: fetchDrushim },
    { name: "alljobs", fetchJobs: fetchAllJobs },
```

- [ ] **Step 7: Run all tests still pass**

Run: `npm test` — expected PASS (no new unit tests; these are live-verified).

- [ ] **Step 8: Commit**

```bash
git add src/sources
git commit -m "feat: Drushim and AllJobs sources (best-effort scraping)"
```

---

### Task 9: Orchestrator `run.ts`

**Files:**
- Create: `src/run.ts`

**Interfaces:**
- Consumes: everything above — `buildSources`, `normalize`, `isRelevantTitle`, `ghostFlag`, db functions, `scoreJob`, `formatAlert`, `sendTelegram`.

- [ ] **Step 1: Create `src/run.ts`**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/run.ts
git commit -m "feat: scan orchestrator with per-source isolation and alerting"
```

---

### Task 10: Manual setup + local E2E

**Files:**
- Create: `SETUP.md`, `.env` (local only, never committed)

- [ ] **Step 1: Create `SETUP.md`**

```markdown
# JobPilot Setup (one-time, ~15 min)

## 1. Supabase
1. https://supabase.com → New project (free tier).
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Project Settings → API: copy `URL` → SUPABASE_URL, `service_role` key → SUPABASE_SERVICE_KEY.

## 2. Telegram bot
1. In Telegram, message **@BotFather** → `/newbot` → name it (e.g. JobPilot) → copy the token → TELEGRAM_BOT_TOKEN.
2. Send any message to your new bot (e.g. "hi").
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser → copy `message.chat.id` → TELEGRAM_CHAT_ID.

## 3. Anthropic
Console → API key → ANTHROPIC_API_KEY.

## 4. Local run
Copy `.env.example` to `.env`, fill in all five values, then:
    npm install
    npm test
    npm run scan

## 5. GitHub
1. Create repo, push.
2. Repo → Settings → Secrets and variables → Actions → add all five secrets with the same names.
3. Actions tab → "scan" workflow → Run workflow (manual test).
```

- [ ] **Step 2: Perform the setup** — Sharon (or the agent with Sharon's credentials) executes SETUP.md sections 1–4. This is a manual gate: Supabase project, BotFather, Anthropic key.

- [ ] **Step 3: Local E2E run**

`npm run scan` must be run with `.env` loaded. Add `--env-file` support: change the `scan` script in `package.json` to:

```json
"scan": "node --env-file-if-exists=.env --import tsx src/run.ts"
```

Run: `npm run scan`
Expected: per-source counts logged, N new jobs inserted, scoring logs with scores, and at least one Telegram message received if any job scores ≥ 70. Verify rows exist in Supabase Table Editor (`jobs`, `scan_runs`).

- [ ] **Step 4: Commit**

```bash
git add SETUP.md package.json
git commit -m "docs: setup guide; scan loads .env locally"
```

---

### Task 11: GitHub Actions workflow + README

**Files:**
- Create: `.github/workflows/scan.yml`, `README.md`

- [ ] **Step 1: Create `.github/workflows/scan.yml`**

```yaml
name: scan

on:
  schedule:
    - cron: "0 */2 * * *"
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run scan
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

- [ ] **Step 2: Create `README.md`** — must include: one-paragraph pitch, architecture diagram (ASCII from the spec), features (match scoring, Speed Score 🔥, Ghost Detector 👻), tech stack, screenshot placeholder for a Telegram alert, setup link to SETUP.md, phases roadmap (dashboard + Skill Gap Radar as phase 2, Apply Kit + interview prep as phase 3), known limitations (AllJobs anti-bot if applicable, LinkedIn excluded by design). Write it in English — it's the portfolio artifact.

- [ ] **Step 3: Push and verify the workflow**

```bash
git add .github/workflows/scan.yml README.md
git commit -m "ci: scheduled scan workflow + README"
git push -u origin master
```

Then trigger `workflow_dispatch` from the Actions tab (or `gh workflow run scan`). Expected: green run; new rows in Supabase; Telegram alert if a high-match job appeared.

- [ ] **Step 4: Verify schedule** — confirm the cron appears under Actions → scan → "This workflow has a schedule".

---

## Self-review notes

- Spec coverage: sources (Tasks 7–8; Comeet deferred — companies.json has an empty `comeet` array and the spec's curated-list mechanism, added when a Comeet company is wanted), normalize/dedupe (2), scoring + missing_skills stored (3), ghost (4), Speed Score 🔥 (5), Telegram (5), DB + scan_runs (6), error isolation + GitHub email on total failure (9), retry unscored (6+9), secrets (10–11), tests (2–5, 7), CI (11).
- Deviation from spec: Comeet source deferred to when a target company actually uses Comeet (token-extraction complexity, zero configured companies). Noted in README.
- Type consistency: `RawJob.postedAt` (camel) in code vs `posted_at` (snake) in DB — mapping is explicit in db.ts and run.ts.
