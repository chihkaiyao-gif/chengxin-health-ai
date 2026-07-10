-- Chengxin Health AI MVP schema
-- Reference snapshot only. Staging and production should use supabase/migrations.
-- Auth users live in auth.users. Application data lives in public schema.

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
  create type public.food_meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.food_log_source as enum ('ai_photo', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inbody_record_source as enum ('ai_photo', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.glp1_medication_name as enum ('MOUNJARO', 'OZEMPIC', 'WEGOVY', 'SAXENDA', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.glp1_injection_method as enum ('self', 'clinic', 'caregiver', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.glp1_injection_site as enum ('abdomen', 'thigh', 'upper_arm', 'other', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.side_effect_severity as enum ('MILD', 'MODERATE', 'SEVERE');
exception when duplicate_object then null; end $$;

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
  user_id uuid references public.profiles(id) on delete cascade,
  goal text not null,
  height_cm numeric(5,2),
  weight_kg numeric(6,2),
  exercise_level public.exercise_intensity not null default 'LOW',
  chronic_conditions text,
  medications text,
  answers jsonb not null default '{}'::jsonb,
  raw_answers jsonb not null default '{}'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  persona public.assessment_persona,
  recommended_path text,
  ai_summary text,
  ai_safety_notice text not null default 'AI output is not diagnosis. Medication decisions must be evaluated by a physician.',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_type public.food_meal_type not null,
  meal_name text not null,
  calories_kcal numeric(8,2) not null default 0 check (calories_kcal >= 0),
  protein_g numeric(8,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(8,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(8,2) not null default 0 check (fat_g >= 0),
  fiber_g numeric(8,2) not null default 0 check (fiber_g >= 0),
  sodium_mg numeric(10,2) not null default 0 check (sodium_mg >= 0),
  source public.food_log_source not null default 'manual',
  note text,
  eaten_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.food_photo_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_log_id uuid references public.food_logs(id) on delete set null,
  image_path text not null,
  ai_raw_response jsonb not null default '{}'::jsonb,
  confidence_score numeric(4,3) check (confidence_score is null or confidence_score between 0 and 1),
  created_at timestamptz not null default now()
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

create table if not exists public.inbody_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(6,2),
  skeletal_muscle_kg numeric(6,2),
  body_fat_mass_kg numeric(6,2),
  body_fat_percentage numeric(5,2),
  bmi numeric(5,2),
  waist_hip_ratio numeric(4,2),
  visceral_fat_area_cm2 numeric(7,2),
  basal_metabolic_rate_kcal numeric(7,2),
  inbody_score numeric(5,2),
  note text,
  ai_summary text,
  source public.inbody_record_source not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.inbody_scan_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  inbody_record_id uuid references public.inbody_records(id) on delete set null,
  image_path text not null,
  ai_raw_response jsonb not null default '{}'::jsonb,
  confidence_score numeric(4,3) check (confidence_score is null or confidence_score between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.glp1_medication_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  medication_name public.glp1_medication_name not null,
  dose_label text not null,
  dose_mg numeric(6,3),
  injection_date date not null,
  next_injection_date date,
  injection_method public.glp1_injection_method not null default 'unknown',
  injection_site public.glp1_injection_site not null default 'unknown',
  lot_number text,
  note text,
  physician_supervised boolean not null default false,
  notes text,
  safety_notice text not null default 'Medication decisions and dose changes must be evaluated by a physician.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.clinic_visit_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  generated_by uuid references public.profiles(id) on delete set null,
  report_period_start date not null,
  report_period_end date not null,
  ai_summary jsonb not null default '{}'::jsonb,
  plain_text_summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.engagement_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric_date date not null,
  login_count int not null default 0 check (login_count >= 0),
  food_logged boolean not null default false,
  workout_logged boolean not null default false,
  weight_logged boolean not null default false,
  medication_logged boolean not null default false,
  inbody_uploaded boolean not null default false,
  adherence_score int not null default 0 check (adherence_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, metric_date)
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
alter table public.assessment_answers enable row level security;
alter table public.assessment_results enable row level security;
alter table public.training_logs enable row level security;
alter table public.meal_logs enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_photo_analyses enable row level security;
alter table public.inbody_scans enable row level security;
alter table public.inbody_records enable row level security;
alter table public.inbody_scan_analyses enable row level security;
alter table public.glp1_medication_logs enable row level security;
alter table public.glp1_side_effect_logs enable row level security;
alter table public.side_effect_logs enable row level security;
alter table public.ai_visit_reports enable row level security;
alter table public.clinic_visit_reports enable row level security;
alter table public.engagement_metrics enable row level security;
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
drop policy if exists "assessment_answers_patient_crud" on public.assessment_answers;
drop policy if exists "assessment_answers_care_team_select" on public.assessment_answers;
drop policy if exists "assessment_results_patient_crud" on public.assessment_results;
drop policy if exists "assessment_results_care_team_select" on public.assessment_results;
drop policy if exists "training_logs_patient_crud" on public.training_logs;
drop policy if exists "training_logs_care_team_select" on public.training_logs;
drop policy if exists "meal_logs_patient_crud" on public.meal_logs;
drop policy if exists "meal_logs_care_team_select" on public.meal_logs;
drop policy if exists "food_logs_patient_crud" on public.food_logs;
drop policy if exists "food_logs_care_team_select" on public.food_logs;
drop policy if exists "food_photo_analyses_patient_crud" on public.food_photo_analyses;
drop policy if exists "food_photo_analyses_care_team_select" on public.food_photo_analyses;
drop policy if exists "inbody_scans_patient_crud" on public.inbody_scans;
drop policy if exists "inbody_scans_care_team_select" on public.inbody_scans;
drop policy if exists "inbody_records_patient_crud" on public.inbody_records;
drop policy if exists "inbody_records_care_team_select" on public.inbody_records;
drop policy if exists "inbody_scan_analyses_patient_crud" on public.inbody_scan_analyses;
drop policy if exists "inbody_scan_analyses_care_team_select" on public.inbody_scan_analyses;
drop policy if exists "glp1_logs_patient_crud" on public.glp1_medication_logs;
drop policy if exists "glp1_logs_care_team_select" on public.glp1_medication_logs;
drop policy if exists "glp1_side_effect_logs_patient_crud" on public.glp1_side_effect_logs;
drop policy if exists "glp1_side_effect_logs_care_team_select" on public.glp1_side_effect_logs;
drop policy if exists "side_effect_logs_patient_crud" on public.side_effect_logs;
drop policy if exists "side_effect_logs_care_team_select" on public.side_effect_logs;
drop policy if exists "visit_reports_care_team_crud" on public.ai_visit_reports;
drop policy if exists "clinic_visit_reports_care_team_crud" on public.clinic_visit_reports;
drop policy if exists "clinic_visit_reports_patient_select" on public.clinic_visit_reports;
drop policy if exists "engagement_metrics_patient_crud" on public.engagement_metrics;
drop policy if exists "engagement_metrics_care_team_select" on public.engagement_metrics;
drop policy if exists "audit_events_super_admin_select" on public.audit_events;
drop policy if exists "audit_events_authenticated_insert" on public.audit_events;
drop policy if exists "patients_upload_own_meal_photos" on storage.objects;
drop policy if exists "patients_read_own_meal_photos_or_care_team" on storage.objects;
drop policy if exists "patients_upload_own_food_photos" on storage.objects;
drop policy if exists "patients_read_own_food_photos_or_care_team" on storage.objects;
drop policy if exists "patients_upload_own_inbody_scans" on storage.objects;
drop policy if exists "patients_read_own_inbody_scans_or_care_team" on storage.objects;

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

create policy "food_logs_patient_crud"
on public.food_logs for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "food_logs_care_team_select"
on public.food_logs for select
to authenticated
using (public.can_access_patient(user_id));

create policy "food_photo_analyses_patient_crud"
on public.food_photo_analyses for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "food_photo_analyses_care_team_select"
on public.food_photo_analyses for select
to authenticated
using (public.can_access_patient(user_id));

create policy "inbody_scans_patient_crud"
on public.inbody_scans for all
to authenticated
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

create policy "inbody_scans_care_team_select"
on public.inbody_scans for select
to authenticated
using (public.can_access_patient(patient_id));

create policy "inbody_records_patient_crud"
on public.inbody_records for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inbody_records_care_team_select"
on public.inbody_records for select
to authenticated
using (public.can_access_patient(user_id));

create policy "inbody_scan_analyses_patient_crud"
on public.inbody_scan_analyses for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inbody_scan_analyses_care_team_select"
on public.inbody_scan_analyses for select
to authenticated
using (public.can_access_patient(user_id));

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

create policy "clinic_visit_reports_care_team_crud"
on public.clinic_visit_reports for all
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = clinic_visit_reports.patient_id
      and pcl.active = true
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
    where pcl.patient_id = clinic_visit_reports.patient_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('doctor', 'clinic_staff', 'super_admin')
  )
);

create policy "clinic_visit_reports_patient_select"
on public.clinic_visit_reports for select
to authenticated
using (patient_id = auth.uid());

create policy "engagement_metrics_patient_crud"
on public.engagement_metrics for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "engagement_metrics_care_team_select"
on public.engagement_metrics for select
to authenticated
using (public.can_access_patient(user_id));

create policy "audit_events_super_admin_select"
on public.audit_events for select
to authenticated
using (public.is_super_admin());

create policy "audit_events_authenticated_insert"
on public.audit_events for insert
to authenticated
with check (actor_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('meal-photos', 'meal-photos', false),
  ('inbody-scans', 'inbody-scans', false)
on conflict (id) do nothing;

create policy "patients_upload_own_meal_photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients_read_own_meal_photos_or_care_team"
on storage.objects for select
to authenticated
using (
  bucket_id = 'meal-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_access_patient(((storage.foldername(name))[1])::uuid)
  )
);

create policy "patients_upload_own_food_photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients_read_own_food_photos_or_care_team"
on storage.objects for select
to authenticated
using (
  bucket_id = 'meal-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_access_patient(((storage.foldername(name))[1])::uuid)
  )
);

create policy "patients_upload_own_inbody_scans"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inbody-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients_read_own_inbody_scans_or_care_team"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inbody-scans'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_access_patient(((storage.foldername(name))[1])::uuid)
  )
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists clinic_members_user_idx on public.clinic_members(user_id);
create index if not exists patient_clinic_links_patient_idx on public.patient_clinic_links(patient_id);
create index if not exists assessment_results_user_completed_idx on public.assessment_results(user_id, completed_at desc);
create index if not exists assessment_answers_user_completed_idx on public.assessment_answers(user_id, completed_at desc);
create index if not exists training_logs_patient_date_idx on public.training_logs(patient_id, trained_on desc);
create index if not exists meal_logs_patient_time_idx on public.meal_logs(patient_id, eaten_at desc);
create index if not exists food_logs_user_eaten_idx on public.food_logs(user_id, eaten_at desc);
create index if not exists food_photo_analyses_user_created_idx on public.food_photo_analyses(user_id, created_at desc);
create index if not exists food_photo_analyses_food_log_idx on public.food_photo_analyses(food_log_id);
create index if not exists inbody_scans_patient_time_idx on public.inbody_scans(patient_id, measured_at desc);
create index if not exists inbody_records_user_measured_idx on public.inbody_records(user_id, measured_at desc);
create index if not exists inbody_scan_analyses_user_created_idx on public.inbody_scan_analyses(user_id, created_at desc);
create index if not exists inbody_scan_analyses_record_idx on public.inbody_scan_analyses(inbody_record_id);
create index if not exists glp1_logs_patient_date_idx on public.glp1_medication_logs(patient_id, injection_date desc);
create index if not exists glp1_logs_user_injection_idx on public.glp1_medication_logs(coalesce(user_id, patient_id), injection_date desc);
create index if not exists glp1_logs_user_next_injection_idx on public.glp1_medication_logs(coalesce(user_id, patient_id), next_injection_date asc);
create index if not exists glp1_side_effect_logs_user_created_idx on public.glp1_side_effect_logs(user_id, created_at desc);
create index if not exists glp1_side_effect_logs_medication_log_idx on public.glp1_side_effect_logs(medication_log_id);
create index if not exists side_effect_logs_patient_created_idx on public.side_effect_logs(patient_id, created_at desc);
create index if not exists clinic_visit_reports_patient_created_idx on public.clinic_visit_reports(patient_id, created_at desc);
create index if not exists clinic_visit_reports_generated_by_idx on public.clinic_visit_reports(generated_by, created_at desc);
create index if not exists engagement_metrics_user_date_idx on public.engagement_metrics(user_id, metric_date desc);
create index if not exists engagement_metrics_low_adherence_idx on public.engagement_metrics(user_id, adherence_score, metric_date desc);

do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'canceled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_severity as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_status as enum ('open', 'dismissed', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('line', 'email', 'sms', 'in_app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  reason text not null,
  preferred_date date not null,
  preferred_time_slot text not null check (preferred_time_slot in ('morning', 'afternoon', 'evening', 'flexible')),
  status public.appointment_status not null default 'pending',
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  reminder_type text not null,
  severity public.reminder_severity not null default 'low',
  title text not null,
  message text not null,
  status public.reminder_status not null default 'open',
  source text not null default 'system',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  channel public.notification_channel not null,
  title text not null,
  message text not null,
  status public.notification_status not null default 'pending',
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;
alter table public.reminder_events enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "appointments_select_patient_or_care_team" on public.appointments;
drop policy if exists "appointments_insert_patient" on public.appointments;
drop policy if exists "appointments_update_care_team" on public.appointments;
drop policy if exists "reminder_events_select_patient_or_care_team" on public.reminder_events;
drop policy if exists "reminder_events_patient_update_status" on public.reminder_events;
drop policy if exists "reminder_events_care_team_crud" on public.reminder_events;
drop policy if exists "notification_logs_select_patient_or_care_team" on public.notification_logs;
drop policy if exists "notification_logs_insert_patient_or_care_team" on public.notification_logs;

create policy "appointments_select_patient_or_care_team"
on public.appointments for select
to authenticated
using (user_id = auth.uid() or public.can_access_patient(user_id));

create policy "appointments_insert_patient"
on public.appointments for insert
to authenticated
with check (user_id = auth.uid());

create policy "appointments_update_care_team"
on public.appointments for update
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = appointments.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = appointments.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
);

create policy "reminder_events_select_patient_or_care_team"
on public.reminder_events for select
to authenticated
using (user_id = auth.uid() or public.can_access_patient(user_id));

create policy "reminder_events_patient_update_status"
on public.reminder_events for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "reminder_events_care_team_crud"
on public.reminder_events for all
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = reminder_events.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = reminder_events.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
);

create policy "notification_logs_select_patient_or_care_team"
on public.notification_logs for select
to authenticated
using (user_id = auth.uid() or public.can_access_patient(user_id));

create policy "notification_logs_insert_patient_or_care_team"
on public.notification_logs for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1
    from public.patient_clinic_links pcl
    join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
    where pcl.patient_id = notification_logs.user_id
      and pcl.active = true
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('clinic_staff', 'doctor', 'super_admin')
  )
);

create index if not exists appointments_user_date_idx on public.appointments(user_id, preferred_date desc);
create index if not exists appointments_clinic_status_date_idx on public.appointments(clinic_id, status, preferred_date asc);
create index if not exists reminder_events_user_status_created_idx on public.reminder_events(user_id, status, created_at desc);
create index if not exists reminder_events_clinic_status_created_idx on public.reminder_events(clinic_id, status, created_at desc);
create index if not exists notification_logs_user_created_idx on public.notification_logs(user_id, created_at desc);
create index if not exists notification_logs_clinic_created_idx on public.notification_logs(clinic_id, created_at desc);

-- Phase 9: SaaS commercialization foundations.
-- Adds multi-clinic branding, team roles, patient invites, subscriptions, and RLS helpers.

alter type public.user_role add value if not exists 'owner';
alter type public.user_role add value if not exists 'nutritionist';
alter type public.user_role add value if not exists 'coach';
alter type public.user_role add value if not exists 'viewer';

do $$ begin
  create type public.clinic_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.clinic_member_status as enum ('active', 'invited', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.clinic_patient_status as enum ('active', 'inactive', 'discharged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.patient_invite_status as enum ('pending', 'accepted', 'expired', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_plan_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

alter table public.clinics
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#0f766e',
  add column if not exists email text,
  add column if not exists line_url text,
  add column if not exists website_url text,
  add column if not exists status public.clinic_status not null default 'active';

alter table public.clinics
  drop constraint if exists clinics_primary_color_check,
  add constraint clinics_primary_color_check
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.clinic_members
  drop constraint if exists clinic_members_role_check,
  add column if not exists status public.clinic_member_status not null default 'active';

update public.clinic_members
set status = case when active then 'active'::public.clinic_member_status else 'disabled'::public.clinic_member_status end
where status is null;

create table if not exists public.clinic_patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  status public.clinic_patient_status not null default 'active',
  joined_at timestamptz not null default now(),
  note text,
  unique (clinic_id, patient_id)
);

insert into public.clinic_patients (clinic_id, patient_id, status, joined_at)
select clinic_id, patient_id, 'active'::public.clinic_patient_status, created_at
from public.patient_clinic_links
where active = true
on conflict (clinic_id, patient_id) do nothing;

create table if not exists public.patient_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  invite_code text not null unique,
  invited_phone text,
  invited_email text,
  status public.patient_invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint patient_invites_code_length_check check (char_length(invite_code) between 6 and 32)
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_monthly numeric(10, 2) not null default 0,
  max_patients integer,
  max_staff integer,
  features jsonb not null default '{}'::jsonb,
  status public.subscription_plan_status not null default 'active'
);

create table if not exists public.clinic_subscriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (clinic_id)
);

insert into public.subscription_plans (code, name, price_monthly, max_patients, max_staff, features, status)
values
  ('free', 'Free', 0, 20, 2, '{"ai_visit_reports": false, "clinic_branding": true, "basic_reminders": true}'::jsonb, 'active'),
  ('clinic_basic', 'Clinic Basic', 2990, 200, 10, '{"ai_visit_reports": true, "clinic_branding": true, "basic_reminders": true, "team_roles": true}'::jsonb, 'active'),
  ('clinic_pro', 'Clinic Pro', 8990, 1000, 40, '{"ai_visit_reports": true, "clinic_branding": true, "advanced_reminders": true, "team_roles": true, "priority_support": true}'::jsonb, 'active'),
  ('enterprise', 'Enterprise', 0, null, null, '{"custom_contract": true, "sso": true, "audit_export": true, "dedicated_support": true}'::jsonb, 'active')
on conflict (code) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  max_patients = excluded.max_patients,
  max_staff = excluded.max_staff,
  features = excluded.features,
  status = excluded.status;

create or replace function public.is_active_clinic_member(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic_id
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
    )
$$;

create or replace function public.has_clinic_role(target_clinic_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = target_clinic_id
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
        and cm.role::text = any(allowed_roles)
    )
$$;

create or replace function public.can_manage_clinic(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_clinic_role(target_clinic_id, array['owner'])
$$;

create or replace function public.has_patient_role(target_patient_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.clinic_patients cp
      join public.clinic_members cm on cm.clinic_id = cp.clinic_id
      where cp.patient_id = target_patient_id
        and cp.status = 'active'
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
        and cm.role::text = any(allowed_roles)
    )
    or exists (
      select 1
      from public.patient_clinic_links pcl
      join public.clinic_members cm on cm.clinic_id = pcl.clinic_id
      where pcl.patient_id = target_patient_id
        and pcl.active = true
        and cm.user_id = auth.uid()
        and coalesce(cm.active, true) = true
        and coalesce(cm.status::text, 'active') = 'active'
        and cm.role::text = any(allowed_roles)
    )
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_patient_id = auth.uid()
    or public.has_patient_role(
      target_patient_id,
      array['owner', 'doctor', 'clinic_staff', 'nutritionist', 'coach', 'viewer', 'super_admin']
    )
$$;

create or replace function public.accept_patient_invite(invite_code_input text)
returns table(invite_id uuid, clinic_id uuid, patient_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.patient_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select *
  into invite_record
  from public.patient_invites
  where invite_code = upper(trim(invite_code_input))
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  update public.patient_invites
  set status = 'accepted',
      accepted_by = auth.uid()
  where id = invite_record.id;

  insert into public.clinic_patients (clinic_id, patient_id, status, joined_at)
  values (invite_record.clinic_id, auth.uid(), 'active', now())
  on conflict (clinic_id, patient_id) do update set
    status = 'active',
    joined_at = coalesce(public.clinic_patients.joined_at, excluded.joined_at);

  update public.profiles
  set default_clinic_id = coalesce(default_clinic_id, invite_record.clinic_id),
      updated_at = now()
  where id = auth.uid();

  return query select invite_record.id, invite_record.clinic_id, auth.uid();
end;
$$;

grant execute on function public.accept_patient_invite(text) to authenticated;

alter table public.clinic_patients enable row level security;
alter table public.patient_invites enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.clinic_subscriptions enable row level security;

drop policy if exists "clinics_select_members" on public.clinics;
drop policy if exists "clinics_insert_super_admin" on public.clinics;
drop policy if exists "clinics_update_owner" on public.clinics;
drop policy if exists "clinic_members_select_own_clinic" on public.clinic_members;
drop policy if exists "clinic_members_insert_owner" on public.clinic_members;
drop policy if exists "clinic_members_update_owner" on public.clinic_members;
drop policy if exists "patient_links_select_care_team" on public.patient_clinic_links;
drop policy if exists "clinic_patients_select_patient_or_care_team" on public.clinic_patients;
drop policy if exists "clinic_patients_insert_care_team" on public.clinic_patients;
drop policy if exists "clinic_patients_update_care_team" on public.clinic_patients;
drop policy if exists "patient_invites_select_care_team" on public.patient_invites;
drop policy if exists "patient_invites_insert_care_team" on public.patient_invites;
drop policy if exists "patient_invites_update_care_team" on public.patient_invites;
drop policy if exists "subscription_plans_select_active" on public.subscription_plans;
drop policy if exists "clinic_subscriptions_select_members" on public.clinic_subscriptions;
drop policy if exists "clinic_subscriptions_manage_owner" on public.clinic_subscriptions;
drop policy if exists "appointments_update_care_team" on public.appointments;
drop policy if exists "reminder_events_care_team_crud" on public.reminder_events;
drop policy if exists "notification_logs_insert_patient_or_care_team" on public.notification_logs;
drop policy if exists "visit_reports_care_team_crud" on public.ai_visit_reports;
drop policy if exists "clinic_visit_reports_care_team_crud" on public.clinic_visit_reports;

create policy "clinics_select_members"
on public.clinics for select
to authenticated
using (public.is_active_clinic_member(id));

create policy "clinics_insert_super_admin"
on public.clinics for insert
to authenticated
with check (public.is_super_admin());

create policy "clinics_update_owner"
on public.clinics for update
to authenticated
using (public.can_manage_clinic(id))
with check (public.can_manage_clinic(id));

create policy "clinic_members_select_own_clinic"
on public.clinic_members for select
to authenticated
using (user_id = auth.uid() or public.is_active_clinic_member(clinic_id));

create policy "clinic_members_insert_owner"
on public.clinic_members for insert
to authenticated
with check (public.can_manage_clinic(clinic_id));

create policy "clinic_members_update_owner"
on public.clinic_members for update
to authenticated
using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

create policy "patient_links_select_care_team"
on public.patient_clinic_links for select
to authenticated
using (patient_id = auth.uid() or public.is_active_clinic_member(clinic_id));

create policy "clinic_patients_select_patient_or_care_team"
on public.clinic_patients for select
to authenticated
using (patient_id = auth.uid() or public.is_active_clinic_member(clinic_id));

create policy "clinic_patients_insert_care_team"
on public.clinic_patients for insert
to authenticated
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "clinic_patients_update_care_team"
on public.clinic_patients for update
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "patient_invites_select_care_team"
on public.patient_invites for select
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "patient_invites_insert_care_team"
on public.patient_invites for insert
to authenticated
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "patient_invites_update_care_team"
on public.patient_invites for update
to authenticated
using (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff']));

create policy "subscription_plans_select_active"
on public.subscription_plans for select
to authenticated
using (status = 'active' or public.is_super_admin());

create policy "clinic_subscriptions_select_members"
on public.clinic_subscriptions for select
to authenticated
using (public.is_active_clinic_member(clinic_id));

create policy "clinic_subscriptions_manage_owner"
on public.clinic_subscriptions for all
to authenticated
using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

create policy "appointments_update_care_team"
on public.appointments for update
to authenticated
using (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']));

create policy "reminder_events_care_team_crud"
on public.reminder_events for all
to authenticated
using (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']))
with check (public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff']));

create policy "notification_logs_insert_patient_or_care_team"
on public.notification_logs for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.has_patient_role(user_id, array['owner', 'doctor', 'clinic_staff'])
);

create policy "visit_reports_care_team_crud"
on public.ai_visit_reports for all
to authenticated
using (public.has_patient_role(patient_id, array['owner', 'doctor']))
with check (public.has_patient_role(patient_id, array['owner', 'doctor']));

create policy "clinic_visit_reports_care_team_crud"
on public.clinic_visit_reports for all
to authenticated
using (public.has_patient_role(patient_id, array['owner', 'doctor']))
with check (public.has_patient_role(patient_id, array['owner', 'doctor']));

create index if not exists clinics_slug_idx on public.clinics(slug);
create index if not exists clinics_status_idx on public.clinics(status);
create index if not exists clinic_members_clinic_status_idx on public.clinic_members(clinic_id, status);
create index if not exists clinic_patients_clinic_status_idx on public.clinic_patients(clinic_id, status);
create index if not exists clinic_patients_patient_idx on public.clinic_patients(patient_id);
create index if not exists patient_invites_clinic_status_idx on public.patient_invites(clinic_id, status, expires_at desc);
create index if not exists patient_invites_code_idx on public.patient_invites(invite_code);
create index if not exists clinic_subscriptions_clinic_status_idx on public.clinic_subscriptions(clinic_id, status);

-- Phase 10: audit trail, operational safety, and usage limit foundations.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  ai_food_analysis_count integer not null default 0,
  ai_inbody_analysis_count integer not null default 0,
  ai_visit_report_count integer not null default 0,
  active_patient_count integer not null default 0,
  staff_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, period_start, period_end),
  constraint usage_counters_non_negative_check check (
    ai_food_analysis_count >= 0
    and ai_inbody_analysis_count >= 0
    and ai_visit_report_count >= 0
    and active_patient_count >= 0
    and staff_count >= 0
  )
);

update public.subscription_plans
set features = features || '{"ai_food_analysis_monthly": 20, "ai_inbody_analysis_monthly": 10, "ai_visit_reports_monthly": 5}'::jsonb
where code = 'free';

update public.subscription_plans
set features = features || '{"ai_food_analysis_monthly": 1000, "ai_inbody_analysis_monthly": 500, "ai_visit_reports_monthly": 100}'::jsonb
where code = 'clinic_basic';

update public.subscription_plans
set features = features || '{"ai_food_analysis_monthly": 5000, "ai_inbody_analysis_monthly": 2000, "ai_visit_reports_monthly": 500}'::jsonb
where code = 'clinic_pro';

update public.subscription_plans
set features = features || '{"ai_food_analysis_monthly": null, "ai_inbody_analysis_monthly": null, "ai_visit_reports_monthly": null}'::jsonb
where code = 'enterprise';

create or replace function public.can_view_clinic_audit_logs(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_clinic_role(target_clinic_id, array['owner', 'doctor'])
$$;

create or replace function public.can_write_usage_counter(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or public.is_active_clinic_member(target_clinic_id)
    or exists (
      select 1
      from public.clinic_patients cp
      where cp.clinic_id = target_clinic_id
        and cp.patient_id = auth.uid()
        and cp.status = 'active'
    )
    or exists (
      select 1
      from public.patient_clinic_links pcl
      where pcl.clinic_id = target_clinic_id
        and pcl.patient_id = auth.uid()
        and pcl.active = true
    )
$$;

create or replace function public.increment_usage_counter(target_clinic_id uuid, counter_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_period_start date := date_trunc('month', now())::date;
  current_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  patient_count integer := 0;
  member_count integer := 0;
begin
  if not public.can_write_usage_counter(target_clinic_id) then
    raise exception 'FORBIDDEN';
  end if;

  if counter_name not in ('ai_food_analysis', 'ai_inbody_analysis', 'ai_visit_report') then
    raise exception 'INVALID_COUNTER';
  end if;

  select count(*) into patient_count
  from public.clinic_patients
  where clinic_id = target_clinic_id
    and status = 'active';

  select count(*) into member_count
  from public.clinic_members
  where clinic_id = target_clinic_id
    and coalesce(status::text, 'active') <> 'disabled';

  insert into public.usage_counters (
    clinic_id,
    period_start,
    period_end,
    active_patient_count,
    staff_count
  )
  values (
    target_clinic_id,
    current_period_start,
    current_period_end,
    patient_count,
    member_count
  )
  on conflict (clinic_id, period_start, period_end) do nothing;

  update public.usage_counters
  set
    ai_food_analysis_count = ai_food_analysis_count + case when counter_name = 'ai_food_analysis' then 1 else 0 end,
    ai_inbody_analysis_count = ai_inbody_analysis_count + case when counter_name = 'ai_inbody_analysis' then 1 else 0 end,
    ai_visit_report_count = ai_visit_report_count + case when counter_name = 'ai_visit_report' then 1 else 0 end,
    active_patient_count = patient_count,
    staff_count = member_count,
    updated_at = now()
  where clinic_id = target_clinic_id
    and period_start = current_period_start
    and period_end = current_period_end;
end;
$$;

grant execute on function public.increment_usage_counter(uuid, text) to authenticated;

alter table public.audit_logs enable row level security;
alter table public.usage_counters enable row level security;

drop policy if exists "audit_logs_select_owner_doctor" on public.audit_logs;
drop policy if exists "audit_logs_insert_actor" on public.audit_logs;
drop policy if exists "usage_counters_select_clinic_members" on public.usage_counters;
drop policy if exists "usage_counters_write_clinic_or_patient" on public.usage_counters;

create policy "audit_logs_select_owner_doctor"
on public.audit_logs for select
to authenticated
using (
  clinic_id is not null
  and public.can_view_clinic_audit_logs(clinic_id)
);

create policy "audit_logs_insert_actor"
on public.audit_logs for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and (
    clinic_id is null
    or public.is_active_clinic_member(clinic_id)
    or exists (
      select 1
      from public.clinic_patients cp
      where cp.clinic_id = audit_logs.clinic_id
        and cp.patient_id = auth.uid()
        and cp.status = 'active'
    )
    or exists (
      select 1
      from public.patient_clinic_links pcl
      where pcl.clinic_id = audit_logs.clinic_id
        and pcl.patient_id = auth.uid()
        and pcl.active = true
    )
  )
);

create policy "usage_counters_select_clinic_members"
on public.usage_counters for select
to authenticated
using (public.is_active_clinic_member(clinic_id));

create index if not exists audit_logs_clinic_created_idx on public.audit_logs(clinic_id, created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_target_created_idx on public.audit_logs(target_user_id, created_at desc);
create index if not exists audit_logs_action_created_idx on public.audit_logs(action, created_at desc);
create index if not exists usage_counters_clinic_period_idx on public.usage_counters(clinic_id, period_start desc, period_end desc);
