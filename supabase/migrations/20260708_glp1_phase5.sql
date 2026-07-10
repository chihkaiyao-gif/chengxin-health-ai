-- Phase 5: GLP-1 medication logs, side effects, reminders, and clinic alerts.

do $$ begin
  create type public.glp1_injection_method as enum ('self', 'clinic', 'caregiver', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.glp1_injection_site as enum ('abdomen', 'thigh', 'upper_arm', 'other', 'unknown');
exception when duplicate_object then null; end $$;

alter table public.glp1_medication_logs
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists dose_mg numeric(6,3),
  add column if not exists next_injection_date date,
  add column if not exists injection_method public.glp1_injection_method not null default 'unknown',
  add column if not exists injection_site public.glp1_injection_site not null default 'unknown',
  add column if not exists lot_number text,
  add column if not exists note text;

update public.glp1_medication_logs
set
  user_id = coalesce(user_id, patient_id),
  note = coalesce(note, notes),
  next_injection_date = coalesce(next_injection_date, injection_date + 7)
where user_id is null
  or note is null
  or next_injection_date is null;

create table if not exists public.glp1_side_effect_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  medication_log_id uuid references public.glp1_medication_logs(id) on delete set null,
  nausea_score int not null default 0 check (nausea_score between 0 and 10),
  vomiting boolean not null default false,
  constipation_score int not null default 0 check (constipation_score between 0 and 10),
  diarrhea_score int not null default 0 check (diarrhea_score between 0 and 10),
  appetite_score int not null default 0 check (appetite_score between 0 and 10),
  dizziness boolean not null default false,
  hypoglycemia_feeling boolean not null default false,
  abdominal_pain_score int not null default 0 check (abdominal_pain_score between 0 and 10),
  dehydration_concern boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

alter table public.glp1_medication_logs enable row level security;
alter table public.glp1_side_effect_logs enable row level security;

drop policy if exists "glp1_logs_patient_crud" on public.glp1_medication_logs;
drop policy if exists "glp1_logs_care_team_select" on public.glp1_medication_logs;
drop policy if exists "glp1_side_effect_logs_patient_crud" on public.glp1_side_effect_logs;
drop policy if exists "glp1_side_effect_logs_care_team_select" on public.glp1_side_effect_logs;

create policy "glp1_logs_patient_crud"
on public.glp1_medication_logs for all
to authenticated
using (coalesce(user_id, patient_id) = auth.uid())
with check (coalesce(user_id, patient_id) = auth.uid());

create policy "glp1_logs_care_team_select"
on public.glp1_medication_logs for select
to authenticated
using (public.can_access_patient(coalesce(user_id, patient_id)));

create policy "glp1_side_effect_logs_patient_crud"
on public.glp1_side_effect_logs for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "glp1_side_effect_logs_care_team_select"
on public.glp1_side_effect_logs for select
to authenticated
using (public.can_access_patient(user_id));

create index if not exists glp1_logs_user_injection_idx
  on public.glp1_medication_logs(coalesce(user_id, patient_id), injection_date desc);

create index if not exists glp1_logs_user_next_injection_idx
  on public.glp1_medication_logs(coalesce(user_id, patient_id), next_injection_date asc);

create index if not exists glp1_side_effect_logs_user_created_idx
  on public.glp1_side_effect_logs(user_id, created_at desc);

create index if not exists glp1_side_effect_logs_medication_log_idx
  on public.glp1_side_effect_logs(medication_log_id);
