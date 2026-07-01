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
  ghost_flag boolean not null default false,
  app_status text,
  applied_at timestamptz
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
