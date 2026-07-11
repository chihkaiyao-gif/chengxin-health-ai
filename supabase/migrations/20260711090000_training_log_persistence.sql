begin;

-- Rollback plan:
-- 1. Back up or export any rows from public.training_sets that must be retained.
-- 2. Drop the training_sets RLS policies and indexes, then drop public.training_sets.
-- 3. Drop training_logs indexes/constraints added here and remove started_at, ended_at, gym_name
--    only after confirming no deployed code depends on them.
-- Do not run rollback against production without a reviewed backup and maintenance window.

alter table public.training_logs
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists gym_name text;

alter table public.training_logs
  drop constraint if exists training_logs_activity_type_length_check,
  add constraint training_logs_activity_type_length_check
    check (char_length(btrim(activity_type)) between 1 and 160);

alter table public.training_logs
  drop constraint if exists training_logs_gym_name_length_check,
  add constraint training_logs_gym_name_length_check
    check (gym_name is null or char_length(btrim(gym_name)) between 1 and 160);

alter table public.training_logs
  drop constraint if exists training_logs_time_order_check,
  add constraint training_logs_time_order_check
    check (started_at is null or ended_at is null or ended_at >= started_at);

create table if not exists public.training_sets (
  id uuid primary key default gen_random_uuid(),
  training_log_id uuid not null references public.training_logs(id) on delete cascade,
  exercise_order integer not null,
  set_number integer not null,
  movement_name text not null,
  equipment_name text,
  equipment_brand text,
  equipment_model text,
  laterality text not null,
  side text,
  weight_kg numeric(7,2),
  weight_basis text not null,
  reps integer,
  set_type text not null,
  to_failure boolean not null default false,
  rpe numeric(3,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_sets_exercise_order_check check (exercise_order >= 1),
  constraint training_sets_set_number_check check (set_number >= 1),
  constraint training_sets_movement_name_check check (char_length(btrim(movement_name)) between 1 and 160),
  constraint training_sets_equipment_name_check check (equipment_name is null or char_length(btrim(equipment_name)) between 1 and 160),
  constraint training_sets_equipment_brand_check check (equipment_brand is null or char_length(btrim(equipment_brand)) between 1 and 120),
  constraint training_sets_equipment_model_check check (equipment_model is null or char_length(btrim(equipment_model)) between 1 and 120),
  constraint training_sets_laterality_check check (laterality in ('bilateral', 'unilateral')),
  constraint training_sets_side_check check (side is null or side in ('both', 'left', 'right', 'alternating')),
  constraint training_sets_laterality_side_check check (
    (laterality = 'bilateral' and coalesce(side, 'both') = 'both')
    or (laterality = 'unilateral' and side in ('left', 'right', 'alternating'))
  ),
  constraint training_sets_weight_kg_check check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 1500)),
  constraint training_sets_weight_basis_check check (weight_basis in ('total', 'per_side', 'per_hand')),
  constraint training_sets_reps_check check (reps is null or (reps >= 1 and reps <= 1000)),
  constraint training_sets_set_type_check check (set_type in ('warmup', 'working', 'drop')),
  constraint training_sets_rpe_check check (
    rpe is null
    or (rpe >= 0 and rpe <= 10 and mod((rpe * 10)::numeric, 5) = 0)
  ),
  constraint training_sets_notes_length_check check (notes is null or char_length(notes) <= 1000)
);

alter table public.training_sets enable row level security;

drop policy if exists "Patients can manage own training sets" on public.training_sets;
create policy "Patients can manage own training sets"
  on public.training_sets
  for all
  using (
    exists (
      select 1
      from public.training_logs
      where training_logs.id = training_sets.training_log_id
        and training_logs.patient_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.training_logs
      where training_logs.id = training_sets.training_log_id
        and training_logs.patient_id = auth.uid()
    )
  );

drop policy if exists "Care team can view patient training sets" on public.training_sets;
create policy "Care team can view patient training sets"
  on public.training_sets
  for select
  using (
    exists (
      select 1
      from public.training_logs
      where training_logs.id = training_sets.training_log_id
        and public.can_access_patient(training_logs.patient_id)
    )
  );

create index if not exists training_logs_patient_started_idx
  on public.training_logs(patient_id, started_at desc);

create index if not exists training_sets_log_order_idx
  on public.training_sets(training_log_id, exercise_order, set_number);

create index if not exists training_sets_log_idx
  on public.training_sets(training_log_id);

create index if not exists training_sets_movement_name_idx
  on public.training_sets(movement_name);

commit;
