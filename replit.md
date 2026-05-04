# QuoteFlow — IT Services Quotation Management System

## Overview

Production-ready quotation management system for IT service companies. Allows IT consultants and agencies to create, manage, and send professional PDF quotations to clients.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (dashboard artifact, port 23183, preview path `/`)
- **API**: Express 5 (api-server artifact, port 8080)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (`@clerk/react` v6, `@clerk/express`)
- **Validation**: Zod
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **PDF generation**: `@react-pdf/renderer` (MODERN and CLASSIC templates)
- **Storage**: Replit Object Storage (logo uploads)

## Project Structure

```
artifacts/
  dashboard/          # React+Vite frontend (Clerk auth, all pages)
  api-server/         # Express 5 backend (all routes, PDF generation)
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

- `users` — Clerk-synced user accounts
- `company_settings` — singleton company profile + invoice defaults
- `clients` — client contacts and addresses
- `quotations` — quotations with status flow (DRAFT→SENT→ACCEPTED/REJECTED/PAID/EXPIRED)
- `line_items` — quotation line items (description, qty, unit, price)

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
