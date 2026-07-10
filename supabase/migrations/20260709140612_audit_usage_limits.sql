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
