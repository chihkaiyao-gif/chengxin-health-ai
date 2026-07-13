# Chengxin Health AI Deployment Guide

This guide prepares the app for Vercel + Supabase staging, then production.

## Staging 實際部署步驟

### 0. 本機上線前檢查

先在本機確認可建置：

```bash
npm install
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run smoke
```

`npm run verify-staging` 預設會檢查 `http://127.0.0.1:3001`。若要檢查遠端 staging，請帶入 staging 網址：

```bash
STAGING_BASE_URL=https://your-staging-domain.vercel.app npm run verify-staging
```

指向非 localhost 時，`verify-staging` 會自動啟用嚴格檢查，要求：

- `NEXT_PUBLIC_DEMO_MODE=false`
- Supabase URL / publishable key / secret key 完整
- `AI_PROVIDER`、對應 provider API key 與 `OPENAI_MODEL` 完整
- Storage bucket 設定完整
- `/api/health` 回傳 `status:"ok"`

### 1. 建立 Supabase Staging Project

1. 在 Supabase 建立 staging project。
2. 記下 Project URL、publishable key、secret key。
3. 本機安裝並登入 Supabase CLI。
4. 連結 staging project：

```bash
supabase link --project-ref <your-staging-project-ref>
```

5. 套用 migrations：

```bash
supabase db push
```

本專案已加入 `supabase/migrations/20260707_initial_schema.sql` 作為 baseline，因此空資料庫可直接依 migrations 順序套用，不需要先手動貼 `supabase/schema.sql`。

### 2. 套用 Demo Seed Data

Staging 可套用 demo seed，production 不可套用。

```bash
supabase db reset --linked
```

或使用 psql 對 staging database 執行：

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Seed 檔只應在所有 migrations 完成後執行。

### 3. 確認 Storage Buckets

程式與 migrations 使用的 bucket 名稱如下：

| 用途 | Bucket | Env |
| --- | --- | --- |
| 飲食照片 | `meal-photos` | `SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET` |
| InBody 掃描 | `inbody-scans` | `SUPABASE_STORAGE_INBODY_SCANS_BUCKET` |
| 未來品牌公開素材 | `public-assets` | optional |

`meal-photos` 與 `inbody-scans` 會由 migrations 建立為 private bucket。若 staging 改用其他 bucket 名稱，必須同步更新 Vercel env 與 storage policy。

### 4. 設定 Supabase Auth Redirect URLs

在 Supabase Dashboard → Authentication → URL Configuration 設定：

Site URL:

```text
https://your-staging-domain.vercel.app
```

Redirect URLs:

```text
http://localhost:3001/auth/callback
https://your-staging-domain.vercel.app/auth/callback
https://staging.chengxin.health/auth/callback
https://app.chengxin.health/auth/callback
```

如果未來使用 Vercel preview URL，可依 Supabase 官方文件加入對應 wildcard redirect pattern。

### 5. 建立 Vercel Staging Deployment

1. 在 Vercel 匯入 GitHub repo。
2. Framework Preset 選 Next.js。
3. Build command 使用：

```text
npm run build
```

4. Output directory 使用：

```text
.next
```

5. 在 Vercel Project Settings → Environment Variables 設定 staging 變數。

必要 staging env：

```env
APP_MODE=staging
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://your-staging-domain.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-staging-publishable-key
SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET=meal-photos
SUPABASE_STORAGE_INBODY_SCANS_BUCKET=inbody-scans
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_FALLBACK_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT_FOOD=low
OPENAI_REASONING_EFFORT_INBODY=low
OPENAI_REASONING_EFFORT_COACH=medium
OPENAI_REASONING_EFFORT_VISIT_REPORT=medium
```

選用 env：

```env
NEXT_PUBLIC_APP_VERSION=0.1.0
SUPABASE_SECRET_KEY=sb_secret_optional-ai-cache-key
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
EMAIL_PROVIDER=
RESEND_API_KEY=
SENDGRID_API_KEY=
SMS_PROVIDER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENTRY_DSN=
```

Vercel env 更新後必須重新部署，新的 deployment 才會讀到最新變數。

### 6. Staging 驗證

部署完成後執行：

```bash
STAGING_BASE_URL=https://your-staging-domain.vercel.app npm run verify-staging
SMOKE_BASE_URL=https://your-staging-domain.vercel.app npm run smoke
```

也請直接開：

```text
https://your-staging-domain.vercel.app/api/health
```

應確認：

- `demoMode:false`
- `supabaseConfigured:true`
- `supabasePublishableKeyConfigured:true`
- `environment:"staging"`
- `supabaseAdminConfigured:true` only when the optional admin capability is enabled
- `aiProviderConfigured:true`
- `openaiModelConfigured:true`
- `openaiFallbackConfigured:true`
- `storageBucketsConfigured:true`
- `requiredConfigurationMissing:false`
- `status:"ok"`

### 7. Staging Rollback

若 staging deployment 發現問題：

1. 在 Vercel 回復上一個正常 deployment。
2. 不要對 production 執行 `seed.sql`。
3. 若 database migration 已套用但需修正，新增下一個 migration，不要直接改已上線的 migration 檔。

## Environment Profiles

### Local Demo

Use local demo when presenting the UI without a real Supabase project.

Required:

```env
APP_MODE=demo
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_DEMO_MODE=true
AI_PROVIDER=demo
```

Optional OpenAI testing in demo mode:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-test-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_FALLBACK_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT_FOOD=low
OPENAI_REASONING_EFFORT_INBODY=low
OPENAI_REASONING_EFFORT_COACH=medium
OPENAI_REASONING_EFFORT_VISIT_REPORT=medium
SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET=meal-photos
SUPABASE_STORAGE_INBODY_SCANS_BUCKET=inbody-scans
```

Behavior:

- Demo fallback is allowed.
- APIs may return `persisted:false`.
- Testers should see the Demo Mode banner.
- All write APIs return `persisted:false`, even if Supabase credentials are present.

### Staging

Use staging for clinic team QA and investor demos with realistic data isolation.

Required:

```env
APP_MODE=staging
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.chengxin.health
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-staging-publishable-key
SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET=meal-photos
SUPABASE_STORAGE_INBODY_SCANS_BUCKET=inbody-scans
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_FALLBACK_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT_FOOD=low
OPENAI_REASONING_EFFORT_INBODY=low
OPENAI_REASONING_EFFORT_COACH=medium
OPENAI_REASONING_EFFORT_VISIT_REPORT=medium
```

Optional:

```env
SUPABASE_SECRET_KEY=sb_secret_optional-ai-cache-key
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
EMAIL_PROVIDER=
RESEND_API_KEY=
SENDGRID_API_KEY=
SMS_PROVIDER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENTRY_DSN=
```

Behavior:

- Supabase is required.
- Missing Supabase env must fail loudly and must not use demo fallback.
- Seed data may be loaded from `supabase/seed.sql`.
- Demo accounts are acceptable in staging only.

### Production

Use production only after staging QA passes.

Required:

```env
APP_MODE=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://app.chengxin.health
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-production-publishable-key
SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET=meal-photos
SUPABASE_STORAGE_INBODY_SCANS_BUCKET=inbody-scans
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_FALLBACK_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT_FOOD=low
OPENAI_REASONING_EFFORT_INBODY=low
OPENAI_REASONING_EFFORT_COACH=medium
OPENAI_REASONING_EFFORT_VISIT_REPORT=medium
```

Recommended:

```env
SUPABASE_SECRET_KEY=sb_secret_optional-ai-cache-key
SENTRY_DSN=
LOG_LEVEL=info
LINE_CHANNEL_ACCESS_TOKEN=
EMAIL_PROVIDER=
SMS_PROVIDER=
```

Behavior:

- Demo Mode must be `false`.
- Do not run `supabase/seed.sql` against production.
- Missing Supabase env is a launch blocker.
- Missing `OPENAI_MODEL` is a launch blocker when `AI_PROVIDER=openai`.
- Production must keep privacy policy, terms, and medical disclaimer links available.

## OpenAI API Model And Billing Notes

- `OPENAI_MODEL` controls the primary OpenAI model. Staging recommendation: `gpt-5.6-terra`.
- `OPENAI_FALLBACK_MODEL` keeps the previous stable model available for retryable model availability, rate limit, 5xx, or network errors. Recommended fallback: `gpt-5.5`.
- `gpt-5.6` is an alias for `gpt-5.6-sol`.
- GPT-5.6 API pricing: `gpt-5.6-sol` / `gpt-5.6` input US$5 per 1M tokens and output US$30 per 1M tokens; `gpt-5.6-terra` input US$2.50 and output US$15 per 1M tokens; `gpt-5.6-luna` input US$1 and output US$6 per 1M tokens.
- ChatGPT and Codex subscriptions do not include OpenAI API usage. API billing, limits, and keys are managed separately in the OpenAI API dashboard.
- Public health checks intentionally return only boolean OpenAI configuration status and must not expose model names or API keys.

## Demo Mode Switch

The server follows this rule:

- `APP_MODE=demo`: every write path is forced non-persistent, even if Supabase credentials exist.
- `APP_MODE=staging` or `APP_MODE=production`: Supabase and OpenAI configuration must be present; missing configuration fails explicitly.
- `NEXT_PUBLIC_DEMO_MODE` remains only a legacy UI/banner compatibility flag. Explicit deployment mode always wins.
- Non-demo environments support only `AI_PROVIDER=openai`; unimplemented providers fail safely.

Use `/api/health` to verify the active mode:

```json
{
  "data": {
    "status": "ok",
    "environment": "staging",
    "demoMode": false,
    "supabaseConfigured": true,
    "supabasePublishableKeyConfigured": true,
    "supabaseAdminConfigured": false,
    "aiProviderConfigured": true,
    "openaiModelConfigured": true,
    "openaiFallbackConfigured": true,
    "storageBucketsConfigured": true,
    "requiredConfigurationMissing": false,
    "appVersion": "0.1.0"
  }
}
```

## Supabase Setup Guide

### 1. Create Project

1. Create a new Supabase project for staging.
2. Save the project URL, publishable key, and secret key.
3. Add those values to Vercel staging environment variables.

### 2. Run Schema And Migrations

Run all migrations in order:

```bash
supabase db push
```

`supabase/schema.sql` is a reference snapshot. Staging and production should use `supabase/migrations/` as the source of truth.

### 3. Seed Staging Demo Data

For staging only:

```bash
supabase db reset --linked
```

or run:

```sql
\i supabase/seed.sql
```

Demo account details are documented in `docs/demo-accounts.md`.

### 4. Create Storage Buckets

Create private buckets:

- `meal-photos`
- `inbody-scans`
- `public-assets` if clinic logos or public brand images are stored in Supabase

The migration files create `meal-photos` and `inbody-scans` by default. If bucket names differ, update:

```env
SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET=
SUPABASE_STORAGE_INBODY_SCANS_BUCKET=
```

and keep RLS/storage policies in sync.

### 5. RLS Review

Before staging QA:

- Confirm RLS is enabled on health tables.
- Confirm patients can only read/write their own records.
- Confirm clinic members can only access linked clinic patients.
- Confirm owner / doctor can view audit logs.
- Confirm storage policies restrict access by user folder and care team access.

### 6. Auth Redirect URLs

In Supabase Auth settings, add:

```text
http://localhost:3001/auth/callback
https://staging.chengxin.health/auth/callback
https://app.chengxin.health/auth/callback
```

Also configure Site URL:

```text
https://staging.chengxin.health
```

for staging, and production domain after launch.

## Vercel Deployment Guide

### 1. Connect GitHub Repo

1. Push the repo to GitHub.
2. In Vercel, import the GitHub repository.
3. Select the Next.js framework preset.

### 2. Environment Variables

Add the staging variables from this document in Vercel:

- Project Settings
- Environment Variables
- Select Preview and Production values separately

Do not expose `SUPABASE_SECRET_KEY` to client code.

### 3. Build Settings

Use:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: .next
Development Command: npm run dev
```

### 4. Preview Deployment

Every pull request should create a Vercel Preview deployment.

Required checks:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
SMOKE_BASE_URL=https://your-preview-url.vercel.app npm run smoke
```

Then open:

```text
https://your-preview-url.vercel.app/api/health
```

### 5. Production Deployment

Before promoting to production:

- Confirm staging QA passed.
- Confirm `NEXT_PUBLIC_DEMO_MODE=false`.
- Confirm `/api/health` returns `status:"ok"`.
- Confirm Supabase RLS and Storage policies were reviewed.
- Confirm privacy policy, terms, and medical disclaimer are ready.

### 6. Domain Settings

Recommended:

- Staging: `staging.chengxin.health`
- Production: `app.chengxin.health`

Configure DNS in Vercel and update Supabase Auth redirect URLs after the domain is active.

## Health Check

Endpoint:

```text
GET /api/health
```

Fields:

- `status`: `ok` or `misconfigured`
- `environment`: server-authoritative app mode
- `demoMode`: whether writes are forced non-persistent
- `supabaseConfigured`: URL and publishable key present
- `supabasePublishableKeyConfigured`: publishable key present
- `supabaseAdminConfigured`: optional admin capability available
- `aiProviderConfigured`: allowed provider and key are configured
- `openaiModelConfigured`: `OPENAI_MODEL` present
- `openaiFallbackConfigured`: `OPENAI_FALLBACK_MODEL` present
- `storageBucketsConfigured`: required storage bucket names available
- `storageConfigured`: storage capability configured
- `appVersion`: app version
- `requiredConfigurationMissing`: whether launch-blocking configuration is missing

Use this endpoint for Vercel post-deploy checks and staging smoke tests.

## Production Safety Notes

- Service worker must not cache sensitive API responses or authenticated navigation HTML.
- Logout must purge all app caches so a shared browser cannot show the previous user's private page.
- Do not store sensitive health records in localStorage.
- All images and health records must use Supabase Storage / Postgres permissions.
- AI output is for records, reminders, trend analysis, and visit communication support only.
- The system does not diagnose and does not automatically adjust medication.
- Medication-related guidance must keep `請由醫師評估`.
