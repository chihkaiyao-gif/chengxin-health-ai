-- Phase 16: internal demo pack, pilot feedback, and clinic trial readiness.

do $$ begin
  create type public.feedback_type as enum ('bug', 'idea', 'confusing', 'praise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_status as enum ('open', 'reviewed', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  page_path text not null,
  feedback_type public.feedback_type not null,
  message text not null,
  screenshot_url text,
  status public.feedback_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint feedback_page_path_length_check check (char_length(page_path) between 1 and 300),
  constraint feedback_message_length_check check (char_length(message) between 3 and 2000),
  constraint feedback_screenshot_url_length_check check (screenshot_url is null or char_length(screenshot_url) <= 500)
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
drop policy if exists "feedback_select_own_or_clinic" on public.feedback;
drop policy if exists "feedback_update_clinic_team" on public.feedback;

create policy "feedback_insert_own"
on public.feedback for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    clinic_id is null
    or public.is_active_clinic_member(clinic_id)
    or exists (
      select 1
      from public.clinic_patients cp
      where cp.clinic_id = feedback.clinic_id
        and cp.patient_id = auth.uid()
        and cp.status = 'active'
    )
    or exists (
      select 1
      from public.patient_clinic_links pcl
      where pcl.clinic_id = feedback.clinic_id
        and pcl.patient_id = auth.uid()
        and pcl.active = true
    )
  )
);

create policy "feedback_select_own_or_clinic"
on public.feedback for select
to authenticated
using (
  user_id = auth.uid()
  or (
    clinic_id is not null
    and public.is_active_clinic_member(clinic_id)
  )
);

create policy "feedback_update_clinic_team"
on public.feedback for update
to authenticated
using (
  clinic_id is not null
  and public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff'])
)
with check (
  clinic_id is not null
  and public.has_clinic_role(clinic_id, array['owner', 'doctor', 'clinic_staff'])
);

create index if not exists feedback_clinic_created_idx on public.feedback(clinic_id, created_at desc);
create index if not exists feedback_user_created_idx on public.feedback(user_id, created_at desc);
create index if not exists feedback_status_created_idx on public.feedback(status, created_at desc);
