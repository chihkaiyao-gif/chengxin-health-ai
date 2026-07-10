# Spec: Chengxin Health AI MVP

## Objective

Build a commercial SaaS foundation for AI-assisted health tracking across patient and clinic workflows. The MVP must support patient onboarding, consent, health assessment and persona routing, training logs, meal photo uploads, InBody uploads, GLP-1 tracking, clinic patient review, API skeletons, PWA installability, and Supabase RLS.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Storage
- OpenAI Responses API
- PWA manifest and service worker

## Commands

```bash
npm run dev
npm run lint
npm run build
```

## Project Structure

```text
src/app                 App Router pages and route handlers
src/app/(auth)          Login and registration
src/app/(patient)       Patient-facing dashboard and record pages
src/app/(clinic)        Clinic staff and doctor views
src/app/api             REST route skeletons
src/components          Shared UI components
src/lib                 Supabase, OpenAI, validation, assessment routing, API helpers
supabase/schema.sql     Database schema, RLS, and Storage policies
docs/                   Product and architecture notes
tasks/                  Implementation plan and checklist
public/                 PWA manifest, service worker, app icon
```

## Code Style

Use typed React Server Components by default. Client components are used only when browser APIs are required.

```tsx
export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}
```

## Testing Strategy

- MVP verification: `npm run lint` and `npm run build`
- Next slice: add API tests for validation and authorization
- Later slices: add browser checks for patient onboarding and clinic patient review

## Boundaries

- Always: validate external input, enforce auth, use RLS, show medical safety notices, keep AI output non-diagnostic.
- Ask first: adding billing, adding diagnosis-like logic, changing medication workflows, adding new sensitive data categories.
- Never: commit secrets, bypass RLS, expose service role keys to the browser, recommend medication dose changes.

## Success Criteria

- A developer can run the Next.js app locally.
- Supabase SQL defines all MVP tables and baseline RLS.
- All requested MVP pages exist and render.
- API skeleton routes exist with consistent response and validation patterns.
- Assessment submit/latest routes compute and expose persona routing results.
- PWA manifest and service worker are present.
- Medication and AI surfaces repeat the physician-evaluation safety boundary.

## Open Questions

- Which clinic workflow should be first: doctor review, health coach review, or staff follow-up?
- Should patient-clinic linking be invitation based, QR code based, or created by clinic staff?
- Which GLP-1 medications and side-effect taxonomy should be localized first for Taiwan clinics?
