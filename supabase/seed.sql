-- Chengxin Health AI demo seed data.
-- Run after all migrations have been applied.

insert into public.clinics (
  id,
  name,
  slug,
  logo_url,
  primary_color,
  address,
  phone,
  email,
  line_url,
  website_url,
  status,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000100',
  '承心健康 Demo 診所',
  'chengxin-demo',
  null,
  '#0f766e',
  '台北市信義區健康路 100 號',
  '02-2399-0100',
  'clinic-demo@chengxin.health',
  'https://line.me/R/ti/p/@chengxin-demo',
  'https://chengxin.health/demo',
  'active',
  now(),
  now()
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  logo_url = excluded.logo_url,
  primary_color = excluded.primary_color,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  line_url = excluded.line_url,
  website_url = excluded.website_url,
  status = excluded.status,
  updated_at = now();

with demo_users(id, email, full_name, profile_role, phone, birth_date, sex) as (
  values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'owner@chengxin.health', '王院長 Owner', 'owner', '0911000001', '1978-02-14'::date, 'male'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'doctor@chengxin.health', '林醫師 Doctor', 'doctor', '0911000002', '1983-09-08'::date, 'female'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'staff@chengxin.health', '陳個管師 Staff', 'clinic_staff', '0911000003', '1990-05-20'::date, 'female'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'patient01@chengxin.health', '張小安', 'patient', '0922000101', '1991-03-18'::date, 'female'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'patient02@chengxin.health', '李健明', 'patient', '0922000102', '1987-11-02'::date, 'male'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'patient03@chengxin.health', '吳美婷', 'patient', '0922000103', '1994-06-12'::date, 'female'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'patient04@chengxin.health', '周志宏', 'patient', '0922000104', '1968-01-25'::date, 'male'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'patient05@chengxin.health', '黃阿梅', 'patient', '0922000105', '1951-12-09'::date, 'female')
)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  id,
  'authenticated',
  'authenticated',
  email,
  crypt('Demo123456!', gen_salt('bf')),
  now(),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('full_name', full_name, 'role', profile_role),
  now(),
  now()
from demo_users
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

with demo_users(id, email) as (
  values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'owner@chengxin.health'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'doctor@chengxin.health'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'staff@chengxin.health'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'patient01@chengxin.health'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'patient02@chengxin.health'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'patient03@chengxin.health'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'patient04@chengxin.health'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'patient05@chengxin.health')
)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id,
  id,
  email,
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from demo_users
on conflict (provider_id, provider) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

with demo_users(id, email, full_name, profile_role, phone, birth_date, sex) as (
  values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'owner@chengxin.health', '王院長 Owner', 'owner', '0911000001', '1978-02-14'::date, 'male'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'doctor@chengxin.health', '林醫師 Doctor', 'doctor', '0911000002', '1983-09-08'::date, 'female'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'staff@chengxin.health', '陳個管師 Staff', 'clinic_staff', '0911000003', '1990-05-20'::date, 'female'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'patient01@chengxin.health', '張小安', 'patient', '0922000101', '1991-03-18'::date, 'female'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'patient02@chengxin.health', '李健明', 'patient', '0922000102', '1987-11-02'::date, 'male'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'patient03@chengxin.health', '吳美婷', 'patient', '0922000103', '1994-06-12'::date, 'female'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'patient04@chengxin.health', '周志宏', 'patient', '0922000104', '1968-01-25'::date, 'male'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'patient05@chengxin.health', '黃阿梅', 'patient', '0922000105', '1951-12-09'::date, 'female')
)
insert into public.profiles (
  id,
  role,
  full_name,
  phone,
  date_of_birth,
  sex,
  default_clinic_id,
  onboarding_completed_at,
  created_at,
  updated_at
)
select
  id,
  profile_role::public.user_role,
  full_name,
  phone,
  birth_date,
  sex,
  '00000000-0000-0000-0000-000000000100'::uuid,
  now() - interval '30 days',
  now(),
  now()
from demo_users
on conflict (id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  phone = excluded.phone,
  date_of_birth = excluded.date_of_birth,
  sex = excluded.sex,
  default_clinic_id = excluded.default_clinic_id,
  onboarding_completed_at = excluded.onboarding_completed_at,
  updated_at = now();

insert into public.clinic_members (id, clinic_id, user_id, role, active, status, created_at)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'owner', true, 'active', now()),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', 'doctor', true, 'active', now()),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000003', 'clinic_staff', true, 'active', now())
on conflict (clinic_id, user_id) do update set
  role = excluded.role,
  active = excluded.active,
  status = excluded.status;

insert into public.patient_clinic_links (id, patient_id, clinic_id, assigned_doctor_id, active, created_at)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', true, now() - interval '90 days'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', true, now() - interval '84 days'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', true, now() - interval '60 days'),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', true, now() - interval '45 days'),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', true, now() - interval '40 days')
on conflict (patient_id, clinic_id) do update set
  assigned_doctor_id = excluded.assigned_doctor_id,
  active = excluded.active;

insert into public.clinic_patients (id, clinic_id, patient_id, status, joined_at, note)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000101', 'active', now() - interval '90 days', '減重初學者，適合低強度開始。'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000102', 'active', now() - interval '84 days', '健身房訓練族群，重視肌肉量追蹤。'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000103', 'active', now() - interval '60 days', 'GLP-1 減重中，需追蹤蛋白質與副作用。'),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000104', 'active', now() - interval '45 days', '慢性病照護，需注意血壓血糖安全提醒。'),
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000105', 'active', now() - interval '40 days', '銀髮肌力與平衡訓練。')
on conflict (clinic_id, patient_id) do update set
  status = excluded.status,
  joined_at = excluded.joined_at,
  note = excluded.note;

insert into public.clinic_subscriptions (
  id,
  clinic_id,
  plan_id,
  status,
  trial_ends_at,
  current_period_start,
  current_period_end,
  created_at
)
select
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000100',
  id,
  'trialing',
  now() + interval '21 days',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month - 1 day',
  now()
from public.subscription_plans
where code = 'clinic_pro'
on conflict (clinic_id) do update set
  plan_id = excluded.plan_id,
  status = excluded.status,
  trial_ends_at = excluded.trial_ends_at,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end;

insert into public.patient_invites (
  id,
  clinic_id,
  invite_code,
  invited_phone,
  invited_email,
  status,
  expires_at,
  accepted_by,
  created_at
)
values
  ('00000000-0000-0000-0000-000000000551', '00000000-0000-0000-0000-000000000100', 'DEMO2026', '0922000106', 'pending-patient@chengxin.health', 'pending', now() + interval '14 days', null, now()),
  ('00000000-0000-0000-0000-000000000552', '00000000-0000-0000-0000-000000000100', 'ACCEPT01', '0922000101', 'patient01@chengxin.health', 'accepted', now() + interval '14 days', '00000000-0000-0000-0000-000000000101', now() - interval '90 days')
on conflict (id) do update set
  invite_code = excluded.invite_code,
  invited_phone = excluded.invited_phone,
  invited_email = excluded.invited_email,
  status = excluded.status,
  expires_at = excluded.expires_at,
  accepted_by = excluded.accepted_by;

insert into public.consent_records (id, user_id, consent_type, version, accepted, accepted_at, metadata)
values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000101', 'privacy_policy', 'demo-2026-07', true, now() - interval '90 days', '{"source":"demo_seed"}'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000101', 'data_use', 'demo-2026-07', true, now() - interval '90 days', '{"source":"demo_seed"}'),
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000103', 'ai_assist', 'demo-2026-07', true, now() - interval '60 days', '{"source":"demo_seed"}')
on conflict (id) do update set
  accepted = excluded.accepted,
  accepted_at = excluded.accepted_at,
  metadata = excluded.metadata;

insert into public.health_assessments (
  id,
  patient_id,
  user_id,
  goal,
  height_cm,
  weight_kg,
  exercise_level,
  chronic_conditions,
  medications,
  answers,
  raw_answers,
  risk_flags,
  persona,
  recommended_path,
  ai_summary,
  completed_at,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', '減重與建立運動習慣', 162, 78.4, 'LOW', '無重大疾病史', '無', '{"goal":"weight_loss"}', '{"age":35,"goals":["weight_loss"],"exercise":"none"}', '[]', 'fitness_beginner', '低強度有氧、機械式肌力、飲食紀錄', '初學者，先建立每週三次低強度運動與蛋白質紀錄。', now() - interval '30 days', now() - interval '30 days', now()),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', '增肌與體脂控制', 176, 82.1, 'MEDIUM', '無重大疾病史', '無', '{"goal":"muscle_gain"}', '{"age":39,"goals":["muscle_gain"],"exercise":"regular_strength"}', '[]', 'gym_training', '健身房器材訓練、漸進式負荷、InBody 追蹤', '可安排健身房器材課表，持續追蹤骨骼肌量與體脂率。', now() - interval '28 days', now() - interval '28 days', now()),
  ('00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'GLP-1 減重與肌肉保留', 158, 88.6, 'LOW', '無重大疾病史', 'MOUNJARO', '{"goal":"glp1_weight_loss"}', '{"age":32,"goals":["weight_loss"],"medications":["GLP-1"],"exercise":"home"}', '[]', 'glp1_weight_loss', '蛋白質優先、步行、低噁心飲食與副作用紀錄', 'GLP-1 減重中，重點是蛋白質、肌肉保留與回診溝通紀錄。', now() - interval '21 days', now() - interval '21 days', now()),
  ('00000000-0000-0000-0000-000000001104', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000104', '控制血糖與體重', 170, 91.2, 'LOW', '糖尿病、高血壓', '降血糖藥、降血壓藥', '{"goal":"blood_sugar_control"}', '{"age":58,"goals":["blood_sugar_control"],"conditions":["diabetes","hypertension"]}', '[]', 'chronic_disease', '血壓/血糖安全提醒、低風險運動與飲食紀錄', '慢性病族群，所有飲食與運動調整請由醫師或營養師評估。', now() - interval '18 days', now() - interval '18 days', now()),
  ('00000000-0000-0000-0000-000000001105', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000105', '銀髮肌力與防跌', 152, 60.3, 'LOW', '膝蓋退化、近期跌倒', '高血壓藥', '{"goal":"senior_strength"}', '{"age":74,"goals":["senior_strength"],"limitations":["knee_pain","fall_history"]}', '["fall_history_over_70"]', 'senior_frailty', '坐站訓練、平衡訓練、低衝擊肌力', '銀髮肌力與平衡訓練，近期跌倒請先由醫師或專業人員評估。', now() - interval '16 days', now() - interval '16 days', now())
on conflict (id) do update set
  goal = excluded.goal,
  height_cm = excluded.height_cm,
  weight_kg = excluded.weight_kg,
  exercise_level = excluded.exercise_level,
  chronic_conditions = excluded.chronic_conditions,
  medications = excluded.medications,
  answers = excluded.answers,
  raw_answers = excluded.raw_answers,
  risk_flags = excluded.risk_flags,
  persona = excluded.persona,
  recommended_path = excluded.recommended_path,
  ai_summary = excluded.ai_summary,
  completed_at = excluded.completed_at,
  updated_at = now();

insert into public.assessment_answers (id, assessment_id, user_id, raw_answers, completed_at, created_at)
select
  ('00000000-0000-0000-0000-00000000210' || patient_index)::uuid,
  assessment_id,
  user_id,
  raw_answers,
  completed_at,
  completed_at
from (
  values
    (1, '00000000-0000-0000-0000-000000001101'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, '{"age":35,"goals":["weight_loss"],"equipment":["none"],"sleep_hours":6.5}'::jsonb, now() - interval '30 days'),
    (2, '00000000-0000-0000-0000-000000001102'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, '{"age":39,"goals":["muscle_gain"],"equipment":["gym"],"sleep_hours":7}'::jsonb, now() - interval '28 days'),
    (3, '00000000-0000-0000-0000-000000001103'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, '{"age":32,"goals":["weight_loss"],"medications":["MOUNJARO"],"sleep_hours":6}'::jsonb, now() - interval '21 days'),
    (4, '00000000-0000-0000-0000-000000001104'::uuid, '00000000-0000-0000-0000-000000000104'::uuid, '{"age":58,"conditions":["diabetes","hypertension"],"medications":["glucose","blood_pressure"]}'::jsonb, now() - interval '18 days'),
    (5, '00000000-0000-0000-0000-000000001105'::uuid, '00000000-0000-0000-0000-000000000105'::uuid, '{"age":74,"limitations":["fall_history","knee_pain"],"equipment":["chair"]}'::jsonb, now() - interval '16 days')
) as rows(patient_index, assessment_id, user_id, raw_answers, completed_at)
on conflict (id) do update set
  raw_answers = excluded.raw_answers,
  completed_at = excluded.completed_at;

insert into public.assessment_results (
  id,
  assessment_id,
  user_id,
  raw_answers,
  risk_flags,
  persona,
  recommended_path,
  needs_medical_review,
  safety_message,
  today_recommendations,
  completed_at,
  created_at
)
values
  ('00000000-0000-0000-0000-000000002201', '00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000101', '{"goal":"weight_loss"}', '[]', 'fitness_beginner', '低強度有氧、機械式肌力、飲食紀錄', false, '本系統不提供診斷，不自動調藥；醫療與藥物相關內容請由醫師評估。', '{"exercise":"步行 20 分鐘","nutrition":"記錄一餐蛋白質","medication":"無","visit":"下次回診前整理問題"}', now() - interval '30 days', now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000002202', '00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000102', '{"goal":"muscle_gain"}', '[]', 'gym_training', '健身房器材訓練、漸進式負荷、InBody 追蹤', false, '本系統不提供診斷，不自動調藥；醫療與藥物相關內容請由醫師評估。', '{"exercise":"下肢機械 3 組","nutrition":"蛋白質達標","medication":"無","visit":"帶 InBody 趨勢"}', now() - interval '28 days', now() - interval '28 days'),
  ('00000000-0000-0000-0000-000000002203', '00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000000103', '{"goal":"glp1_weight_loss"}', '[]', 'glp1_weight_loss', '蛋白質優先、步行、低噁心飲食與副作用紀錄', false, '本系統不提供診斷，不自動調藥；所有 GLP-1 相關內容請由醫師評估。', '{"exercise":"餐後散步 15 分鐘","nutrition":"少量多餐並補蛋白質","medication":"紀錄副作用","visit":"回診討論噁心狀況"}', now() - interval '21 days', now() - interval '21 days'),
  ('00000000-0000-0000-0000-000000002204', '00000000-0000-0000-0000-000000001104', '00000000-0000-0000-0000-000000000104', '{"goal":"blood_sugar_control"}', '[]', 'chronic_disease', '血壓/血糖安全提醒、低風險運動與飲食紀錄', false, '本系統不提供診斷，不自動調藥；糖尿病、高血壓與飲食調整請由醫師或營養師評估。', '{"exercise":"低衝擊有氧 15 分鐘","nutrition":"記錄碳水與飲料","medication":"按醫囑紀錄","visit":"帶血糖血壓紀錄"}', now() - interval '18 days', now() - interval '18 days'),
  ('00000000-0000-0000-0000-000000002205', '00000000-0000-0000-0000-000000001105', '00000000-0000-0000-0000-000000000105', '{"goal":"senior_strength"}', '["fall_history_over_70"]', 'senior_frailty', '坐站訓練、平衡訓練、低衝擊肌力', true, '系統暫不建議直接開始運動計畫，請先由醫師或專業人員評估。', '{"exercise":"坐站動作需有人陪同","nutrition":"補足蛋白質","medication":"請依醫囑","visit":"回診討論跌倒風險"}', now() - interval '16 days', now() - interval '16 days')
on conflict (id) do update set
  raw_answers = excluded.raw_answers,
  risk_flags = excluded.risk_flags,
  persona = excluded.persona,
  recommended_path = excluded.recommended_path,
  needs_medical_review = excluded.needs_medical_review,
  safety_message = excluded.safety_message,
  today_recommendations = excluded.today_recommendations,
  completed_at = excluded.completed_at;

insert into public.food_logs (
  id,
  user_id,
  meal_type,
  meal_name,
  calories_kcal,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  sodium_mg,
  source,
  note,
  eaten_at,
  created_at
)
values
  ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000000101', 'breakfast', '茶葉蛋、無糖豆漿、地瓜', 420, 26, 52, 11, 7, 680, 'manual', '早餐蛋白質不錯。', current_date + time '08:10', now()),
  ('00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000000101', 'lunch', '雞胸便當半飯', 610, 44, 68, 18, 8, 980, 'ai_photo', 'AI 估算後手動修正。', current_date + time '12:30', now()),
  ('00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000000102', 'lunch', '牛肉蔬菜餐盒', 720, 52, 62, 24, 9, 1050, 'manual', '訓練日前提高蛋白質。', (current_date - 1) + time '12:40', now()),
  ('00000000-0000-0000-0000-000000003104', '00000000-0000-0000-0000-000000000103', 'snack', '希臘優格與莓果', 260, 24, 24, 7, 4, 120, 'ai_photo', '噁心時可接受的小份量。', current_date + time '15:00', now()),
  ('00000000-0000-0000-0000-000000003105', '00000000-0000-0000-0000-000000000104', 'dinner', '滷雞腿、青菜、半碗飯', 590, 38, 54, 21, 6, 1180, 'manual', '糖尿病飲食請依醫師或營養師建議調整。', (current_date - 2) + time '18:20', now()),
  ('00000000-0000-0000-0000-000000003106', '00000000-0000-0000-0000-000000000105', 'breakfast', '鮭魚粥與豆腐', 390, 28, 43, 10, 3, 760, 'manual', '質地較軟，適合銀髮族。', (current_date - 4) + time '07:50', now())
on conflict (id) do update set
  meal_type = excluded.meal_type,
  meal_name = excluded.meal_name,
  calories_kcal = excluded.calories_kcal,
  protein_g = excluded.protein_g,
  carbs_g = excluded.carbs_g,
  fat_g = excluded.fat_g,
  fiber_g = excluded.fiber_g,
  sodium_mg = excluded.sodium_mg,
  source = excluded.source,
  note = excluded.note,
  eaten_at = excluded.eaten_at;

insert into public.food_photo_analyses (
  id,
  user_id,
  food_log_id,
  image_path,
  ai_raw_response,
  confidence_score,
  created_at
)
values
  ('00000000-0000-0000-0000-000000003201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000000101/demo/chicken-bento.jpg', '{"meal_name":"雞胸便當半飯","calories_kcal":610,"protein_g":44}', 0.82, now()),
  ('00000000-0000-0000-0000-000000003202', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000003104', '00000000-0000-0000-0000-000000000103/demo/yogurt.jpg', '{"meal_name":"希臘優格與莓果","calories_kcal":260,"protein_g":24}', 0.78, now())
on conflict (id) do update set
  ai_raw_response = excluded.ai_raw_response,
  confidence_score = excluded.confidence_score;

insert into public.inbody_records (
  id,
  user_id,
  measured_at,
  weight_kg,
  skeletal_muscle_kg,
  body_fat_mass_kg,
  body_fat_percentage,
  bmi,
  waist_hip_ratio,
  visceral_fat_area_cm2,
  basal_metabolic_rate_kcal,
  inbody_score,
  note,
  ai_summary,
  source,
  created_at
)
values
  ('00000000-0000-0000-0000-000000004101', '00000000-0000-0000-0000-000000000101', current_date - interval '35 days', 80.2, 24.8, 29.5, 36.8, 30.6, 0.91, 112, 1380, 62, '初次 InBody', '體重與體脂偏高，先追蹤趨勢。', 'manual', now()),
  ('00000000-0000-0000-0000-000000004102', '00000000-0000-0000-0000-000000000101', current_date - interval '5 days', 78.4, 25.1, 27.8, 35.5, 29.9, 0.89, 104, 1395, 65, '近期 InBody', '體重下降且骨骼肌略升。', 'ai_photo', now()),
  ('00000000-0000-0000-0000-000000004103', '00000000-0000-0000-0000-000000000102', current_date - interval '32 days', 83.0, 34.2, 18.6, 22.4, 26.8, 0.86, 82, 1720, 78, '初次 InBody', '肌肉量基礎佳，追蹤體脂率。', 'manual', now()),
  ('00000000-0000-0000-0000-000000004104', '00000000-0000-0000-0000-000000000102', current_date - interval '3 days', 82.1, 34.9, 17.4, 21.2, 26.5, 0.85, 76, 1740, 81, '近期 InBody', '骨骼肌上升，體脂下降。', 'ai_photo', now()),
  ('00000000-0000-0000-0000-000000004105', '00000000-0000-0000-0000-000000000103', current_date - interval '30 days', 91.0, 25.6, 39.8, 43.7, 36.5, 0.94, 145, 1370, 55, 'GLP-1 前紀錄', '開始 GLP-1 前建立基準值。', 'manual', now()),
  ('00000000-0000-0000-0000-000000004106', '00000000-0000-0000-0000-000000000103', current_date - interval '2 days', 88.6, 25.4, 37.1, 41.9, 35.5, 0.92, 136, 1365, 58, '近期 InBody', '體重下降，需注意肌肉保留與蛋白質。', 'ai_photo', now()),
  ('00000000-0000-0000-0000-000000004107', '00000000-0000-0000-0000-000000000104', current_date - interval '42 days', 92.4, 29.0, 31.9, 34.5, 31.9, 0.93, 128, 1540, 61, '初次 InBody', '慢性病照護中，先建立趨勢。', 'manual', now()),
  ('00000000-0000-0000-0000-000000004108', '00000000-0000-0000-0000-000000000104', current_date - interval '10 days', 91.2, 29.1, 31.0, 34.0, 31.5, 0.92, 124, 1542, 63, '近期 InBody', '變化緩慢，適合回診討論。', 'ai_photo', now()),
  ('00000000-0000-0000-0000-000000004109', '00000000-0000-0000-0000-000000000105', current_date - interval '55 days', 61.2, 18.1, 20.3, 33.2, 26.5, 0.88, 96, 1120, 58, '銀髮初次紀錄', '肌力與平衡為主要追蹤重點。', 'manual', now()),
  ('00000000-0000-0000-0000-000000004110', '00000000-0000-0000-0000-000000000105', current_date - interval '33 days', 60.3, 18.3, 19.7, 32.7, 26.1, 0.87, 94, 1125, 60, '超過 30 天未更新', '建議安排下一次 InBody 追蹤。', 'ai_photo', now())
on conflict (id) do update set
  measured_at = excluded.measured_at,
  weight_kg = excluded.weight_kg,
  skeletal_muscle_kg = excluded.skeletal_muscle_kg,
  body_fat_mass_kg = excluded.body_fat_mass_kg,
  body_fat_percentage = excluded.body_fat_percentage,
  bmi = excluded.bmi,
  waist_hip_ratio = excluded.waist_hip_ratio,
  visceral_fat_area_cm2 = excluded.visceral_fat_area_cm2,
  basal_metabolic_rate_kcal = excluded.basal_metabolic_rate_kcal,
  inbody_score = excluded.inbody_score,
  note = excluded.note,
  ai_summary = excluded.ai_summary,
  source = excluded.source;

insert into public.inbody_scan_analyses (
  id,
  user_id,
  inbody_record_id,
  image_path,
  ai_raw_response,
  confidence_score,
  created_at
)
values
  ('00000000-0000-0000-0000-000000004201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000004102', '00000000-0000-0000-0000-000000000101/demo/inbody-2026-07.jpg', '{"weight_kg":78.4,"body_fat_percentage":35.5}', 0.84, now()),
  ('00000000-0000-0000-0000-000000004202', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000004106', '00000000-0000-0000-0000-000000000103/demo/inbody-2026-07.jpg', '{"weight_kg":88.6,"body_fat_percentage":41.9}', 0.8, now())
on conflict (id) do update set
  ai_raw_response = excluded.ai_raw_response,
  confidence_score = excluded.confidence_score;

insert into public.training_logs (
  id,
  patient_id,
  trained_on,
  activity_type,
  duration_minutes,
  intensity,
  notes,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000004301', '00000000-0000-0000-0000-000000000101', current_date - 1, '步行與機械腿推', 35, 'LOW', 'RPE 5，無不適。', now(), now()),
  ('00000000-0000-0000-0000-000000004302', '00000000-0000-0000-0000-000000000102', current_date - 2, '健身房全身重訓', 65, 'MEDIUM', '深蹲、划船、推胸。', now(), now()),
  ('00000000-0000-0000-0000-000000004303', '00000000-0000-0000-0000-000000000103', current_date - 1, '餐後散步', 22, 'LOW', '噁心較明顯，改低強度。', now(), now()),
  ('00000000-0000-0000-0000-000000004304', '00000000-0000-0000-0000-000000000105', current_date - 5, '坐站與平衡訓練', 18, 'LOW', '家人陪同，無跌倒。', now(), now())
on conflict (id) do update set
  trained_on = excluded.trained_on,
  activity_type = excluded.activity_type,
  duration_minutes = excluded.duration_minutes,
  intensity = excluded.intensity,
  notes = excluded.notes,
  updated_at = now();

insert into public.glp1_medication_logs (
  id,
  patient_id,
  user_id,
  medication_name,
  dose_label,
  dose_mg,
  injection_date,
  next_injection_date,
  injection_method,
  injection_site,
  lot_number,
  note,
  physician_supervised,
  notes,
  safety_notice,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'MOUNJARO', '2.5 mg weekly', 2.5, current_date - 13, current_date - 6, 'clinic', 'abdomen', 'MJ-DEMO-001', '第 1 針，診所施打。', true, '第 1 針，診所施打。', '不提供診斷，不自動調整劑量；請由醫師評估。', now() - interval '13 days', now()),
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'MOUNJARO', '2.5 mg weekly', 2.5, current_date - 6, current_date + 1, 'self', 'thigh', 'MJ-DEMO-002', '第 2 針，自行施打，噁心較明顯。', true, '第 2 針，自行施打，噁心較明顯。', '不提供診斷，不自動調整劑量；請由醫師評估。', now() - interval '6 days', now()),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000104', 'OZEMPIC', '0.25 mg weekly', 0.25, current_date - 8, current_date - 1, 'clinic', 'abdomen', 'OZ-DEMO-001', '由醫師評估後紀錄。', true, '由醫師評估後紀錄。', '不提供診斷，不自動調整劑量；請由醫師評估。', now() - interval '8 days', now())
on conflict (id) do update set
  medication_name = excluded.medication_name,
  dose_label = excluded.dose_label,
  dose_mg = excluded.dose_mg,
  injection_date = excluded.injection_date,
  next_injection_date = excluded.next_injection_date,
  injection_method = excluded.injection_method,
  injection_site = excluded.injection_site,
  lot_number = excluded.lot_number,
  note = excluded.note,
  physician_supervised = excluded.physician_supervised,
  notes = excluded.notes,
  safety_notice = excluded.safety_notice,
  updated_at = now();

insert into public.glp1_side_effect_logs (
  id,
  user_id,
  medication_log_id,
  nausea_score,
  vomiting,
  constipation_score,
  diarrhea_score,
  appetite_score,
  dizziness,
  hypoglycemia_feeling,
  abdominal_pain_score,
  dehydration_concern,
  note,
  created_at
)
values
  ('00000000-0000-0000-0000-000000005201', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000005101', 4, false, 3, 0, 5, false, false, 2, false, '輕微噁心，仍可進食。', now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000005102', 8, true, 5, 1, 2, true, false, 4, true, '噁心與嘔吐偏高，建議回診與醫師討論。', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000005203', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000005103', 2, false, 4, 0, 6, false, false, 1, false, '慢性病與用藥請由醫師評估。', now() - interval '7 days')
on conflict (id) do update set
  nausea_score = excluded.nausea_score,
  vomiting = excluded.vomiting,
  constipation_score = excluded.constipation_score,
  diarrhea_score = excluded.diarrhea_score,
  appetite_score = excluded.appetite_score,
  dizziness = excluded.dizziness,
  hypoglycemia_feeling = excluded.hypoglycemia_feeling,
  abdominal_pain_score = excluded.abdominal_pain_score,
  dehydration_concern = excluded.dehydration_concern,
  note = excluded.note,
  created_at = excluded.created_at;

insert into public.appointments (
  id,
  user_id,
  clinic_id,
  reason,
  preferred_date,
  preferred_time_slot,
  status,
  staff_note,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000006101', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000100', 'GLP-1 副作用偏高，想提前回診', current_date + 2, 'afternoon', 'pending', '請個管師優先聯絡。', now() - interval '1 day', now()),
  ('00000000-0000-0000-0000-000000006102', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000100', '月度體重與 InBody 回診', current_date + 5, 'morning', 'confirmed', '已確認 10:30。', now() - interval '3 days', now()),
  ('00000000-0000-0000-0000-000000006103', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000100', '血糖與飲食紀錄討論', current_date + 8, 'flexible', 'pending', null, now() - interval '2 days', now()),
  ('00000000-0000-0000-0000-000000006104', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000100', '訓練課表與體脂追蹤', current_date - 7, 'evening', 'completed', '已完成回診。', now() - interval '14 days', now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000006105', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000100', '跌倒風險與運動評估', current_date - 1, 'afternoon', 'canceled', '家屬改期。', now() - interval '9 days', now() - interval '2 days')
on conflict (id) do update set
  reason = excluded.reason,
  preferred_date = excluded.preferred_date,
  preferred_time_slot = excluded.preferred_time_slot,
  status = excluded.status,
  staff_note = excluded.staff_note,
  updated_at = now();

insert into public.reminder_events (
  id,
  user_id,
  clinic_id,
  reminder_type,
  severity,
  title,
  message,
  status,
  source,
  created_at,
  resolved_at
)
values
  ('00000000-0000-0000-0000-000000006201', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000100', 'glp1_due_soon', 'medium', 'GLP-1 下次施打日接近', '距離下次預計施打日 <= 1 天；所有用藥相關內容請由醫師評估。', 'open', 'demo_rule', now() - interval '3 hours', null),
  ('00000000-0000-0000-0000-000000006202', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000100', 'high_side_effect_alert', 'high', '副作用偏高', '噁心、嘔吐或脫水疑慮偏高，建議回診與醫師討論；嚴重不適請立即就醫或聯絡醫療人員。', 'open', 'demo_rule', now() - interval '2 hours', null),
  ('00000000-0000-0000-0000-000000006203', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000100', 'inbody_stale', 'low', 'InBody 超過 30 天未更新', '建議安排下一次 InBody 追蹤，請由診所人員評估。', 'open', 'demo_rule', now() - interval '1 day', null),
  ('00000000-0000-0000-0000-000000006204', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000100', 'food_missing', 'medium', '3 天未飲食紀錄', '近期飲食資料不足，請提醒病人補記錄以利回診溝通。', 'open', 'demo_rule', now() - interval '1 day', null),
  ('00000000-0000-0000-0000-000000006205', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000100', 'weight_plateau', 'low', '體重 14 天停滯', '趨勢可作為回診溝通輔助，不代表診斷或治療建議。', 'dismissed', 'demo_rule', now() - interval '4 days', now() - interval '2 days')
on conflict (id) do update set
  reminder_type = excluded.reminder_type,
  severity = excluded.severity,
  title = excluded.title,
  message = excluded.message,
  status = excluded.status,
  source = excluded.source,
  created_at = excluded.created_at,
  resolved_at = excluded.resolved_at;

insert into public.notification_logs (
  id,
  user_id,
  clinic_id,
  channel,
  title,
  message,
  status,
  provider_response,
  created_at
)
values
  ('00000000-0000-0000-0000-000000006301', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000100', 'in_app', 'Demo 提醒', '副作用偏高，請由醫師或診所人員評估。', 'sent', '{"provider":"demo"}', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000006302', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000100', 'email', '回診提醒 Demo', '這是 demo skeleton，尚未串正式 email provider。', 'pending', '{"provider":"demo_skeleton"}', now() - interval '1 day')
on conflict (id) do update set
  status = excluded.status,
  provider_response = excluded.provider_response,
  created_at = excluded.created_at;

insert into public.engagement_metrics (
  id,
  user_id,
  metric_date,
  login_count,
  food_logged,
  workout_logged,
  weight_logged,
  medication_logged,
  inbody_uploaded,
  adherence_score,
  created_at
)
values
  ('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-000000000101', current_date, 1, true, true, false, false, false, 82, now()),
  ('00000000-0000-0000-0000-000000007102', '00000000-0000-0000-0000-000000000102', current_date - 1, 1, true, true, false, false, true, 88, now()),
  ('00000000-0000-0000-0000-000000007103', '00000000-0000-0000-0000-000000000103', current_date, 2, true, true, false, true, true, 76, now()),
  ('00000000-0000-0000-0000-000000007104', '00000000-0000-0000-0000-000000000104', current_date - 4, 0, false, false, false, true, false, 44, now()),
  ('00000000-0000-0000-0000-000000007105', '00000000-0000-0000-0000-000000000105', current_date - 8, 0, false, false, false, false, false, 31, now())
on conflict (user_id, metric_date) do update set
  login_count = excluded.login_count,
  food_logged = excluded.food_logged,
  workout_logged = excluded.workout_logged,
  weight_logged = excluded.weight_logged,
  medication_logged = excluded.medication_logged,
  inbody_uploaded = excluded.inbody_uploaded,
  adherence_score = excluded.adherence_score;

insert into public.clinic_visit_reports (
  id,
  patient_id,
  generated_by,
  report_period_start,
  report_period_end,
  ai_summary,
  plain_text_summary,
  created_at
)
values
  ('00000000-0000-0000-0000-000000007201', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002', current_date - 30, current_date, '{"weight_change":"-2.4 kg","side_effects":"噁心與嘔吐偏高","doctor_attention":"劑量與副作用請由醫師評估"}', '近 30 天體重下降 2.4 kg，蛋白質紀錄仍需加強。副作用偏高，回診時請醫師評估。', now() - interval '1 day')
on conflict (id) do update set
  ai_summary = excluded.ai_summary,
  plain_text_summary = excluded.plain_text_summary,
  created_at = excluded.created_at;

insert into public.audit_logs (
  id,
  clinic_id,
  actor_user_id,
  target_user_id,
  action,
  resource_type,
  resource_id,
  metadata,
  ip_address,
  user_agent,
  created_at
)
values
  ('00000000-0000-0000-0000-000000008101', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000103', 'patient.view', 'patient', '00000000-0000-0000-0000-000000000103', '{"page":"clinic_patient_detail","demo":true}', '127.0.0.1', 'Demo seed', now() - interval '6 hours'),
  ('00000000-0000-0000-0000-000000008102', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000103', 'visit_report.generate', 'clinic_visit_report', '00000000-0000-0000-0000-000000007201', '{"period_days":30,"persisted":true}', '127.0.0.1', 'Demo seed', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000008103', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'glp1_log.create', 'glp1_medication_log', '00000000-0000-0000-0000-000000005102', '{"medication":"MOUNJARO","dose_mg":2.5}', '127.0.0.1', 'Demo seed', now() - interval '6 days'),
  ('00000000-0000-0000-0000-000000008104', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'glp1_side_effect.create', 'glp1_side_effect_log', '00000000-0000-0000-0000-000000005202', '{"high_side_effect_alert":true}', '127.0.0.1', 'Demo seed', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000008105', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', null, 'clinic_settings.update', 'clinic', '00000000-0000-0000-0000-000000000100', '{"primary_color":"#0f766e"}', '127.0.0.1', 'Demo seed', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000008106', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000103', 'appointment.update', 'appointment', '00000000-0000-0000-0000-000000006101', '{"status":"pending","staff_note":"請優先聯絡"}', '127.0.0.1', 'Demo seed', now() - interval '12 hours')
on conflict (id) do update set
  action = excluded.action,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.usage_counters (
  id,
  clinic_id,
  period_start,
  period_end,
  ai_food_analysis_count,
  ai_inbody_analysis_count,
  ai_visit_report_count,
  active_patient_count,
  staff_count,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000009101',
  '00000000-0000-0000-0000-000000000100',
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
  18,
  7,
  3,
  5,
  3,
  now(),
  now()
)
on conflict (clinic_id, period_start, period_end) do update set
  ai_food_analysis_count = excluded.ai_food_analysis_count,
  ai_inbody_analysis_count = excluded.ai_inbody_analysis_count,
  ai_visit_report_count = excluded.ai_visit_report_count,
  active_patient_count = excluded.active_patient_count,
  staff_count = excluded.staff_count,
  updated_at = now();
