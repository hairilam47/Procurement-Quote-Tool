import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";

function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  return "http://localhost:8080";
}

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

export const auth = betterAuth({
  database: pool,
  secret:
    process.env.BETTER_AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    "change-me-set-BETTER_AUTH_SECRET",
  baseURL: getBaseURL(),
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: googleProvider,
  plugins: [bearer()],
  trustedOrigins: ["*"],
  advanced: {
    cookiePrefix: "kuotflow",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const [existing] = await db
              .select({ id: usersTable.id })
              .from(usersTable)
              .where(eq(usersTable.id, user.id));
            if (!existing) {
              await db.insert(usersTable).values({
                id: user.id,
                email: user.email,
                name: user.name ?? null,
              });
            }
          } catch (err) {
            console.error("[auth] Failed to create users row for", user.id, err);
          }
        },
      },
    },
  },
});
