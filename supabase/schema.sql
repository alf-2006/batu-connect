-- ========================================================
-- PHANTOMS WATCH TRACKER - Database Schema & RLS Setup
-- Compatible with Supabase Postgres & Auth
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('admin', 'member')) default 'member',
  team text default 'Phantoms',
  created_at timestamptz default now()
);

-- 2. Meetings Table
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,       -- Google drive link or storage path
  video_source text check (video_source in ('drive', 'upload')) default 'drive',
  duration_seconds int default 0, -- filled after first metadata load
  created_by uuid references public.profiles(id),
  meeting_date date default current_date,
  created_at timestamptz default now()
);

-- 3. Meeting Assignments Table
create table if not exists public.meeting_assignments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (meeting_id, member_id)
);

-- 4. Watch Progress Table
create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  max_watched_seconds numeric default 0,   -- furthest legit point reached
  total_watched_seconds numeric default 0, -- actual accumulated watch time
  skip_attempts int default 0,
  status text check (status in ('not_started','in_progress','completed')) default 'not_started',
  last_watched_at timestamptz default now(),
  unique (meeting_id, member_id)
);

-- 5. Watch Events Table
create table if not exists public.watch_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  event_type text check (event_type in ('heartbeat','seek_blocked','tab_hidden','tab_visible','play','pause','completed')),
  video_timestamp numeric default 0,
  created_at timestamptz default now()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_assignments enable row level security;
alter table public.watch_progress enable row level security;
alter table public.watch_events enable row level security;

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Profiles Policies
create policy "Public profiles are readable by authenticated users" 
  on public.profiles for select 
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Admins can insert or update any profile" 
  on public.profiles for all 
  using (public.is_admin());

-- Meetings Policies
create policy "Authenticated users can view meetings assigned to them or if admin" 
  on public.meetings for select 
  using (
    public.is_admin() or 
    exists (
      select 1 from public.meeting_assignments 
      where meeting_id = meetings.id and member_id = auth.uid()
    )
  );

create policy "Admins can manage meetings" 
  on public.meetings for all 
  using (public.is_admin());

-- Meeting Assignments Policies
create policy "Members can view their own meeting assignments" 
  on public.meeting_assignments for select 
  using (member_id = auth.uid() or public.is_admin());

create policy "Admins can manage assignments" 
  on public.meeting_assignments for all 
  using (public.is_admin());

-- Watch Progress Policies
create policy "Members can view their own watch progress or admins view all" 
  on public.watch_progress for select 
  using (member_id = auth.uid() or public.is_admin());

create policy "Members can insert or update their own watch progress" 
  on public.watch_progress for insert 
  with check (member_id = auth.uid());

create policy "Members can update own watch progress" 
  on public.watch_progress for update 
  using (member_id = auth.uid() or public.is_admin());

-- Watch Events Policies
create policy "Members can view own watch events or admins view all" 
  on public.watch_events for select 
  using (member_id = auth.uid() or public.is_admin());

create policy "Members can insert own watch events" 
  on public.watch_events for insert 
  with check (member_id = auth.uid());

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, team)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email), 
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    coalesce(new.raw_user_meta_data->>'team', 'Phantoms')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
