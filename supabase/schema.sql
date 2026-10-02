-- NOA: AFTER BELL optional server-side session memory.
-- Apply this to a Supabase project, then configure SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.
-- No browser role gets direct table access; the Vercel API route writes with a server-only secret key.

create table if not exists public.sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chapter smallint not null default 1 check (chapter between 1 and 5),
  noa_state jsonb not null default '{}'::jsonb,
  ending text,
  summary text not null default ''
);

create table if not exists public.messages (
  session_id text not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  text text not null check (char_length(text) <= 500),
  game_time bigint not null check (game_time >= 0),
  created_at timestamptz not null default now(),
  primary key (session_id, role, game_time)
);

create table if not exists public.story_flags (
  session_id text not null references public.sessions(id) on delete cascade,
  flag text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, flag)
);

create index if not exists messages_session_time_idx on public.messages(session_id, game_time desc);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.story_flags enable row level security;

revoke all on public.sessions from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.story_flags from anon, authenticated;
