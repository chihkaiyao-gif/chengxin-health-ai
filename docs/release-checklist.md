# Chengxin Health AI Release Checklist

Use this checklist before staging demos and every production release.

## Code Gates

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run smoke` passes against the target deployment URL.
- [ ] `/api/health` returns 200.
- [ ] `/api/health` returns `status:"ok"` for staging or production.
- [ ] No production build depends on `NEXT_PUBLIC_DEMO_MODE=true`.

## Supabase

- [ ] Staging Supabase project exists.
- [ ] Production Supabase project exists.
- [ ] Base schema and migrations have been applied.
- [ ] `supabase/seed.sql` was run only in staging, not production.
- [ ] RLS review completed for patient data, clinic data, audit logs, and usage counters.
- [ ] Storage buckets exist: `meal-photos`, `inbody-scans`, and any public assets bucket.
- [ ] Supabase Storage policies restrict patient image access.
- [ ] Auth redirect URLs include local, staging, and production callback URLs.

## Demo Accounts

- [ ] `docs/demo-accounts.md` is current.
- [ ] Demo owner account can open clinic dashboard.
- [ ] Demo doctor account can open patient detail and AI visit report.
- [ ] Demo staff account can open appointments and reminders.
- [ ] Demo patients cover fitness beginner, gym training, GLP-1, chronic disease, and senior frailty personas.

## AI And Providers

- [ ] `OPENAI_API_KEY` is configured for staging and production.
- [ ] OpenAI model is explicitly set.
- [ ] AI nutrition photo route shows failure state when analysis fails.
- [ ] AI InBody photo route shows failure state when reading fails.
- [ ] Visit report output does not diagnose and does not adjust medication.
- [ ] LINE provider keys are either configured or intentionally left as skeleton.
- [ ] Email provider keys are either configured or intentionally left as skeleton.
- [ ] SMS provider keys are either configured or intentionally left as skeleton.

## PWA And Mobile

- [ ] `/manifest.webmanifest` returns 200.
- [ ] `/sw.js` returns 200.
- [ ] PWA install works on Android Chrome.
- [ ] iOS add-to-home-screen hint is visible when appropriate.
- [ ] These pages work at 390px width: dashboard, assessment, training, nutrition, inbody, medications, appointments, clinic patients, clinic appointments.
- [ ] Service worker does not cache sensitive API responses.
- [ ] localStorage does not store health records.

## Legal And Medical Safety

- [ ] Privacy policy is ready.
- [ ] Terms of service are ready.
- [ ] Medical disclaimer is ready.
- [ ] Medication copy includes `請由醫師評估`.
- [ ] Severe symptom copy says `請立即就醫或聯絡醫療人員`.
- [ ] Product copy does not claim diagnosis, treatment, or automatic medication adjustment.

## Launch

- [ ] Vercel Preview deployment tested.
- [ ] Staging domain tested.
- [ ] Production domain configured.
- [ ] Supabase Auth Site URL updated.
- [ ] Rollback plan documented.
- [ ] First-hour monitoring owner assigned.
