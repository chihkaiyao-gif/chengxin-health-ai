-- Phase 6: clinic visit reports and patient engagement metrics.

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

alter table public.clinic_visit_reports enable row level security;
alter table public.engagement_metrics enable row level security;

drop policy if exists "clinic_visit_reports_care_team_crud" on public.clinic_visit_reports;
drop policy if exists "clinic_visit_reports_patient_select" on public.clinic_visit_reports;
drop policy if exists "engagement_metrics_patient_crud" on public.engagement_metrics;
drop policy if exists "engagement_metrics_care_team_select" on public.engagement_metrics;

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

create index if not exists clinic_visit_reports_patient_created_idx
  on public.clinic_visit_reports(patient_id, created_at desc);

create index if not exists clinic_visit_reports_generated_by_idx
  on public.clinic_visit_reports(generated_by, created_at desc);

create index if not exists engagement_metrics_user_date_idx
  on public.engagement_metrics(user_id, metric_date desc);

create index if not exists engagement_metrics_low_adherence_idx
  on public.engagement_metrics(user_id, adherence_score, metric_date desc);
