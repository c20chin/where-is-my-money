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
| `DATABASE_URL` | Neon dashboard — connection string |
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
