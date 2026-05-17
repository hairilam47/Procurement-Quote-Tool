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
  // min: 0 — let Neon reclaim idle connections naturally. Keeping min: 1
  // caused the server to crash every ~2 min: Neon terminates the idle
  // connection, pg-pool emits an unhandled 'error' event, Node.js crashes.
  min: 0,
  // Close idle connections after 30 s so the pool drains before Neon
  // forcibly kills them (Neon's idle timeout is ~2 min in practice).
  idleTimeoutMillis: 30_000,
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
