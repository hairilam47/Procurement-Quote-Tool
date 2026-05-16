import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";

function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",").map((d) => d.trim());
    // Prefer custom domains (non-replit.app) so OAuth shows the branded domain
    const custom = domains.find((d) => !d.endsWith(".replit.app"));
    return `https://${custom ?? domains[0]}`;
  }
  return "http://localhost:8080";
}

function getTrustedOrigins(): string[] {
  const origins: string[] = ["http://localhost:8080", "http://localhost:5173"];
  if (process.env.REPLIT_DOMAINS) {
    for (const d of process.env.REPLIT_DOMAINS.split(",")) {
      origins.push(`https://${d.trim()}`);
    }
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  return origins;
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

async function sendVerificationEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[auth] RESEND_API_KEY not set — skipping verification email for", email);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "KuotFlow <noreply@kuotflow.app>",
        to: email,
        subject: "Verify your KuotFlow email address",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1e293b;margin-bottom:8px">Verify your email</h2>
            <p style="color:#475569;margin-bottom:24px">
              Thanks for signing up for KuotFlow. Click the button below to verify your email address.
            </p>
            <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
              Verify email
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">
              If you didn't sign up for KuotFlow, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[auth] Resend error:", res.status, body);
    }
  } catch (err) {
    console.error("[auth] Failed to send verification email:", err);
  }
}

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET,
  baseURL: getBaseURL(),
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: googleProvider,
  plugins: [bearer()],
  trustedOrigins: getTrustedOrigins(),
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
