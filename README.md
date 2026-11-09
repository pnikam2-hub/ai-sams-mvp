# AI-SAMS — Practice and Readiness Assessment

A practice environment for mock examinations and self-assessment of AI skills. Practice papers and
competency structures are modelled on publicly available qualification frameworks so that learners
can rehearse the format, difficulty and competency areas a real assessment covers.

Next.js 14 + Supabase + an OpenAI-compatible scoring API.

## Scope — read this first

AI-SAMS is an **independent practice tool**. It is **not affiliated with, endorsed by, sponsored
by, or recognised by** NCVET, MSDE, NSDC, any Sector Skill Council, or any other government body.

- It issues **no qualification, certificate, accreditation or credit**.
- A "practice report" is a diagnostic for the learner's own feedback. It is not a statement of
  competency and has no standing in any official assessment, recruitment or licensing process.
- Question banks, rubrics and sample content in this repository are original practice material.
  They are not copies of any Sector Skill Council item bank or assessment guide.

The live disclaimer page is at `/disclaimer` and is linked from the sign-in screen and from every
dashboard footer. Do not remove it, and do not describe this tool as "official" anywhere — in sales
conversations, on a landing page, in email, or to a learner.

If official assessment is the goal, the route is on-boarding as an Assessment Agency with the
relevant Sector Skill Council, and recognition of assessment agencies by NCVET. Until that is
granted, practice and readiness is the honest description.

## Roles and flows

| Role | What they do |
|---|---|
| `super_admin` | Centres, courses, competencies (against NSQF levels), questions, rubrics, batches, audit log |
| `tc_admin` | Own centre's courses, batches, candidates |
| `assessor` | Reviews scenario and practical submissions, AI score suggestions, finalises results |
| `candidate` | Takes MCQ (auto-scored), scenario and practical (rubric-scored) sections, views practice report |

Assessment sections: MCQ (auto-scored), scenario (rubric + AI suggestion, assessor-final), practical
(upload + rubric + AI suggestion, assessor-final). The rubric-scored scenario and practical sections
are the part that is not a commodity — MCQ-only mock tests are widely available for free.

## Running locally

```bash
npm install          # or yarn
npm run dev
```

Required environment variables:

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — never expose to the browser |
| `KIMI_API_KEY` | OpenRouter (or other OpenAI-compatible) key for AI score suggestions |
| `KIMI_BASE_URL` | e.g. `https://openrouter.ai/api/v1` |
| `NEXT_PUBLIC_APP_URL` | Deployment URL |

Note on Vercel: the repo carries `yarn.lock` deliberately — npm fails with "Exit handler never
called" on Node 24. Keep it.

## Demo dataset

The public instance runs on sample data: one training centre, one course, one batch, five
candidates, three role accounts. The demo credentials are listed on the sign-in page so evaluators
can get in.

**Before any real training centre or candidate uses this**, rotate or remove those demo accounts,
clear the sample candidates, and do not accept personal data into the demo instance.

## Deployment

Git-linked to Vercel; pushing to `main` deploys. See `supabase/` for the migration and seed SQL.

## Housekeeping

- `/disclaimer` — full statement of scope. Keep in sync with this README if either changes.
- `PracticeNotice` (`src/components/practice-notice.tsx`) — the inline "practice report, not a
  qualification" banner. Show it wherever a score is presented.
- Dashboard footer disclaimer (`src/components/layout/dashboard-layout.tsx`).
