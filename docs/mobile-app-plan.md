# Chengxin Health AI Mobile App Plan

## Phase 1: PWA-first

目標是先用同一套 Next.js 產品支援 iPhone、Android 與桌面瀏覽器，降低 MVP 迭代成本。

交付重點：
- 完整 `manifest.webmanifest`，包含 standalone、icons、maskable icon、start_url 與 scope。
- iOS Safari 支援加入主畫面、safe-area inset、Apple touch icon 與 status bar 設定。
- Android Chrome 支援 `beforeinstallprompt` 安裝提示。
- Service worker 提供基本靜態資產快取與離線 fallback。
- 不快取敏感 API 回應，不把健康紀錄存入 localStorage。

適合時機：
- MVP 驗證、診所試營運、快速調整問卷與照護流程。
- 需要低成本讓病人先加入手機主畫面使用。

## Phase 2: Capacitor iOS / Android Wrapper

當 PWA 使用數據穩定後，可以用 Capacitor 把現有 Web App 包成 iOS / Android App。

建議工作：
- 新增 Capacitor 專案設定，保留 Next.js 作為主要 UI。
- 建立 iOS / Android 專用環境變數與 build pipeline。
- 檢查登入 callback、Supabase session、相機上傳與檔案權限。
- 加入原生狀態列、safe-area、深連結與 App icon/splash assets。

注意事項：
- 不要在 Native wrapper 內新增另一套商業邏輯。
- API 權限仍以 Supabase Auth、RLS、Storage policy 為主。
- Native 端只負責裝置能力與分發，不應繞過後端權限。

## Phase 3: App Store / Google Play 上架

上架前需要把產品、法規與審核材料準備完整。

準備項目：
- 隱私權政策、資料使用同意、AI 輔助聲明。
- 醫療免責聲明：不診斷、不自動調藥，藥物相關內容請由醫師評估。
- App Store / Google Play 截圖、描述、支援信箱、測試帳號。
- 健康資料處理說明與刪除帳號/刪除資料流程。
- 診所端與病人端權限測試紀錄。

商業建議：
- PWA 先服務早期診所與病人，降低審核等待成本。
- Native 上架作為品牌信任與長期留存工具，不要太早讓雙平台審核拖慢 MVP。

## Phase 4: HealthKit / Google Fit / Push / Camera Permissions

Native wrapper 穩定後，再逐步加入裝置能力。

候選功能：
- HealthKit：步數、體重、體脂、活動量同步。
- Google Fit / Health Connect：Android 健康資料同步。
- 推播：回診提醒、GLP-1 回報提醒、飲食與訓練紀錄提醒。
- 相機權限：餐點照片、InBody 報告、藥物紀錄附件。

安全要求：
- 健康平台資料必須明確取得使用者授權。
- 推播內容避免包含敏感健康細節。
- 圖片與健康紀錄仍走 Supabase Storage / Postgres 權限。
- 裝置端不得長期保存完整健康紀錄或 access token。

## PWA 與 Native App 優缺點

PWA 優點：
- 一套程式碼支援手機與桌面。
- 不需等 App Store / Google Play 審核即可更新。
- 適合 MVP、診所試點、快速修改流程。
- 使用者可加入手機主畫面，接近 App 使用感。

PWA 限制：
- iOS 推播與背景能力受平台限制。
- App Store 搜尋曝光較弱。
- 某些裝置權限與健康資料整合能力不如 Native。

Native App 優點：
- 品牌信任較高，適合商業化與大型診所合作。
- 原生推播、HealthKit、Google Fit、相機與檔案權限整合更完整。
- 更容易在手機上形成固定使用習慣。

Native App 限制：
- 需要上架審核、雙平台測試與版本管理。
- 發版速度較慢，營運成本較高。
- 若太早上架，會放大 MVP 需求變動成本。

## 商業化建議

建議採取三段式策略：

1. PWA 試營運：先找 1-3 間診所或小型族群驗證照護流程、AI 回診報告、GLP-1 副作用追蹤與病人黏著度。
2. 診所付費版：以診所後台、AI 回診摘要、病人提醒中心、資料趨勢報告作為付費核心。
3. Native 強化留存：當每日/每週使用率穩定後，再上架 iOS / Android，加入推播與健康資料串接。

定價方向：
- 診所 SaaS 月費：依病人數或診所人員席次計價。
- 高階模組：AI 回診報告、GLP-1 管理、InBody 趨勢、HealthKit/Google Fit 串接。
- 病人端可維持免費或由診所邀請使用，降低病人導入阻力。

## 資料安全原則

- Service worker 不快取健康資料 API response。
- localStorage 不存敏感健康資料、session token、藥物紀錄、照片路徑或 AI 分析結果。
- 圖片與健康紀錄仍走 Supabase Storage / Postgres 權限。
- 所有受保護資料都必須通過 Supabase Auth、RLS 與 Storage policy。
- 離線頁只顯示一般提示，不顯示病人個資、健康趨勢、藥物或副作用內容。
