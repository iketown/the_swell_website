# The Swell Live Deployment TODO

This is the deployment runbook for getting `theswell.live` live on Vercel while keeping local development on Docker Supabase. It follows MakerKit's Next.js Supabase Turbo production docs and this repo's current scripts.

## Target Setup

- Local development: Docker Supabase plus `pnpm dev`.
- Production database/auth/storage: a hosted Supabase project.
- Source of truth for The Swell code: our GitHub repo.
- MakerKit updates: pulled from a separate `upstream` remote.
- Hosting: Vercel, connected to our GitHub repo.
- Production domain: `https://theswell.live`.
- Preview builds: Vercel preview deployments for branches/PRs.

## Phase 0: One-Time Local Baseline

- [ ] Confirm you are in the app repo:
  ```bash
  cd /Users/brianeichenberger/projects/the_swell/swell_website/swell-frontend
  ```

- [ ] Confirm Docker Desktop is running.

- [ ] Confirm local Supabase starts:
  ```bash
  pnpm run supabase:web:start
  ```

- [ ] Confirm the app runs locally:
  ```bash
  pnpm dev
  ```

- [ ] Confirm local app URLs:
  - App: `http://localhost:3000`
  - Supabase Studio: `http://127.0.0.1:54323`

- [ ] Run the local quality gate before deployment work:
  ```bash
  pnpm run supabase:web:reset
  pnpm run supabase:web:test
  pnpm --filter web run supabase:db:lint
  pnpm run supabase:web:typegen
  pnpm typecheck
  pnpm lint:fix
  pnpm format:fix
  ```

## Phase 1: Fix Git Remotes

The repo currently has `origin` pointed at MakerKit. Change that so `origin` is The Swell's GitHub repo and `upstream` is MakerKit.

- [ ] Create a new GitHub repo, for example:
  ```text
  github.com/<your-org-or-user>/the-swell-website
  ```

- [ ] Rename the existing MakerKit remote:
  ```bash
  git remote rename origin upstream
  ```

- [ ] Add The Swell repo as `origin`:
  ```bash
  git remote add origin git@github.com:<your-org-or-user>/the-swell-website.git
  ```

- [ ] Verify remotes:
  ```bash
  git remote -v
  ```

  Expected shape:
  ```text
  origin   git@github.com:<your-org-or-user>/the-swell-website.git (fetch)
  origin   git@github.com:<your-org-or-user>/the-swell-website.git (push)
  upstream https://github.com/makerkit/next-supabase-saas-kit-turbo (fetch)
  upstream https://github.com/makerkit/next-supabase-saas-kit-turbo (push)
  ```

- [ ] Push your current main branch:
  ```bash
  git push -u origin main
  ```

## Phase 2: Branch Flow

Use a simple flow until the project needs more ceremony.

- [ ] Keep `main` deployable at all times.
- [ ] Build features on short branches:
  ```bash
  git checkout -b feature/member-parts-flow
  ```
- [ ] Open a PR into `main`.
- [ ] Let Vercel build a preview deployment for the PR.
- [ ] Merge to `main` only after local checks and the Vercel preview pass.
- [ ] Vercel production deploys from `main`.

MakerKit update flow:

- [ ] Fetch MakerKit updates:
  ```bash
  git fetch upstream
  ```

- [ ] Create an integration branch:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b chore/makerkit-update
  ```

- [ ] Merge or rebase MakerKit changes carefully:
  ```bash
  git merge upstream/main
  ```

- [ ] Resolve conflicts, then run the full local quality gate.
- [ ] Open a PR from `chore/makerkit-update` into `main`.

## Phase 3: Create Production Supabase

- [ ] Create a new Supabase project at `supabase.com`.
- [ ] Save the database password somewhere secure. Supabase will not show it again.
- [ ] Choose a region close to your likely users.
- [ ] In Supabase Dashboard, go to **Project Settings > API** and collect:
  - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
  - Anon/public key -> `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`
  - Service role key -> `SUPABASE_SECRET_KEY`

- [ ] Link the local repo to the hosted Supabase project:
  ```bash
  pnpm --filter web supabase login
  pnpm --filter web supabase link --project-ref <project-ref>
  ```

- [ ] Push migrations to production:
  ```bash
  pnpm --filter web supabase db push
  ```

- [ ] Confirm the production Supabase Table Editor has the MakerKit tables plus The Swell tables:
  - `accounts`
  - `accounts_memberships`
  - `members`
  - `songs`
  - `parts`
  - `part_files`
  - `events`
  - `locations`
  - `assets`

## Phase 4: Configure Production Auth

In Supabase Dashboard -> **Authentication > URL Configuration**:

- [ ] Set Site URL:
  ```text
  https://theswell.live
  ```

- [ ] Add Redirect URL:
  ```text
  https://theswell.live/auth/callback**
  ```

- [ ] Add Vercel preview redirect URL once the Vercel project exists:
  ```text
  https://*-<vercel-project-name>.vercel.app/auth/callback**
  ```

- [ ] Copy MakerKit auth email templates from `apps/web/supabase/templates/` into Supabase Dashboard -> **Authentication > Email Templates**:
  - `confirm-email.html`
  - `magic-link.html`
  - `otp.html`
  - `reset-password.html`
  - `change-email-address.html`
  - `invite-user.html`

- [ ] Configure production SMTP in Supabase. Resend is a good first choice:
  - Host: `smtp.resend.com`
  - Port: `465`
  - Username: `resend`
  - Password: your Resend API key
  - Sender email: `noreply@theswell.live`
  - Sender name: `The Swell`

## Phase 5: Production Environment Variables

Generate MakerKit's env list:

```bash
pnpm turbo gen env
```

For local production-build testing, create `apps/web/.env.production.local`. This file is ignored by git.

Minimum production values for this project:

```bash
NEXT_PUBLIC_SITE_URL=https://theswell.live
NEXT_PUBLIC_PRODUCT_NAME="The Swell"
NEXT_PUBLIC_SITE_TITLE="The Swell"
NEXT_PUBLIC_SITE_DESCRIPTION="Private band OS and public home for The Swell"
NEXT_PUBLIC_DEFAULT_THEME_MODE=light

NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLIC_KEY=<supabase-anon-public-key>
SUPABASE_SECRET_KEY=<supabase-service-role-key>

SUPABASE_DB_WEBHOOK_SECRET=<openssl-rand-secret>

MAILER_PROVIDER=resend
EMAIL_SENDER="The Swell <noreply@theswell.live>"
RESEND_API_KEY=<resend-api-key>

NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING=false
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING=false
NEXT_PUBLIC_BILLING_PROVIDER=stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Generate the database webhook secret:

```bash
openssl rand -base64 32
```

Production-build sanity check:

```bash
pnpm --filter web run build
```

If you do not have `apps/web/.env.production.local` yet, you can test the known HTTPS site-url failure mode with:

```bash
NEXT_PUBLIC_SITE_URL=https://theswell.live pnpm --filter web run build
```

## Phase 6: Create Vercel Project

- [ ] In Vercel, click **Add New Project**.
- [ ] Import The Swell GitHub repo, not the MakerKit repo.
- [ ] Configure:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Build Command | Leave default |
| Output Directory | Leave default |

- [ ] Add the production environment variables from Phase 5 to Vercel.
- [ ] Deploy.
- [ ] If the first deploy fails because of missing env vars, read the build log, add the missing variable, and redeploy. MakerKit intentionally fails fast on bad production config.

## Phase 7: Connect `theswell.live`

- [ ] In Vercel -> Project Settings -> Domains, add:
  ```text
  theswell.live
  ```

- [ ] Update DNS wherever the domain is registered using the records Vercel gives you.
- [ ] Wait for Vercel to show the domain as valid.
- [ ] Update Vercel `NEXT_PUBLIC_SITE_URL` to:
  ```text
  https://theswell.live
  ```

- [ ] Redeploy production.
- [ ] Reconfirm Supabase Site URL and Redirect URLs still match `https://theswell.live`.

## Phase 8: Configure Supabase Database Webhook

MakerKit uses a DB webhook for account/subscription cleanup. Even if billing is disabled now, configure the base webhook so the app is production-shaped.

- [ ] In Supabase Dashboard -> **Database > Webhooks**, enable webhooks.
- [ ] Create webhook:

| Setting | Value |
| --- | --- |
| Name | `subscriptions_delete` |
| Table | `public.subscriptions` |
| Events | `DELETE` |
| Type | HTTP Request |
| Method | POST |
| URL | `https://theswell.live/api/db/webhook` |
| Timeout | `5000` |

- [ ] Add header:

| Header | Value |
| --- | --- |
| `X-Supabase-Event-Signature` | Same value as `SUPABASE_DB_WEBHOOK_SECRET` |

## Phase 9: First Live Smoke Test

- [ ] Visit:
  ```text
  https://theswell.live
  ```

- [ ] Visit healthcheck:
  ```text
  https://theswell.live/api/healthcheck
  ```

- [ ] Create your production owner user in Supabase Auth.
- [ ] Add/confirm the owner membership in the production team account.
- [ ] Sign in at:
  ```text
  https://theswell.live/auth/sign-in
  ```

- [ ] Confirm you can reach:
  ```text
  https://theswell.live/home/the-swell/band
  ```

- [ ] Create one test member, song, and part.
- [ ] Delete the test records.
- [ ] Confirm no errors in Vercel logs.
- [ ] Confirm no RLS/auth errors in Supabase logs.

## Phase 10: Ongoing Release Checklist

For every new feature:

- [ ] Start from latest `main`:
  ```bash
  git checkout main
  git pull origin main
  ```

- [ ] Create a feature branch:
  ```bash
  git checkout -b feature/<short-name>
  ```

- [ ] Develop locally against Docker Supabase:
  ```bash
  pnpm run supabase:web:start
  pnpm dev
  ```

- [ ] If schema changed:
  ```bash
  pnpm run supabase:web:reset
  pnpm run supabase:web:test
  pnpm --filter web run supabase:db:lint
  pnpm run supabase:web:typegen
  ```

- [ ] Before PR:
  ```bash
  pnpm typecheck
  pnpm lint:fix
  pnpm format:fix
  pnpm --filter web run build
  ```

- [ ] Push branch:
  ```bash
  git push -u origin feature/<short-name>
  ```

- [ ] Open PR.
- [ ] Check Vercel preview deployment.
- [ ] Merge to `main`.
- [ ] Confirm Vercel production deployment.
- [ ] If migrations changed, push them to production Supabase:
  ```bash
  pnpm --filter web supabase db push
  ```

## Known Current Cleanup Items

- [ ] Change `apps/web/.env` public branding away from MakerKit defaults.
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://theswell.live` in production envs.
- [ ] Decide whether to keep billing disabled for the band OS phase.
- [ ] Add a documented production owner bootstrap path.
- [ ] Fix or silence the Next.js workspace-root warning caused by the extra `/Users/brianeichenberger/package-lock.json`.
- [ ] Add CI checks in GitHub Actions once the first Vercel deploy is stable.

## Reference Docs

- MakerKit production checklist: `docs/going-to-production/checklist.mdoc`
- MakerKit Supabase deployment: `docs/going-to-production/supabase.mdoc`
- MakerKit Vercel deployment: `docs/going-to-production/vercel.mdoc`
- MakerKit production env vars: `docs/going-to-production/production-environment-variables.mdoc`
- MakerKit common commands: `docs/installation/common-commands.mdoc`
