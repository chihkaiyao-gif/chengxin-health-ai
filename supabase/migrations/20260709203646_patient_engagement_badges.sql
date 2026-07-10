-- Phase 14: patient engagement, daily tasks, streaks, and badges.

do $$ begin
  create type public.daily_task_status as enum ('pending', 'completed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.daily_task_type as enum (
    'weight_log',
    'food_photo',
    'protein_goal',
    'hydration_goal',
    'workout',
    'glp1_injection',
    'side_effect_report',
    'inbody_upload',
    'appointment_request'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.streak_type as enum (
    'login',
    'food',
    'workout',
    'medication_on_time',
    'daily_record'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_date date not null,
  task_type public.daily_task_type not null,
  title text not null,
  description text not null default '',
  status public.daily_task_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, task_date, task_type),
  constraint daily_tasks_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  )
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  streak_type public.streak_type not null,
  current_count integer not null default 0 check (current_count >= 0),
  longest_count integer not null default 0 check (longest_count >= 0),
  last_completed_date date,
  updated_at timestamptz not null default now(),
  unique (user_id, streak_type)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  criteria jsonb not null default '{}'::jsonb,
  active boolean not null default true
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

insert into public.badges (code, name, description, icon, criteria, active)
values
  ('first_assessment', '新手上路', '完成初始健康評估。', 'clipboard-check', '{"assessment_completed": true}'::jsonb, true),
  ('seven_day_streak', '連續7天', '連續紀錄 7 天。', 'flame', '{"daily_record_streak": 7}'::jsonb, true),
  ('protein_pro', '蛋白質達人', '一週蛋白質達標 5 天。', 'egg', '{"protein_goal_days_7d": 5}'::jsonb, true),
  ('steady_mover', '運動穩定者', '一週運動 3 次。', 'dumbbell', '{"workouts_7d": 3}'::jsonb, true),
  ('inbody_tracker', 'InBody追蹤者', '完成 2 次 InBody 紀錄。', 'scan-line', '{"inbody_count": 2}'::jsonb, true),
  ('visit_habit', '回診好習慣', '完成預約回診。', 'calendar-check', '{"appointment_request": true}'::jsonb, true),
  ('glp1_on_time', 'GLP-1準時王', '連續 4 週準時記錄 GLP-1。', 'syringe', '{"medication_on_time_streak": 4}'::jsonb, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  criteria = excluded.criteria,
  active = excluded.active;

alter table public.daily_tasks enable row level security;
alter table public.streaks enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "daily_tasks_patient_crud" on public.daily_tasks;
drop policy if exists "daily_tasks_care_team_select" on public.daily_tasks;
drop policy if exists "streaks_patient_crud" on public.streaks;
drop policy if exists "streaks_care_team_select" on public.streaks;
drop policy if exists "badges_select_active" on public.badges;
drop policy if exists "badges_manage_super_admin" on public.badges;
drop policy if exists "user_badges_patient_select" on public.user_badges;
drop policy if exists "user_badges_care_team_select" on public.user_badges;
drop policy if exists "user_badges_patient_insert" on public.user_badges;

create policy "daily_tasks_patient_crud"
on public.daily_tasks for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "daily_tasks_care_team_select"
on public.daily_tasks for select
to authenticated
using (public.can_access_patient(user_id));

create policy "streaks_patient_crud"
on public.streaks for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "streaks_care_team_select"
on public.streaks for select
to authenticated
using (public.can_access_patient(user_id));

create policy "badges_select_active"
on public.badges for select
to authenticated
using (active = true or public.is_super_admin());

create policy "badges_manage_super_admin"
on public.badges for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "user_badges_patient_select"
on public.user_badges for select
to authenticated
using (user_id = auth.uid());

create policy "user_badges_care_team_select"
on public.user_badges for select
to authenticated
using (public.can_access_patient(user_id));

create policy "user_badges_patient_insert"
on public.user_badges for insert
to authenticated
with check (user_id = auth.uid());

create index if not exists daily_tasks_user_date_idx
  on public.daily_tasks(user_id, task_date desc);

create index if not exists daily_tasks_user_status_idx
  on public.daily_tasks(user_id, status, task_date desc);

create index if not exists streaks_user_type_idx
  on public.streaks(user_id, streak_type);

create index if not exists badges_active_idx
  on public.badges(active, code);

create index if not exists user_badges_user_earned_idx
  on public.user_badges(user_id, earned_at desc);
