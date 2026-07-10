# Chengxin Health AI Staging Checklist

此清單用於把 Chengxin Health AI 部署到 Vercel + Supabase staging，供診所內部人員與少量測試病人使用。Staging 不應使用正式病人資料，除非已完成授權、同意與資料保護檢查。

## 1. Supabase Staging Project

- [ ] 建立獨立 Supabase staging project，不與 production 共用資料庫。
- [ ] 確認 project region、名稱與團隊權限。
- [ ] 複製 staging 專用 `NEXT_PUBLIC_SUPABASE_URL`。
- [ ] 複製 staging 專用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
- [ ] 建立 staging 專用 `SUPABASE_SECRET_KEY`，只放在 Vercel server env。

## 2. Database Migrations

- [ ] 安裝並登入 Supabase CLI。
- [ ] 連線到 staging project。
- [ ] 套用所有 `supabase/migrations`。
- [ ] 確認下列表存在：`profiles`、`health_assessments`、`food_logs`、`inbody_records`、`glp1_medication_logs`、`appointments`、`reminder_events`、`clinic_visit_reports`、`audit_logs`、`ai_cache`。
- [ ] 確認 enum / check constraint 可接受現有 demo seed 狀態。

## 3. Seed Data

- [ ] 執行 `supabase/seed.sql`。
- [ ] 確認 demo 診所、診所成員與 5 位 demo patients 已建立。
- [ ] 確認 demo patients 有健康評估、飲食、InBody、GLP-1、預約、提醒、操作紀錄與用量資料。
- [ ] 若 staging 會給真實測試者使用，先移除不需要的假電話或假個資。

## 4. Storage Buckets

- [ ] 建立 `meal-photos` bucket。
- [ ] 建立 `inbody-scans` bucket。
- [ ] 若未來需要公開品牌素材，建立 `public-assets` bucket。
- [ ] 確認病人照片 bucket 為 private。
- [ ] 確認 storage policies 僅允許本人或授權診所人員讀取。
- [ ] 測試病人上傳餐點照片。
- [ ] 測試病人上傳 InBody 圖片。

## 5. RLS

- [ ] 確認所有健康資料表已啟用 RLS。
- [ ] 病人只能讀寫自己的健康資料。
- [ ] 診所人員只能讀取所屬診所關聯病人的資料。
- [ ] owner / doctor 可查看 audit logs。
- [ ] viewer 只能唯讀，不可更新診所設定或病人資料。
- [ ] secret key 只用於 server-side job、AI cache、seed 或管理流程。

## 6. Supabase Auth

- [ ] 設定 Site URL：`https://staging.chengxin.health` 或 Vercel preview URL。
- [ ] 設定 Redirect URLs：
  - `https://staging.chengxin.health/auth/callback`
  - `https://*.vercel.app/auth/callback`
- [ ] 確認 Email auth 或 magic link 設定符合測試流程。
- [ ] 確認註冊流程必須勾選隱私權、使用條款與 AI 健康管理輔助說明。

## 7. Vercel Environment Variables

- [ ] `NEXT_PUBLIC_APP_URL=https://staging.chengxin.health`
- [ ] `NEXT_PUBLIC_APP_ENV=staging`
- [ ] `NEXT_PUBLIC_APP_VERSION=0.1.0`
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] `NEXT_PUBLIC_SUPABASE_URL=...`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`
- [ ] `SUPABASE_SECRET_KEY=...`
- [ ] `SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET=meal-photos`
- [ ] `SUPABASE_STORAGE_INBODY_SCANS_BUCKET=inbody-scans`
- [ ] `AI_PROVIDER=openai`
- [ ] `OPENAI_API_KEY=...`
- [ ] `OPENAI_MODEL=gpt-5.5`
- [ ] `ANTHROPIC_API_KEY=`（skeleton，除非切換 provider）
- [ ] `GOOGLE_API_KEY=`（skeleton，除非切換 provider）
- [ ] `DEEPSEEK_API_KEY=`（skeleton，除非切換 provider）
- [ ] Optional：LINE / Email / SMS provider keys 保持未啟用或使用 sandbox。

## 8. AI Gateway 與 AI Safety

- [ ] 設定 staging 專用 `AI_PROVIDER=openai`。
- [ ] 設定 `AI_PROVIDER` 對應 API key；目前正式實作為 `OPENAI_API_KEY`。
- [ ] 確認 food / inbody / coach / visit report route 皆引用 `src/prompts`。
- [ ] 測試缺 API key 時，AI route 會回清楚錯誤，不使用 demo fallback。
- [ ] 確認 AI 回覆使用繁體中文。
- [ ] 確認所有藥物相關內容包含「請由醫師評估」。

## 9. Smoke Test

- [ ] 部署後執行：`SMOKE_BASE_URL=https://staging.chengxin.health npm run smoke`
- [ ] 確認 `/api/health` 回 200。
- [ ] 確認 `/api/health` 的 `demoMode=false`。
- [ ] 確認 `/api/health` 的 `aiConfigured=true`。
- [ ] 確認 `requiredEnvMissing=[]`。
- [ ] 確認 `/privacy`、`/terms`、`/medical-disclaimer`、`/support` 回 200。

## 10. Mobile / PWA

- [ ] iPhone Safari 開啟 staging。
- [ ] Android Chrome 開啟 staging。
- [ ] 測試加入主畫面。
- [ ] 測試 standalone mode 首頁、飲食、InBody、用藥、回診預約。
- [ ] 測試離線 fallback。
- [ ] 確認 service worker 不快取健康資料 API response。

## 11. Go / No-Go

- [ ] 內部 owner、doctor、clinic_staff 各登入一次。
- [ ] 測試病人完成註冊、健康評估、飲食照片、InBody、GLP-1 紀錄與回診預約。
- [ ] 診所可查看病人列表、病人詳情、提醒、預約與操作紀錄。
- [ ] 無高風險 bug、無資料越權、無敏感資料出現在 localStorage。
- [ ] 已準備 rollback：Vercel 回復前一版、Supabase migration 不直接破壞資料。
