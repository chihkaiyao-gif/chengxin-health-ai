-- Phase 2: AI initial health assessment wizard and routing result.

do $$ begin
  create type public.assessment_persona as enum (
    'fitness_beginner',
    'gym_training',
    'home_training',
    'glp1_weight_loss',
    'chronic_disease',
    'senior_frailty',
    'high_risk_medical_review'
  );
exception when duplicate_object then null; end $$;

alter table public.health_assessments
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists raw_answers jsonb not null default '{}'::jsonb,
  add column if not exists risk_flags jsonb not null default '[]'::jsonb,
  add column if not exists persona public.assessment_persona,
  add column if not exists recommended_path text;

update public.health_assessments
set user_id = patient_id
where user_id is null;

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.health_assessments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  raw_answers jsonb not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.health_assessments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  raw_answers jsonb not null default '{}'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  persona public.assessment_persona not null,
  recommended_path text not null,
  needs_medical_review boolean not null default false,
  safety_message text not null default 'This system does not diagnose or adjust medication. Please have medical and medication decisions evaluated by a physician.',
  today_recommendations jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.assessment_answers enable row level security;
alter table public.assessment_results enable row level security;

drop policy if exists "assessment_answers_patient_crud" on public.assessment_answers;
drop policy if exists "assessment_answers_care_team_select" on public.assessment_answers;
drop policy if exists "assessment_results_patient_crud" on public.assessment_results;
drop policy if exists "assessment_results_care_team_select" on public.assessment_results;

create policy "assessment_answers_patient_crud"
on public.assessment_answers for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "assessment_answers_care_team_select"
on public.assessment_answers for select
to authenticated
using (public.can_access_patient(user_id));

create policy "assessment_results_patient_crud"
on public.assessment_results for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "assessment_results_care_team_select"
on public.assessment_results for select
to authenticated
using (public.can_access_patient(user_id));

create index if not exists assessment_results_user_completed_idx
  on public.assessment_results(user_id, completed_at desc);

create index if not exists assessment_answers_user_completed_idx
  on public.assessment_answers(user_id, completed_at desc);
