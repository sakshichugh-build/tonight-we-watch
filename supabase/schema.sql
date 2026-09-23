-- Run this whole file once in your Supabase project's SQL editor.
create extension if not exists pgcrypto;

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete set null,
  status text not null default 'waiting_for_partner'
    check (status in (
      'waiting_for_partner','collecting_prefs','generating',
      'swiping_round_1','swiping_round_2','final_pick','matched','completed'
    )),
  round int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('A','B')),
  finished_round int,
  joined_at timestamptz not null default now(),
  unique (session_id, role)
);

create table if not exists preferences (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  mood text[] not null default '{}',
  mood_text text,
  languages text[] not null default '{}',
  content_type text not null check (content_type in ('movies_only','include_series')),
  min_rating int not null check (min_rating in (6,7,8,9)),
  eras text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  unique (session_id, participant_id)
);

create table if not exists title_pools (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  round int not null,
  titles jsonb not null default '[]',
  brief jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, round)
);

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  round int not null,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie','tv')),
  direction text not null check (direction in ('like','pass')),
  created_at timestamptz not null default now(),
  unique (session_id, participant_id, round, tmdb_id, media_type)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie','tv')),
  round int,
  ott_platforms jsonb not null default '[]',
  imdb_rating numeric,
  matched_at timestamptz not null default now(),
  unique (session_id, tmdb_id, media_type)
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie','tv')),
  rating int not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (session_id, participant_id, tmdb_id, media_type)
);

create index if not exists idx_swipes_session_round on swipes(session_id, round);
create index if not exists idx_preferences_session on preferences(session_id);
create index if not exists idx_sessions_couple on sessions(couple_id);
create index if not exists idx_title_pools_session on title_pools(session_id);

alter table sessions enable row level security;
alter table participants enable row level security;
alter table preferences enable row level security;
alter table title_pools enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table ratings enable row level security;
alter table couples enable row level security;

-- Only `sessions` and `participants` hold no sensitive content (status/round, role/join time) —
-- they get a public SELECT policy purely so the browser's anon-key client can subscribe to
-- Realtime changes on them. Every other table (preferences, swipes, title_pools, matches,
-- ratings, couples) is read/written exclusively through the app's API routes using the
-- service-role key, which bypasses RLS — so those tables deliberately have NO policies here,
-- meaning the anon key can never read a partner's preferences or the swipe history directly.
create policy "sessions are readable for realtime" on sessions for select using (true);
create policy "participants are readable for realtime" on participants for select using (true);

-- Required for Supabase Realtime `postgres_changes` subscriptions to fire on these tables.
-- If this errors with "already a member", the table's already enabled for Realtime — check
-- Database -> Replication in the Supabase dashboard instead.
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table participants;
