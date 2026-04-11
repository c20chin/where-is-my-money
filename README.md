# Where Is My Money

A personal finance tracking app to record monthly balance snapshots across all your bank accounts, organized by saving type and currency.

## Prerequisites

- **Node.js 20+** (use `nvm use` — `.nvmrc` is included)
- **pnpm** (enable via `corepack enable pnpm`)
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)

## Setup

### 1. Install dependencies

```bash
nvm use
pnpm install
```

### 2. Configure environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard — connection string (**server-side only**, never use `NEXT_PUBLIC_` prefix) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console > APIs & Services > Credentials > OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |

For Google OAuth, set these in the Google Cloud Console:
- **Authorized JavaScript origins:** `http://localhost:3000`
- **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google`

### 3. Set up the database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

### Environment separation

| Environment | Triggered by | env file / vars set in |
|---|---|---|
| **Local dev** | `pnpm dev` | `apps/web/.env.local` (git-ignored) |
| **Preview** | Every PR / non-main branch push on Vercel | Vercel project → Settings → Environment Variables (scope: *Preview*) |
| **Production** | Push / merge to `main` on Vercel | Vercel project → Settings → Environment Variables (scope: *Production*) |

Because only you and your partner use the app, a single Neon database shared across all environments is fine to start.
When you want isolation (e.g. a staging database) simply create a second Neon branch and point the Preview env vars at it.

---

### Deploying to Vercel

1. **Import the repository** on [vercel.com/new](https://vercel.com/new).

2. **Set the Root Directory** to `apps/web` (Vercel dashboard → project settings or the import wizard).
   `apps/web/vercel.json` already provides the correct build/install commands for the Turborepo monorepo so no extra configuration is needed in the dashboard.

3. **Add environment variables** in Vercel → Settings → Environment Variables for *both* the **Preview** and **Production** scopes:

   | Variable | Description | Server-side only? |
   |---|---|:---:|
   | `DATABASE_URL` | Neon connection string | ✅ Yes — never prefix with `NEXT_PUBLIC_` |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ Yes |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ Yes |
   | `NEXTAUTH_SECRET` | Random 32-byte secret (`openssl rand -base64 32`) | ✅ Yes |
   | `NEXTAUTH_URL` | Full base URL of the deployment (e.g. `https://wimm.vercel.app`) | ✅ Yes |

   > **Security note:** `DATABASE_URL` and all auth credentials must remain server-side secrets.
   > Never rename them with a `NEXT_PUBLIC_` prefix — that would embed them in the client JS bundle.

4. **Update Google OAuth** in [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth client:
   - **Authorized JavaScript origins** — add your production URL (e.g. `https://wimm.vercel.app`)
   - **Authorized redirect URIs** — add `https://wimm.vercel.app/api/auth/callback/google`
   - Repeat for each preview URL if you want OAuth to work on preview deployments too (or use a wildcard pattern if your Google OAuth app supports it)

5. **Run database migrations** once against your production database:
   ```bash
   DATABASE_URL=<production-neon-url> pnpm db:migrate
   DATABASE_URL=<production-neon-url> pnpm db:seed
   ```
   Alternatively run them from the Neon SQL editor or a one-off Vercel deployment step.

---

## Project Structure

```
where-is-my-money/
├── apps/web/              # Next.js 14 app (App Router)
│   ├── src/app/           # Pages and API routes
│   ├── src/components/    # UI components
│   ├── src/lib/           # Auth, DB, utilities
│   └── src/hooks/         # React hooks
├── packages/db/           # Drizzle ORM schema, migrations, seed
├── packages/validators/   # Zod validation schemas
└── packages/types/        # Shared TypeScript types
```

## Tech Stack

Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), Auth.js (Google OAuth), Recharts, Turborepo + pnpm
