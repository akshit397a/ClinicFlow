# Clinic Scheduler

Multi-provider clinic appointment scheduling built with Next.js 15, Supabase
(PostgreSQL + Auth), React Server Components, and Server Actions.

## Stack

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Supabase (PostgreSQL, Auth, RLS) via `@supabase/ssr`
- `zod` for input validation, `date-fns` for dates, `vitest` for tests

## Quick start

### 1. Start the database (Supabase)

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
then:

```bash
npx supabase init          # if supabase/config.toml is missing
npx supabase start         # boots Postgres + Auth locally
npx supabase db reset      # applies migrations/001..009 + seed.sql
```

`db reset` creates the demo data. Copy your local API URL, anon key, and
service-role key from `npx supabase status`.

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> The service-role key is server-only. Every write is performed by trusted
> server-side code (Server Actions) after authorization; RLS grants read access
> only.

### 3. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Demo accounts

All passwords are `password123`.

| Role        | Email                        |
|-------------|------------------------------|
| Front desk  | front_desk.one@clinic.test   |
| Front desk  | front_desk.two@clinic.test   |
| Provider    | provider.alice@clinic.test   |
| Provider    | provider.bob@clinic.test     |
| Provider    | provider.carol@clinic.test   |

## Scripts

```bash
npm run dev            # development server
npm run build          # production build
npm run start          # serve the production build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # unit tests (vitest)
npm run test:watch
npm run test:integration  # requires a running local Supabase + env vars
```

## Documentation

- `docs/architecture.md` — system design and data flow
- `docs/schema.md` — database schema, constraints, indexes, RLS
- `docs/decisions.md` — key decisions, trade-offs, assumptions
- `docs/plan.md` — implementation plan
- `docs/ai-prompts.md` — reusable prompts for AI-assisted development
- `tests/integration/schema.test.ts` — how to run integration tests

## Folder structure

```
app/             App Router pages, layouts, route handlers
components/      UI primitives + feature components
lib/             server library (supabase clients, auth, actions, queries)
supabase/        migrations + seed
tests/           unit + integration tests
docs/            design documentation
```