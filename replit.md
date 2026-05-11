# QuoteFlow — IT Services Quotation Management System

## Overview

Production-ready quotation management system for IT service companies. Allows IT consultants and agencies to create, manage, and send professional PDF quotations to clients.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend (dashboard)**: React + Vite (artifact, port 23183, preview path `/`)
- **Frontend (marketing)**: React + Vite (artifact, port 22813, preview path `/marketing/`)
- **API**: Express 5 (api-server artifact, port 8080)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (`@clerk/react` v6, `@clerk/express`)
- **Payments**: Stripe (via Replit integration) + `stripe-replit-sync` for DB sync
- **Validation**: Zod
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **PDF generation**: `@react-pdf/renderer` (MODERN and CLASSIC templates)
- **Storage**: Replit Object Storage (logo uploads)

## Project Structure

```
artifacts/
  dashboard/          # React+Vite frontend (Clerk auth, all pages)
  marketing/          # React+Vite marketing landing page (public, /marketing/)
  api-server/         # Express 5 backend (all routes, PDF generation, Stripe)
lib/
  db/                 # Drizzle ORM schema + DB connection
  api-spec/           # OpenAPI spec (source of truth)
  api-zod/            # Generated Zod schemas (from Orval)
  api-client-react/   # Generated React Query hooks (from Orval)
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server (builds first)
- `pnpm --filter @workspace/dashboard run dev` — run dashboard dev server

## Database Schema

- `users` — Clerk-synced user accounts (includes `stripe_customer_id`, `stripe_subscription_id`)
- `company_settings` — singleton company profile + invoice defaults
- `clients` — client contacts and addresses
- `quotations` — quotations with status flow (DRAFT→SENT→ACCEPTED/REJECTED/PAID/EXPIRED)
- `line_items` — quotation line items (description, qty, unit, price)
- `stripe.*` — managed by `stripe-replit-sync` (products, prices, customers, subscriptions, etc.)

## Pages (Frontend)

- `/` — Dashboard with stats, status chart, recent quotations
- `/quotations` — Quotation list (searchable, filterable by status)
- `/quotations/new` — Create quotation form
- `/quotations/:id` — Quotation detail + status management + PDF download
- `/quotations/:id/edit` — Edit quotation
- `/clients` — Client card grid (searchable)
- `/clients/new` — Create client form
- `/clients/:id` — Client detail with quotation history
- `/clients/:id/edit` — Edit client
- `/settings` — Company settings with logo upload
- `/sign-in` — Clerk sign-in page

## API Routes

All under `/api/`:
- `GET /healthz` — Health check
- `POST /auth/seed` — First-run seed: upsert user + ensure company_settings row exists
- `POST /auth/sync` — Sync Clerk user to DB
- `GET /auth/me` — Current user
- `GET|POST /clients` — List / create clients
- `GET|PUT|DELETE /clients/:id` — Get / update / delete client
- `GET|POST /quotations` — List / create quotations
- `GET|PUT|DELETE /quotations/:id` — Get / update / delete quotation
- `POST /quotations/:id/status` — Change status
- `POST /quotations/:id/duplicate` — Duplicate quotation
- `GET /quotations/:id/pdf` — Generate PDF (MODERN or CLASSIC template)
- `GET|PUT /settings` — Get / update company settings
- `POST /settings/logo` — Upload company logo
- `GET /dashboard` — Dashboard stats
- `GET /stripe/prices` — List active Stripe prices (public)
- `POST /stripe/create-checkout-session` — Create Stripe Checkout session (accepts `{ plan: "daily"|"weekly"|"monthly"|"yearly" }`)
- `POST /api/stripe/webhook` — Stripe webhook (registered before express.json())

## Stripe Notes

- Stripe integration connected via Replit native connector
- `stripe-replit-sync` syncs Stripe data to `stripe.*` schema in PostgreSQL
- `stripe` and `stripe-replit-sync` are **externalized** in `build.mjs` (required so `runMigrations` can resolve its SQL migration files at runtime)
- Webhook is auto-managed via `findOrCreateManagedWebhook()`
- `initStripe()` runs on startup: migrations → StripeSync → webhook → syncBackfill
- 4 pricing tiers: Daily $2.99/day, Weekly $9.99/week, Monthly $29.99/mo, Yearly $199.99/yr
- Seed script: `artifacts/api-server/src/seed-products.ts`
- `GET /api/stripe/mode` returns `{ mode: "live" | "test" | "unknown" }` (no auth required)

## Connecting Live Stripe in Production

To switch from test mode to live mode in the deployed app:

1. Open the **Integrations** tab in the Replit workspace sidebar
2. Click the **Stripe** integration → **Manage connection**
3. Add a **production** connection (alongside the existing development one) using your live Stripe secret and publishable keys (`sk_live_…` / `pk_live_…`)
4. Redeploy the app — `REPLIT_DEPLOYMENT=1` causes `stripeClient.ts` to request the `production` environment credentials automatically
5. After deployment, visit **Settings → Billing** in the dashboard — the mode badge should show green **"Live mode"**

If the badge shows red **"Stripe is not configured"** after deploying:
- Verify the production Stripe connection exists in the Integrations tab
- Check deployment logs for `Failed to fetch Stripe credentials` errors
- Ensure the Stripe webhook is re-registered for the production domain (handled automatically by `initStripe()` on startup)

## Marketing Page Notes

- Public page at `/marketing/` — no auth required
- Nav "Log in" → `/sign-in`, "Sign up" → `/sign-up` (plain `<a>` tags, not wouter)
- Pricing toggle: daily/weekly/monthly/yearly, fetches live prices from `/api/stripe/prices`
- Subscribe buttons call `POST /api/stripe/create-checkout-session` and redirect to Stripe Checkout
- SEO: full meta tags, OG, Twitter Card, JSON-LD (WebSite + Organization + SoftwareApplication + FAQPage)
- `sitemap.xml` and `robots.txt` served from `artifacts/marketing/public/`

## Auth Notes

- Clerk v6 (`@clerk/react`) — uses `Show`, `useAuth`, `useClerk`, `publishableKeyFromHost`
- `proxyUrl` is only set in production via `VITE_CLERK_PROXY_URL` (empty in dev)
- Frontend routing uses Wouter with base path from `import.meta.env.BASE_URL`
- Protected routes guarded by `<Show when="signed-in">` / `<Show when="signed-out">`
- On first sign-in, `SyncUser` calls `POST /api/auth/seed` (with `credentials: "include"`) to create the company_settings row

## Frontend Notes

- Sidebar collapses on mobile behind a hamburger button (`data-testid="mobile-menu-btn"`)
- `data-testid` attributes are on all key interactive elements for testing
- Quotation form shows live per-row totals (qty × unitPrice) and grand total
- Status filter uses `"ALL"` as the value for "All statuses" (Radix Select rejects empty strings)
- Logo upload uses `credentials: "include"` to pass the Clerk session cookie

## Important Notes

- `@swc/helpers` must be installed in api-server (it's an external dependency used by react bundled with @react-pdf/renderer)
- `react` and `zod` are listed as api-server dependencies (needed for PDF templates and validation)
- Clerk proxy middleware is production-only; dev uses Clerk CDN directly
- drizzle-zod is NOT used (incompatible with zod v3 + v4 mix); schemas use `$inferSelect`/`$inferInsert`
