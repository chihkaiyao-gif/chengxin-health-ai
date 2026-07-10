-- Initial baseline schema for Chengxin Health AI.
-- This migration lets a new Supabase project apply the later phase migrations
-- from an empty database without first pasting supabase/schema.sql manually.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('patient', 'clinic_staff', 'doctor', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.consent_type as enum ('privacy_policy', 'data_use', 'ai_assist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_intensity as enum ('LOW', 'MEDIUM', 'HIGH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_type as enum ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.glp1_medication_name as enum ('MOUNJARO', 'OZEMPIC', 'WEGOVY', 'SAXENDA', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.side_effect_severity as enum ('MILD', 'MODERATE', 'SEVERE');
exception when duplicate_object then null; end $$;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'patient',
  full_name text,
  phone text,
  date_of_birth date,
  sex text check (sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  default_clinic_id uuid references public.clinics(id),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null check (role in ('clinic_staff', 'doctor', 'super_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create table if not exists public.patient_clinic_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  assigned_doctor_id uuid references public.profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (patient_id, clinic_id)
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type public.consent_type not null,
  version text not null,
  accepted boolean not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.health_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null,
  height_cm numeric(5,2),
  weight_kg numeric(6,2),
  exercise_level public.exercise_intensity not null default 'LOW',
  chronic_conditions text,
  medications text,
  answers jsonb not null default '{}'::jsonb,
  ai_summary text,
  ai_safety_notice text not null default 'AI output is not diagnosis. Medication decisions must be evaluated by a physician.',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  trained_on date not null,
  activity_type text not null,
  duration_minutes int not null check (duration_minutes between 1 and 600),
  intensity public.exercise_intensity not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  eaten_at timestamptz not null,
  meal_type public.meal_type not null,
  image_path text,
  notes text,
  estimated_calories int,
  estimated_protein_g numeric(6,2),
  estimated_carbs_g numeric(6,2),
  estimated_fat_g numeric(6,2),
  ai_confidence numeric(4,3),
  ai_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbody_scans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  measured_at timestamptz not null,
  image_path text,
  weight_kg numeric(6,2),
  body_fat_percent numeric(5,2),
  skeletal_muscle_kg numeric(6,2),
  raw_metrics jsonb not null default '{}'::jsonb,
  ocr_confidence numeric(4,3),
  requires_human_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.glp1_medication_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  medication_name public.glp1_medication_name not null,
  dose_label text not null,
  injection_date date not null,
  physician_supervised boolean not null default false,
  notes text,
  safety_notice text not null default 'Medication decisions and dose changes must be evaluated by a physician.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.side_effect_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  medication_log_id uuid references public.glp1_medication_logs(id) on delete set null,
  symptoms text not null,
  severity public.side_effect_severity not null default 'MILD',
  started_on date,
  resolved_on date,
  notes text,
  requires_clinic_review boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_visit_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  generated_by uuid references public.profiles(id),
  period_start date,
  period_end date,
  summary text not null,
  trend_notes text,
  questions_for_doctor text,
  safety_notice text not null default 'This AI report is communication support only and is not diagnosis. Medication decisions must be evaluated by a physician.',
  source_record_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  patient_id uuid references public.profiles(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'patient', new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  )
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_patient_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1
      from public.patient_clinic_links pcl
      join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
      where pcl.patient_id = target_patient_id
        and pcl.active = true
        and cm.user_id = auth.uid()
        and cm.active = true
        and cm.role in ('clinic_staff', 'doctor', 'super_admin')
    )
$$;

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patient_clinic_links enable row level security;
alter table public.consent_records enable row level security;
alter table public.health_assessments enable row level security;
alter table public.training_logs enable row level security;
alter table public.meal_logs enable row level security;
alter table public.inbody_scans enable row level security;
alter table public.glp1_medication_logs enable row level security;
alter table public.side_effect_logs enable row level security;
alter table public.ai_visit_reports enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profiles_select_self_or_care_team" on public.profiles;
drop policy if exists "profiles_update_self_basic" on public.profiles;
drop policy if exists "clinics_select_members" on public.clinics;
drop policy if exists "clinic_members_select_own_clinic" on public.clinic_members;
drop policy if exists "patient_links_select_care_team" on public.patient_clinic_links;
drop policy if exists "consent_insert_self" on public.consent_records;
drop policy if exists "consent_select_self_or_care_team" on public.consent_records;
drop policy if exists "health_assessments_patient_crud" on public.health_assessments;
drop policy if exists "health_assessments_care_team_select" on public.health_assessments;
drop policy if exists "training_logs_patient_crud" on public.training_logs;
drop policy if exists "training_logs_care_team_select" on public.training_logs;
drop policy if exists "meal_logs_patient_crud" on public.meal_logs;
drop policy if exists "meal_logs_care_team_select" on public.meal_logs;
drop policy if exists "inbody_scans_patient_crud" on public.inbody_scans;
drop policy if exists "inbody_scans_care_team_select" on public.inbody_scans;
drop policy if exists "glp1_logs_patient_crud" on public.glp1_medication_logs;
drop policy if exists "glp1_logs_care_team_select" on public.glp1_medication_logs;
drop policy if exists "side_effect_logs_patient_crud" on public.side_effect_logs;
drop policy if exists "side_effect_logs_care_team_select" on public.side_effect_logs;
drop policy if exists "visit_reports_care_team_crud" on public.ai_visit_reports;
drop policy if exists "audit_events_super_admin_select" on public.audit_events;
drop policy if exists "audit_events_authenticated_insert" on public.audit_events;

create policy "profiles_select_self_or_care_team"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.can_access_patient(id) or public.is_super_admin());

create policy "profiles_update_self_basic"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = public.current_user_role());

create policy "clinics_select_members"
on public.clinics for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = clinics.id
      and cm.user_id = auth.uid()
      and cm.active = true
  )
);

create policy "clinic_members_select_own_clinic"
on public.clinic_members for select
to authenticated
using (
  public.is_super_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = clinic_members.clinic_id
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('doctor', 'super_admin')
  )
);

create policy "patient_links_select_care_team"
on public.patient_clinic_links for select
to authenticated
using (
  patient_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = patient_clinic_links.clinic_id
      and cm.user_id = auth.uid()
      and cm.active = true
  )
);

create policy "consent_insert_self"
on public.consent_records for insert
to authenticated
with check (user_id = auth.uid());

create policy "consent_select_self_or_care_team"
on public.consent_records for select
to authenticated
using (public.can_access_patient(user_id));

create policy "health_assessments_patient_crud"
on public.health_assessments for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "health_assessments_care_team_select"
on public.health_assessments for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "training_logs_patient_crud"
on public.training_logs for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "training_logs_care_team_select"
on public.training_logs for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "meal_logs_patient_crud"
on public.meal_logs for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "meal_logs_care_team_select"
on public.meal_logs for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "inbody_scans_patient_crud"
on public.inbody_scans for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "inbody_scans_care_team_select"
on public.inbody_scans for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "glp1_logs_patient_crud"
on public.glp1_medication_logs for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "glp1_logs_care_team_select"
on public.glp1_medication_logs for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "side_effect_logs_patient_crud"
on public.side_effect_logs for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "side_effect_logs_care_team_select"
on public.side_effect_logs for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "visit_reports_care_team_crud"
on public.ai_visit_reports for all
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = ai_visit_reports.patient_id
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('doctor', 'clinic_staff', 'super_admin')
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = ai_visit_reports.patient_id
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('doctor', 'clinic_staff', 'super_admin')
  )
);

create policy "audit_events_super_admin_select"
on public.audit_events for select
to authenticated
using (public.is_super_admin());

create policy "audit_events_authenticated_insert"
on public.audit_events for insert
to authenticated
with check (actor_id = auth.uid() or public.is_super_admin());

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists clinic_members_clinic_idx on public.clinic_members(clinic_id);
create index if not exists clinic_members_user_idx on public.clinic_members(user_id);
create index if not exists patient_clinic_links_patient_idx on public.patient_clinic_links(patient_id);
create index if not exists patient_clinic_links_clinic_idx on public.patient_clinic_links(clinic_id);
create index if not exists health_assessments_patient_created_idx on public.health_assessments(patient_id, created_at desc);
create index if not exists training_logs_patient_date_idx on public.training_logs(patient_id, trained_on desc);
create index if not exists meal_logs_patient_eaten_idx on public.meal_logs(patient_id, eaten_at desc);
create index if not exists inbody_scans_patient_measured_idx on public.inbody_scans(patient_id, measured_at desc);
create index if not exists glp1_logs_patient_injection_idx on public.glp1_medication_logs(patient_id, injection_date desc);
create index if not exists side_effect_logs_patient_created_idx on public.side_effect_logs(patient_id, created_at desc);
create index if not exists ai_visit_reports_patient_created_idx on public.ai_visit_reports(patient_id, created_at desc);
create index if not exists audit_events_clinic_created_idx on public.audit_events(clinic_id, created_at desc);
