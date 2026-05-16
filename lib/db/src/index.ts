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
  // Keep at least 1 connection alive so the pool never fully drains between
  // requests. Without this, low-traffic periods cause the TCP+TLS+auth
  // handshake to run on the next request (~600-800 ms penalty).
  min: 1,
  // Default is 10 s which is too aggressive for a server that handles bursts.
  // 60 s gives ample breathing room between requests without leaking resources.
  idleTimeoutMillis: 60_000,
  // Hard timeout for acquiring a connection so we fail fast rather than hang.
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
