# Chengxin Health AI

Commercializable AI health management SaaS MVP skeleton for clinics, weight-loss patients, fitness users, chronic disease tracking, and older adults.

## MVP Scope

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, Storage, and baseline RLS
- Patient login and registration
- AI initial health assessment form
- Multi-step assessment wizard and persona routing
- Today dashboard
- Training log page
- Meal photo upload page
- InBody photo upload page
- GLP-1 medication and side-effect log page
- Clinic patient list page
- API route skeletons with validation and consistent error shape
- PWA manifest and service worker
- OpenAI Responses API placeholders for intake summary and visit reports

## Safety Boundary

This app does not diagnose, prescribe, or automatically adjust medication dosage. Medication-related content must show that decisions should be evaluated by a physician. AI is limited to records, reminders, trend analysis, and visit communication support.

## Commands

```bash
npm run dev
npm run lint
npm run build
```

## Setup

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project.
3. Apply database migrations with `supabase db push`.
4. Add Supabase URL and publishable key to `.env.local`.
5. Add `OPENAI_API_KEY` only when you are ready to test AI routes.
6. Start the app with `npm run dev`.

## Main Routes

- `/` product entry
- `/login` patient login
- `/register` patient registration and consent
- `/dashboard` today dashboard
- `/assessment` initial health assessment
- `/training` training log
- `/nutrition` meal photo upload
- `/inbody` InBody photo upload
- `/medications` GLP-1 medication log
- `/clinic/patients` clinic patient list

## API Routes

- `POST /api/health-assessments`
- `POST /api/health-assessments/submit`
- `GET /api/health-assessments/me/latest`
- `GET, POST /api/training-logs`
- `GET, POST /api/meal-photos`
- `GET, POST /api/inbody-scans`
- `GET, POST /api/glp1-logs`
- `GET /api/clinic/patients`
- `POST /api/ai/assessment`
- `POST /api/ai/visit-report`

The phase 2 assessment routes validate answers, compute a care persona, and persist to Supabase when environment variables are configured. Media upload routes remain skeletons for the next slice.

## Assessment Personas

- `fitness_beginner`
- `gym_training`
- `home_training`
- `glp1_weight_loss`
- `chronic_disease`
- `senior_frailty`
- `high_risk_medical_review`

High-risk answers such as chest pain, abnormal breathlessness during exercise, syncope, severe hypoglycemia symptoms, severe vomiting/dehydration, heart disease without physician clearance, or age 70+ with a recent fall route to `high_risk_medical_review`.
