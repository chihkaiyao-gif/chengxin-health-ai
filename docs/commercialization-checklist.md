# Chengxin Health AI 商業化檢查清單

## 個資與健康資料保護

- 健康資料、照片、InBody、飲食與 GLP-1 紀錄一律存放於 Supabase Postgres / Storage，不放入 localStorage。
- 註冊與健康評估需保留隱私權同意與資料使用同意。
- 對外通知內容避免包含敏感健康細節，只放提醒標題與安全聯絡指引。
- 匯出、客服查詢與跨診所調閱未來需加入 audit trail。

## RLS 檢查

- `can_access_patient` 必須同時支援舊的 `patient_clinic_links` 與新的 `clinic_patients`。
- 診所成員需為 active 狀態才可讀取診所或病人資料。
- `owner` 才能管理診所設定、團隊與帳務；`viewer` 只能唯讀。
- 病人邀請碼接受流程使用 `accept_patient_invite` security definer function，不直接公開 pending invite 清單給病人。

## 多診所資料隔離

- 每位診所人員透過 `clinic_members` 綁定診所與角色。
- 每位病人透過 `clinic_patients` 綁定診所，未來可支援轉診、退院與多診所關聯。
- Clinic Dashboard、Patients、Appointments、Reminders、Reports 均需依診所關聯與 RLS 查詢。
- Logo、主色、Line、網站與聯絡資訊需依 clinic_id 分離。

## 不診斷、不調藥限制

- 平台只做紀錄、提醒、趨勢分析與回診溝通輔助。
- 不提供疾病診斷、不自動調整 GLP-1 或其他藥物劑量。
- 所有用藥與回診建議固定顯示「請由醫師評估」。
- 嚴重症狀只提醒「請立即就醫或聯絡醫療人員」。

## AI 輸出審核

- AI 回診報告需標示為輔助摘要，不得取代醫師判讀。
- Visit report prompt 應避免診斷語氣與劑量建議。
- 高風險訊號需導向醫師或專業人員評估。
- 正式上線前需建立 AI output review log 與人工覆核流程。

## Log / Audit Trail 未來規劃

- 記錄診所人員查看病人資料、產生報告、修改角色、接受邀請與調整設定的事件。
- 記錄通知發送 channel、狀態與 provider response。
- 敏感資料查詢需保留 actor、clinic_id、patient_id、timestamp、action。
- 提供 super_admin 後台查詢與匯出。

## 金流未來規劃

- 方案：free、clinic_basic、clinic_pro、enterprise。
- 可串 Stripe、TapPay 或本地金流，並使用 webhook 更新 `clinic_subscriptions`。
- 不把健康資料放入 payment metadata。
- 建議以用量限制控制 max_patients、max_staff 與 AI report 次數。

## App Store / Google Play 上架規劃

- Phase 1 維持 PWA-first，降低多平台維護成本。
- Phase 2 使用 Capacitor 包裝 iOS / Android。
- Phase 3 補齊商店隱私標示、醫療免責聲明與資料刪除流程。
- Phase 4 串 HealthKit / Google Fit / 推播 / 相機權限。
- 上架前需確認醫療宣稱、資料保存、客服與刪除帳號政策。
