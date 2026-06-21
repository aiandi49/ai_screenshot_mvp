-- ════════════════════════════════════════════════════════
-- AI&I — Piece 1: Core schema
-- Run this whole file once in Supabase → SQL Editor → New Query → Run
-- ════════════════════════════════════════════════════════

-- one row per "screenshot this URL" request
create table if not exists jobs (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  output_type   text not null default 'general',   -- e.g. 'copy', 'wireframe', 'palette' — meaningless for now, the LLM step is stubbed
  status        text not null default 'pending',    -- pending -> capturing -> processing -> done | failed
  section_count int not null default 0,
  zip_path      text,                                -- storage path once the zip exists
  result        jsonb,                               -- stubbed LLM output goes here later
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- one row per individual section screenshot captured for a job
create table if not exists job_screenshots (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  section_idx int not null,            -- capture order, 0-based
  label       text,                    -- e.g. "hero", "pricing" — best guess, can be null
  storage_path text not null,          -- path inside the "screenshots" bucket
  created_at  timestamptz not null default now()
);

create index if not exists job_screenshots_job_id_idx on job_screenshots(job_id);

-- keep updated_at current automatically
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- ── Row Level Security ──
-- No login yet, so: anyone can create a job and read job status (it's a public shared tool for now).
-- Only the Render worker (using the service_role key, which bypasses RLS entirely) can update/write results.
alter table jobs enable row level security;
alter table job_screenshots enable row level security;

create policy "anyone can create a job"
  on jobs for insert
  with check (true);

create policy "anyone can read jobs"
  on jobs for select
  using (true);

create policy "anyone can read screenshots"
  on job_screenshots for select
  using (true);

-- enable Realtime so the frontend can watch status change live, no polling
alter publication supabase_realtime add table jobs;
