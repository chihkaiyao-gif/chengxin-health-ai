# Supabase Staging Setup

本文件說明 Chengxin Health AI 在 Supabase staging project 的資料庫、seed、storage 與 RLS 設定流程。

## 1. 前置需求

- 安裝 Supabase CLI。
- 具備 staging Supabase project 的 Owner 或 Admin 權限。
- 確認本機 `.env` 或 shell 已設定 staging project 相關 key。
- staging 與 production 必須使用不同 Supabase project。

## 2. 連線 Staging Project

```bash
supabase login
supabase link --project-ref <your-staging-project-ref>
```

確認目前連線的 project：

```bash
supabase status
```

## 3. 套用 Migrations

建議 staging 使用完整 migration 流程：

```bash
supabase db push
```

若需要逐筆套用 migration，可使用：

```bash
supabase migration up
```

套用後請確認資料表：

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

至少需包含：

- `profiles`
- `clinics`
- `clinic_members`
- `clinic_patients`
- `health_assessments`
- `assessment_answers`
- `assessment_results`
- `food_logs`
- `food_photo_analyses`
- `inbody_records`
- `inbody_scan_analyses`
- `glp1_medication_logs`
- `glp1_side_effect_logs`
- `appointments`
- `reminder_events`
- `notification_logs`
- `clinic_visit_reports`
- `engagement_metrics`
- `daily_tasks`
- `streaks`
- `badges`
- `user_badges`
- `feedback`
- `pilot_cohorts`
- `pilot_cohort_members`
- `audit_logs`
- `usage_counters`
- `ai_cache`

## 4. 執行 Seed Data

在 staging project 執行：

```bash
supabase db reset --linked
```

若不想 reset，可使用 SQL editor 或 psql 執行：

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

執行後檢查：

```sql
select name, slug, status from public.clinics;
select count(*) from public.clinic_patients;
select count(*) from public.food_logs;
select count(*) from public.inbody_records;
select count(*) from public.glp1_medication_logs;
```

注意：`seed.sql` 僅供 demo / staging，production 不應直接放入假資料。

## 5. 建立 Storage Buckets

在 Supabase Dashboard 建立：

- `meal-photos`：private
- `inbody-scans`：private
- `public-assets`：optional，未來若要把品牌素材放在 Supabase 時再建立

也可使用 SQL / CLI 建立 bucket，但 staging 初期建議在 Dashboard 確認設定：

```sql
select id, name, public
from storage.buckets
where id in ('meal-photos', 'inbody-scans', 'public-assets');
```

## 6. 確認 Storage Policies

檢查 storage policies：

```sql
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
```

檢查重點：

- 病人只能上傳自己的餐點與 InBody 圖片。
- 病人只能讀取自己的圖片。
- 診所人員讀取圖片時，必須透過 `clinic_patients` 關聯授權。
- secret key 可由 server-side API 進行必要的存取。
- 不允許匿名公開讀取健康照片。

## 7. 確認 RLS

確認所有敏感資料表已啟用 RLS：

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

檢查 policies：

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

RLS 測試建議：

- 使用病人 A token 讀取病人 A 的 `food_logs`，應成功。
- 使用病人 A token 讀取病人 B 的 `food_logs`，應失敗或回空集合。
- 使用 clinic_staff token 讀取非所屬診所病人，應失敗或回空集合。
- 使用 owner / doctor token 讀取所屬診所 audit logs，應成功。
- 使用 viewer token 更新診所設定，應失敗。

## 8. Auth Redirect URLs

在 Supabase Dashboard 設定：

Site URL：

```text
https://staging.chengxin.health
```

Redirect URLs：

```text
https://staging.chengxin.health/auth/callback
https://*.vercel.app/auth/callback
http://127.0.0.1:3001/auth/callback
```

本機 URL 只保留給開發測試，production project 不應保留不必要的 redirect domain。

## 9. Staging Health Check

部署後開啟：

```text
https://staging.chengxin.health/api/health
```

期待結果：

```json
{
  "demoMode": false,
  "supabaseConfigured": true,
  "aiProvider": "openai",
  "aiConfigured": true,
  "openaiConfigured": true,
  "storageBucketsConfigured": true,
  "requiredEnvMissing": [],
  "appVersion": "0.1.0"
}
```

若 `requiredEnvMissing` 不為空，不要開放測試病人使用。

## 10. 常見問題

### `supabase db push` 失敗

- 確認已 `supabase link` 到 staging project。
- 確認 migration 檔案順序沒有衝突。
- 確認 staging DB 沒有手動改過與 migration 衝突的 schema。

### Seed 資料重複

- staging demo 可使用 `supabase db reset --linked` 重建。
- 若不 reset，請檢查 `seed.sql` 是否使用固定 ID 與 `on conflict`。

### Storage 上傳失敗

- 檢查 bucket 是否存在。
- 檢查 bucket 是否 private。
- 檢查 storage policy 是否允許 authenticated user insert。
- 檢查 API route 是否使用正確的 bucket env。

### RLS 看不到資料

- 確認 auth user id 與 `profiles.user_id` 或健康資料 `user_id` 一致。
- 確認診所人員有 `clinic_members` active 關聯。
- 確認病人有 `clinic_patients` active 關聯。
