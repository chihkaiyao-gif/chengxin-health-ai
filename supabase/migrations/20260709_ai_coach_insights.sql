-- Phase 15: AI Coach Engine daily personalized insights.

create table if not exists public.ai_coach_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  insight_date date not null,
  persona public.assessment_persona not null default 'fitness_beginner',
  summary text not null,
  priority_tasks jsonb not null default '[]'::jsonb,
  nutrition_advice text not null,
  exercise_advice text not null,
  medication_advice text not null,
  follow_up_advice text not null,
  risk_flags jsonb not null default '[]'::jsonb,
  ai_raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, insight_date)
);

alter table public.ai_coach_insights enable row level security;

drop policy if exists "ai_coach_insights_patient_crud" on public.ai_coach_insights;
drop policy if exists "ai_coach_insights_care_team_select" on public.ai_coach_insights;

create policy "ai_coach_insights_patient_crud"
on public.ai_coach_insights for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "ai_coach_insights_care_team_select"
on public.ai_coach_insights for select
to authenticated
using (public.can_access_patient(user_id));

create index if not exists ai_coach_insights_user_date_idx
  on public.ai_coach_insights(user_id, insight_date desc);
