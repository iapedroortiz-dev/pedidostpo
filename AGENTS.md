# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 internal app for sofa-order management, backed by Supabase.

- `app/` contains App Router pages, server actions (`actions.js`), route handlers, shared layout, and global styles.
- `lib/` holds shared domain logic and Supabase clients. Keep browser, server, admin, and proxy client usage separated under `lib/supabase/`.
- `supabase/migrations/` contains ordered SQL schema and policy migrations; `supabase/config.toml` configures the local Supabase project.
- `public/` contains static assets and legacy static files. Put reusable images in `public/assets/`.
- `api/`, `server.js`, and `proxy.js` support server/proxy integration. Avoid placing application features there when an App Router route is appropriate.

## Build, Test, and Development Commands

```powershell
npm install                 # install locked dependencies
Copy-Item .env.example .env.local
npm run dev                 # start Next.js development server
npm run build               # production build and type/runtime checks
npm run start               # serve a completed production build
git diff --check            # detect whitespace errors before review
```

There is no automated test suite or lint script yet. Manually exercise changed role flows, forms, and error states locally, then run `npm run build` before opening a PR.

## Coding Style & Naming Conventions

Use JavaScript with two-space indentation, semicolons, single quotes, and trailing commas only where the surrounding code uses them. Use `camelCase` for variables and functions, `PascalCase` for React components, and lowercase route directories such as `app/set-password/`. Name server mutations as verbs (`createOrder`, `updateUser`) and keep their authorization and input validation on the server. Prefer small local helpers over duplicating normalization or Supabase query logic.

## Database, Security & Configuration

Add schema, RLS, storage, or role changes as a new timestamped migration in `supabase/migrations/`; never edit an applied migration. Preserve the role model (`representante`, `pedidos`, `admin`) and verify queries remain RLS-safe. Copy `.env.example` for local setup; never commit `.env.local`, Supabase secret keys, production URLs, or uploaded catalog workbooks.

## Commits & Pull Requests

Recent history uses concise imperative subjects, commonly Conventional Commit-style: `feat: importar y asignar clientes desde Excel`. Use `feat:`, `fix:`, `chore:`, or `docs:` where applicable. Keep commits focused. PRs should state the user-facing change, migration/configuration impact, validation performed, and link the issue when available. Include screenshots for visible UI changes. Target `main`, the production branch, only after `npm run build` and `git diff --check` pass.
