-- Optional persistence for the video ads generator.
--
-- Only needed when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set. Without
-- them the backend keeps job state in memory, which is correct for a single
-- process but does not survive a restart or a separate worker service.

create table if not exists public.video_jobs (
  id           uuid primary key,
  user_id      uuid references auth.users (id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','processing','rendering','exporting','completed','failed')),
  progress     integer not null default 0 check (progress between 0 and 100),
  message      text not null default '',
  request      jsonb not null,
  outputs      jsonb,
  poster       text,
  error        text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz
);

create index if not exists video_jobs_user_id_created_at_idx
  on public.video_jobs (user_id, created_at desc);

create index if not exists video_jobs_status_idx
  on public.video_jobs (status)
  where status in ('pending', 'processing', 'rendering', 'exporting');

alter table public.video_jobs enable row level security;

-- The backend talks to Postgres with the service role, which bypasses RLS.
-- These policies exist so a future browser-side client can read its own jobs
-- without gaining access to anyone else's.
drop policy if exists "video_jobs_select_own" on public.video_jobs;
create policy "video_jobs_select_own"
  on public.video_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "video_jobs_insert_own" on public.video_jobs;
create policy "video_jobs_insert_own"
  on public.video_jobs for insert
  with check (auth.uid() = user_id);
