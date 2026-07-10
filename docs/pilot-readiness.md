# Chengxin Health AI Pilot Readiness

## Internal Trial Flow

1. Set `NEXT_PUBLIC_DEMO_MODE=true` for internal demos without production persistence.
2. Walk patients through `/demo-tour`, `/assessment`, `/nutrition`, `/inbody`, `/medications`, `/appointments`, and `/dashboard`.
3. Walk clinic staff through `/clinic/demo-checklist`, `/clinic/patients`, `/clinic/patients/demo-1`, `/clinic/appointments`, `/clinic/audit-logs`, `/clinic/billing`, and `/clinic/feedback`.
4. Ask every tester to submit at least one feedback item from the bottom-right feedback button.
5. Review `/clinic/feedback` after each session and classify feedback as bug, confusing, idea, or praise.

## Tester Roles

- Owner: validates clinic settings, team roles, billing usage, audit logs, and overall commercial workflow.
- Doctor: validates patient detail, AI visit report, GLP-1 safety wording, side effect alerts, and medical boundary language.
- Nutritionist: validates food photo nutrition estimate, protein target messaging, and chronic disease diet warnings.
- Nurse or clinic staff: validates appointment management, reminders, patient follow-up workflow, and feedback capture.
- Patient tester: validates sign-up, health assessment, meal photo, InBody upload, GLP-1 record, AI Coach, and mobile usability.

## Trial Scenarios

- New patient completes health assessment and sees persona-based onboarding tasks.
- GLP-1 patient records injection and side effects, then clinic staff sees warnings.
- Patient uploads one meal photo and checks editable nutrition estimate.
- Patient uploads one InBody report and checks latest comparison.
- Clinic staff opens patient detail and generates an AI visit report.
- Clinic staff creates or updates an appointment.
- Tester submits feedback from a patient page and clinic staff reviews it.

## Feedback Workflow

- Use the bottom-right "回報問題" button from the exact page where the issue happened.
- Include page, expected result, actual result, and whether the issue blocks demo.
- Do not include passwords, tokens, national ID numbers, full medical records, or full prescriptions.
- Use `/clinic/feedback` to review open feedback after each pilot session.

## Required Before External Launch

- Supabase staging project configured with all migrations applied.
- Storage buckets and RLS policies reviewed.
- Demo accounts tested on desktop and 390px mobile width.
- `npm run lint`, `npm run build`, and `npm run smoke` pass.
- Medical disclaimer, privacy policy, and terms reviewed by counsel.
- OpenAI, Supabase, notification, and app URL environment variables verified.
- Staff understand the product does not diagnose or adjust medication.

## Do Not Claim Publicly

- Do not claim the product diagnoses disease.
- Do not claim the product treats obesity, diabetes, kidney disease, or any medical condition.
- Do not claim the product replaces physicians, dietitians, nurses, or InBody professionals.
- Do not claim AI can determine GLP-1 dose changes.
- Do not claim AI nutrition estimates are exact.
- Do not claim reminders identify medical emergencies.
