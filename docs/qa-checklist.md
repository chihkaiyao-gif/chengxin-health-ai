# Chengxin Health AI QA Checklist

Use this checklist before showing the demo to clinic teams, physicians, investors, or test patients.

## Patient Flow

- [ ] Patient can open `/dashboard` on desktop and mobile.
- [ ] First-time patient can complete `/assessment`.
- [ ] Assessment result shows persona, recommended path, and medical review warning when applicable.
- [ ] Dashboard shows health score, completed items, reminders, nutrition, InBody, and GLP-1 cards.
- [ ] Dashboard does not imply diagnosis or automatic medication adjustment.

## AI Nutrition

- [ ] `/nutrition` supports photo selection or camera capture.
- [ ] AI analysis failure shows a clear Chinese error message.
- [ ] Upload failure or missing Supabase config explains that demo data is not formally saved.
- [ ] Editable nutrition result can be corrected before saving.
- [ ] Empty state shows `尚無飲食紀錄` with a next-step CTA.
- [ ] Diabetes, kidney disease, or high-risk copy says: `請依醫師或營養師建議調整飲食`.

## AI InBody

- [ ] `/inbody` supports photo selection or camera capture.
- [ ] AI reading failure shows a clear Chinese error message.
- [ ] Editable InBody result can be corrected before saving.
- [ ] Latest summary and comparison cards render when demo data exists.
- [ ] Empty state shows `尚無 InBody 紀錄` with a next-step CTA.
- [ ] Trend chart handles fewer than two data points gracefully.

## GLP-1

- [ ] `/medications` can add injection records.
- [ ] Default next injection date is injection date + 7 days.
- [ ] Manual next injection date override is respected.
- [ ] High side effect alert appears for nausea >= 7, vomiting, dehydration concern, or abdominal pain >= 7.
- [ ] Every medication-related card includes `請由醫師評估`.
- [ ] Severe symptom copy says: `請立即就醫或聯絡醫療人員`.
- [ ] Empty state shows `尚無 GLP-1 紀錄` with a next-step CTA.

## Appointments And Reminders

- [ ] Patient can submit `/appointments` request.
- [ ] Empty state shows `尚無預約` with a CTA.
- [ ] Clinic can open `/clinic/appointments`.
- [ ] Clinic staff can update appointment status and note.
- [ ] `/api/reminders/me` and `/api/clinic/reminders` respond in demo mode.
- [ ] Empty state shows `尚無提醒`.
- [ ] All visit suggestion copy says: `請由醫師或診所人員評估`.

## Clinic Flow

- [ ] `/clinic/dashboard` shows patient count, active patients, high side effect alerts, appointments, low engagement, and GLP-1 due soon.
- [ ] `/clinic/patients` shows patient rows and GLP-1 status.
- [ ] `/clinic/patients/[patientId]` shows profile, assessment persona, trends, nutrition, training, GLP-1, side effects, adherence, and risk warnings.
- [ ] AI visit report button generates a conservative summary.
- [ ] Visit report output does not diagnose and does not adjust medication.
- [ ] `/clinic/team`, `/clinic/settings`, and `/clinic/billing` render for owner.

## Audit Logs And Billing Usage

- [ ] `/clinic/audit-logs` is visible to owner and doctor only.
- [ ] Audit log filters work for action, actor, target patient, and date range.
- [ ] Empty state shows `尚無 audit logs` with a next-step CTA.
- [ ] `/clinic/billing` shows current plan and usage counts.
- [ ] Usage limit UI shows patient, staff, AI food, AI InBody, and AI visit report counters.

## Permissions And RLS

- [ ] Patient cannot access another patient's health data.
- [ ] Clinic staff can see patient list, appointments, and reminders, but not billing management.
- [ ] Doctor can view patients and generate visit reports.
- [ ] Owner can manage clinic settings, team, billing, and audit logs.
- [ ] Viewer role remains read-only.
- [ ] Multi-clinic data isolation works through `clinic_members` and `clinic_patients`.

## PWA And Mobile

- [ ] `/manifest.webmanifest` returns 200.
- [ ] `/sw.js` returns 200.
- [ ] PWA install prompt works in Android Chrome.
- [ ] iPhone add-to-home-screen hint appears when appropriate.
- [ ] These pages work at 390px width: dashboard, assessment, training, nutrition, inbody, medications, appointments, clinic patients, clinic appointments.
- [ ] Service worker does not cache sensitive API responses.
- [ ] localStorage does not store health records or sensitive profile data.

## Final Verification

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run smoke` passes against the running local server.
