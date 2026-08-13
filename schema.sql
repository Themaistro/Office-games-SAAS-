-- Daily Brain Arena - Initial Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text check (role in ('employee', 'admin')) default 'employee',
  team_id uuid, -- Will reference teams table later
  total_xp integer default 0,
  current_level integer default 1,
  current_streak integer default 0,
  best_streak integer default 0,
  games_played integer default 0,
  timezone text default 'Asia/Dubai',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Teams Table
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key back to profiles
alter table public.profiles add constraint profiles_team_id_fkey foreign key (team_id) references public.teams(id) on delete set null;

-- 3. Game Types
create table public.game_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Questions
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  game_type_id uuid references public.game_types(id) on delete cascade not null,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) not null,
  content jsonb not null, -- Stores text, image, etc.
  options jsonb not null, -- Array of possible answers
  correct_answer text not null,
  explanation text,
  base_xp integer not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Daily Sessions (Enforces the 15-minute rule)
create table public.daily_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null, -- Tracked against user's timezone
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  allowed_duration_seconds integer default 900 not null,
  status text check (status in ('in_progress', 'completed', 'expired')) default 'in_progress',
  total_score integer default 0,
  total_xp_earned integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Ensure users can only have one session per date
create unique index daily_sessions_user_date_idx on public.daily_sessions(user_id, date);

-- 6. Session Questions
create table public.session_questions (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.daily_sessions(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  order_index integer not null,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create unique index session_questions_session_order_idx on public.session_questions(session_id, order_index);

-- 7. Question Attempts
create table public.question_attempts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.daily_sessions(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  user_answer text not null,
  is_correct boolean not null,
  time_taken_seconds numeric,
  xp_earned integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create unique index question_attempts_session_question_idx on public.question_attempts(session_id, question_id);

-- 8. Seasons
create table public.seasons (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Leaderboards (Monthly Snapshots)
create table public.leaderboards (
  id uuid default uuid_generate_v4() primary key,
  season_id uuid references public.seasons(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  total_xp integer not null,
  rank integer not null,
  accuracy numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create unique index leaderboards_season_user_idx on public.leaderboards(season_id, user_id);

-- RLS Setup (Row Level Security)
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.game_types enable row level security;
alter table public.questions enable row level security;
alter table public.daily_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.seasons enable row level security;
alter table public.leaderboards enable row level security;

-- Simple policies for MVP
-- Profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select using (true);
create policy "Users can insert their own profile."
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile."
  on profiles for update using (auth.uid() = id);

-- Daily Sessions (Users can only see and update their own)
create policy "Users can view own sessions."
  on daily_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions."
  on daily_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions."
  on daily_sessions for update using (auth.uid() = user_id);

-- Session Questions (Users can see questions for their own sessions)
create policy "Users can view session questions for own sessions."
  on session_questions for select using (
    exists (
      select 1 from daily_sessions ds 
      where ds.id = session_questions.session_id 
      and ds.user_id = auth.uid()
    )
  );
create policy "Server mostly manages session questions insert/update."
  on session_questions for all using (true) with check (true); -- Simplifying for MVP, should be locked down.

-- Teams and Game Types are public read
create policy "Teams are public." on teams for select using (true);
create policy "Game Types are public." on game_types for select using (true);

-- Functions and Triggers for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Function to handle new user creation automatically via Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
