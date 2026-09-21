# StreetSync Municipal Dashboard

Ops console for municipal admins to triage StreetSync citizen reports.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Leaflet + OpenStreetMap
- Supabase Postgres (`reports` table — same DB as the Flutter app)

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server only; never commit)

Use the **same Supabase project** as `street_sync` (same Postgres that backs the FastAPI API).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data flow

- **Read:** `GET /api/reports` → Supabase `reports` where `is_draft = false`
- **Write:** `PATCH /api/reports/:id/status` → updates **only** the `status` column

Allowed statuses: `Open`, `In Progress`, `Resolved` (matches the mobile app / API).

If Supabase env vars are missing, the UI falls back to synthetic demo data.

## Related repos

- `street_sync` — Flutter citizen app + FastAPI
- StreetSync marketing demo site — separate brand surface
