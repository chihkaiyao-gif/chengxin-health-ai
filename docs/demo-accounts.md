# Chengxin Health AI Demo Accounts

Use these accounts after running `supabase/seed.sql`.

Shared password: `Demo123456!`

## Clinic Accounts

| Role | Email | What to test |
| --- | --- | --- |
| Owner | `owner@chengxin.health` | Clinic dashboard, settings, team, billing usage, audit logs, patient detail, appointment management |
| Doctor | `doctor@chengxin.health` | Patient list, patient detail, AI visit report, audit logs, GLP-1 and side effect review |
| Clinic staff | `staff@chengxin.health` | Patient list, appointments, reminders, patient contact workflow skeleton |

## Patient Accounts

| Persona | Email | What to test |
| --- | --- | --- |
| Fitness beginner | `patient01@chengxin.health` | Dashboard health score, nutrition logging, InBody trend, beginner exercise path |
| Gym training | `patient02@chengxin.health` | InBody trend, training summary, clinic patient detail trend cards |
| GLP-1 weight loss | `patient03@chengxin.health` | Medication logs, high side effect alert, appointment request, reminders |
| Chronic disease | `patient04@chengxin.health` | Medical nutrition warning, missed food logs, chronic disease safety copy |
| Senior frailty | `patient05@chengxin.health` | Medical review flag, InBody stale reminder, low engagement warning |

## Demo Notes

- Set `NEXT_PUBLIC_DEMO_MODE=true` to show the global Demo Mode banner.
- If Supabase keys are not configured, most API routes return `persisted:false`; the UI should explain that the data was validated but not formally saved.
- AI output in this demo is for records, reminders, trend review, and visit communication support only. It does not diagnose, treat, or adjust medication.
- All medication-related content must keep the wording: `請由醫師評估`.
