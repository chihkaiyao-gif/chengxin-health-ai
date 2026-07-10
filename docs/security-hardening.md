# Chengxin Health AI Security Hardening

## RLS 檢查清單

- 所有健康資料表需啟用 RLS。
- 病人只能讀寫自己的紀錄。
- 診所成員只能讀取所屬診所關聯病人。
- `owner` 可管理設定、團隊與帳務；`doctor` 可看病人、報告與 audit logs。
- `clinic_staff` 可看病人列表、預約與提醒，但不可看帳務或 audit logs。
- `nutritionist` 與 `coach` 僅開放對應工作流；`viewer` 唯讀。
- 新增表需同時補 `select / insert / update` policy，不使用沒有條件的 broad policy。

## 健康資料不存 localStorage

- 不把飲食、InBody、GLP-1、副作用、問卷答案、AI 報告存入 localStorage。
- 本機暫存只可放 UI 偏好，例如安裝提示是否已關閉。
- 圖片與健康紀錄仍走 Supabase Storage / Postgres 權限。
- Session 使用 Supabase SSR cookie，不把 auth token 手動寫入 localStorage。

## API 權限檢查

- 每個 protected API 都需驗證登入狀態。
- 讀取病人資料需使用 `can_access_patient` 或等價 helper。
- 診所管理 API 需檢查 `canManageClinicSettings`、`canManageTeam`、`canViewBilling`。
- 方案用量限制需在高成本操作前檢查，例如 AI 回診報告與分析。
- 失敗回應使用一致格式：`{ error: { code, message, details } }`。
- 不回傳 stack trace、SQL error 原文給使用者；內部錯誤只在伺服器端記錄。

## Audit Trail 規則

- 需記錄：查看病人資料、修改病人資料、產生 AI 報告、GLP-1 紀錄、診所設定、團隊邀請/停用、預約狀態修改。
- `metadata` 只放摘要，不放完整病歷、完整 AI prompt、token、密碼或付款資料。
- Audit logs 只有 owner / doctor 可看。
- Production 需補匯出、保留期限、異常查詢告警與不可竄改儲存策略。

## AI 輸出限制

- AI 只做紀錄、提醒、趨勢分析與回診溝通輔助。
- 不診斷、不自動調藥、不提供醫療處置建議。
- GLP-1 與劑量相關內容固定顯示「請由醫師評估」。
- Model output 視為不可信資料，需經 Zod schema 驗證。
- 不把跨診所資料、API key、系統 prompt 或其他病人資料放入 prompt。
- 設定 monthly usage counters，避免 AI 成本失控。

## Supabase Storage 權限

- meal photos 與 InBody scans 需使用私有 bucket。
- 檔案路徑以 user id 分區，例如 `{userId}/{filename}`。
- 病人可上傳自己的圖片。
- 診所照護團隊只可讀取有病人關聯的圖片。
- 不快取敏感 Storage URL 到 service worker。

## Production Env Checklist

- `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 設定於部署平台。
- `AI_PROVIDER` 與對應 provider key 僅在 server env，不暴露到 client；目前正式實作為 `OPENAI_API_KEY`。
- 設定 Supabase Auth redirect allowlist。
- 設定正式網域 HTTPS。
- 啟用 database backup 與 point-in-time recovery。
- 建立 error monitoring、API rate limits、AI cost alerts。
- 確認 `.env.local`、secret、private key 不進版本控制。
- 上線前跑 `npm run lint`、`npm run build`、主要頁面 HTTP smoke test。
