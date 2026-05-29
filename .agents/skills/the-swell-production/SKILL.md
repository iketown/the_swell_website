---
name: the-swell-production
description: Use when working on The Swell project's production environment, Vercel deploys, hosted Supabase setup, release readiness, git push requests such as "let's push", deployment failures, production env vars, or theswell.live. Always run a local production build before pushing code.
---

# The Swell Production

Use this project-specific workflow for `swell-frontend`, the MakerKit Next/Supabase Turbo app deployed to Vercel at `https://theswell.live`.

## Non-Negotiables

- Never print or commit secrets. Keep every `.env*` file ignored.
- Do not push after a failed local production build.
- Treat `main` as deployable. Before pushing to `main`, confirm the local quality gate and production build pass.
- Use MakerKit docs for current patterns when env/build/deploy behavior is unclear: `https://makerkit.dev/docs/next-supabase-turbo`.
- Use project docs first: `docs/the-swell-live-deployment-todo.md`, `AGENTS.md`, and `PRD.md`.

## When The User Says "Let's Push"

1. Inspect status:
   ```bash
   git status --short
   git diff --stat
   ```

2. Check for env leaks:
   ```bash
   git status --short | grep -E '(^|/)\.env'
   ```
   If any `.env*` file is tracked or staged, stop and fix it before pushing.

3. Run the release gate:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm --filter web run build
   ```

4. If schema, RLS, seed, or generated DB types changed, also run:
   ```bash
   pnpm run supabase:web:reset
   pnpm run supabase:web:test
   pnpm --filter web run supabase:db:lint
   pnpm run supabase:web:typegen
   ```

5. If generated type files changed after typegen, re-run:
   ```bash
   pnpm typecheck
   pnpm --filter web run build
   ```

6. Only after the gate passes, show a concise summary of files changed and ask/confirm before committing if the user did not explicitly ask for a commit. If they asked to commit/push, commit and push normally.

## Build Failure Workflow

When Vercel fails or the user reports a deployment failure:

1. Get the Vercel build error/log excerpt from the user or CLI if available.
2. Reproduce locally with:
   ```bash
   pnpm --filter web run build
   ```
3. If the failure looks env-related, verify names rather than values:
   - `NEXT_PUBLIC_SITE_URL=https://theswell.live`
   - `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_DB_WEBHOOK_SECRET`
   - mailer vars if email is enabled
4. Fix the local cause, rerun the release gate, then push.

## Production Supabase Notes

- Local dev uses Docker Supabase; production uses hosted Supabase.
- If migrations changed, production needs `pnpm --filter web supabase db push` after the code is ready and before relying on Vercel.
- New public tables must have grants plus RLS policies. New permissions must be added to `app_permissions`, `role_permissions`, and tests.

