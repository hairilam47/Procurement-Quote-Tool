import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep 1 connection alive so the pool never fully drains between requests.
  // Without this, every visit after >30 s idle pays a ~700-800 ms Neon
  // cold-start penalty (TCP+TLS+auth handshake).
  // The pool.on('error') handler below prevents the previous crash when Neon
  // kills the idle connection — pg-pool catches it and reconnects automatically.
  min: 1,
  // Release connections above the minimum after 60 s idle. Neon's own idle
  // timeout is ~2 min, so this proactively cleans up surplus connections first.
  idleTimeoutMillis: 60_000,
  // Hard timeout for acquiring a connection so we fail fast rather than hang.
  connectionTimeoutMillis: 5_000,
});

// Neon (serverless Postgres) terminates idle connections without warning.
// Without this listener Node.js treats the emitted 'error' as an unhandled
// exception and crashes the process. Log it and let pg-pool reconnect.
pool.on("error", (err) => {
  console.error("[db-pool] idle client error — Neon terminated the connection:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
