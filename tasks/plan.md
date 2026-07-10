# Implementation Plan: Chengxin Health AI MVP Skeleton

## Overview

Create a working Next.js 14 SaaS skeleton with patient flows, clinic flows, Supabase schema, baseline RLS, API route contracts, and PWA readiness. AI logic remains intentionally shallow in Phase 1.

## Architecture Decisions

- Use Supabase Auth as the identity source and public.profiles for app roles.
- Keep patient data in patient-owned tables with care-team read policies.
- Store meal and InBody images in private Supabase Storage buckets under `{patientId}/...`.
- Use OpenAI Responses API only through server routes with `store: false`.
- Use typed zod validation at API boundaries.

## Task List

### Phase 1: Foundation

- [x] Create Next.js 14 App Router project with TypeScript and Tailwind
- [x] Add Supabase, OpenAI, zod, and icon dependencies
- [x] Add shared UI shell, cards, notices, metrics, and upload panel
- [x] Add PWA manifest and service worker

### Phase 2: Patient MVP

- [x] Add login and registration pages
- [x] Add initial health assessment page
- [x] Add today dashboard
- [x] Add training, meal photo, InBody, and GLP-1 pages

### Phase 3: Clinic MVP

- [x] Add clinic patient list page
- [x] Add clinic patient API skeleton

### Phase 4: Data and API

- [x] Add Supabase SQL schema
- [x] Add RLS and Storage policies
- [x] Add API route skeletons
- [x] Add OpenAI route placeholders

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Health data exposure | High | RLS on every table, private Storage buckets, no secret key in browser |
| Medication safety | High | Explicit safety copy, no auto dosage logic |
| AI overreach | High | Server-only AI routes, non-diagnostic prompt, `store: false` |
| OCR inaccuracies | Medium | Require human review for InBody OCR fields |
| Multi-clinic permissions | Medium | patient_clinic_links plus clinic_members policies |

## Open Questions

- Final clinic invitation flow
- Exact consent document versions
- Production hosting and compliance requirements
