-- המסע ל-50K · שער כניסה וניהול משתמשים
-- אידמפוטנטי. אפשר להריץ שוב בלי לשבור כלום.

-- ============================================================
-- 1. פרופילים
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  phone        text,
  role         text not null default 'student'
               check (role in ('student','mastermind','admin')),
  access       text not null default 'pending'
               check (access in ('pending','active','revoked')),
  source       text,                       -- מאיפה הגיע: mastermind / paid / manual
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.profiles enable row level security;

-- כל אחד רואה ועורך רק את עצמו
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- אדמין רואה הכל. נבדק דרך JWT ולא דרך טבלת profiles,
-- כי תת-שאילתה על profiles בתוך מדיניות של profiles = רקורסיה אינסופית.
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- ============================================================
-- 2. הגנת הסלמת הרשאות
-- משתמש לא יכול להפוך את עצמו לאדמין או לפתוח לעצמו גישה.
-- נאכף בטריגר, כי RLS לבדו לא מונע שינוי עמודה בשורה שכבר מותר לו לערוך.
-- ============================================================
create or replace function public.guard_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' then
    return new;                                  -- אדמין אמיתי, מותר
  end if;
  if new.role is distinct from old.role then
    raise exception 'אין הרשאה לשנות תפקיד';
  end if;
  if new.access is distinct from old.access then
    raise exception 'אין הרשאה לשנות סטטוס גישה';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_escalation on public.profiles;
create trigger trg_guard_profile_escalation
  before update on public.profiles
  for each row execute function public.guard_profile_escalation();

-- ============================================================
-- 3. יצירת פרופיל אוטומטית בהרשמה
-- ברירת מחדל: student + pending. נכשל-סגור.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. התקדמות בקורס (מחליף את localStorage)
-- ============================================================
create table if not exists public.course_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  station_id   int  not null,
  lesson_key   text,
  completed_at timestamptz not null default now(),
  primary key (user_id, station_id, lesson_key)
);

alter table public.course_progress enable row level security;

drop policy if exists progress_self on public.course_progress;
create policy progress_self on public.course_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists progress_admin_read on public.course_progress;
create policy progress_admin_read on public.course_progress
  for select using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

-- ============================================================
-- 5. הערות פרטיות לתלמיד
-- ============================================================
create table if not exists public.notes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  station_id int  not null,
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, station_id)
);

alter table public.notes enable row level security;

-- פרטי לחלוטין. גם אדמין לא רואה. החלטה מכוונת.
drop policy if exists notes_self on public.notes;
create policy notes_self on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 6. תצוגת אדמין לניהול משתמשים
-- ============================================================
create or replace view public.admin_users as
select
  p.id, p.email, p.full_name, p.phone, p.role, p.access, p.source,
  p.created_at, p.last_seen_at,
  (select count(distinct station_id) from public.course_progress cp where cp.user_id = p.id) as stations_done,
  (select max(completed_at)          from public.course_progress cp where cp.user_id = p.id) as last_progress_at
from public.profiles p;
