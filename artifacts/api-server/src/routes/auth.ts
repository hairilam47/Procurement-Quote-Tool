import { Router, Request, Response, NextFunction } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, companySettingsTable } from "@workspace/db";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

const router = Router();

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = session.user.id;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [user] = await db
      .select({ stripeSubscriptionId: usersTable.stripeSubscriptionId })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user?.stripeSubscriptionId) {
      res.status(402).json({
        error: "subscription_required",
        message: "An active subscription is required. Please subscribe to continue.",
      });
      return;
    }

    try {
      const result = await db.execute(sql`
        SELECT status FROM stripe.subscriptions
        WHERE id = ${user.stripeSubscriptionId}
        LIMIT 1
      `);
      const row = result.rows[0] as { status?: string } | undefined;
      if (row && row.status !== "active" && row.status !== "trialing") {
        res.status(402).json({
          error: "subscription_required",
          message: "Your subscription is not active. Please renew to continue.",
        });
        return;
      }
    } catch {
      // Stripe schema unavailable — trust the stored subscription ID
    }

    next();
  } catch {
    res.status(500).json({ error: "Failed to verify subscription" });
  }
}

// Expose server-detected auth capabilities so clients don't need
// to rely on client-side env vars to know what's available.
router.get("/capabilities", (_req: Request, res: Response): void => {
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// Mobile OAuth callback — called by better-auth after social sign-in.
// Reads the cookie session, extracts the bearer token, and redirects
// to the mobile app's deep link with the token so the app can persist it.
router.get("/mobile-callback", async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.session?.token) {
      res.redirect("mobile://auth-callback?error=auth_failed");
      return;
    }

    const token = session.session.token;
    res.redirect(`mobile://auth-callback?token=${encodeURIComponent(token)}`);
  } catch {
    res.redirect("mobile://auth-callback?error=auth_failed");
  }
});

// First-run seed: upsert user record + ensure company_settings row exists
// Note: uses /user/seed prefix to avoid conflict with better-auth's /auth/* handler
router.post("/user/seed", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    let user;
    if (existing) {
      user = existing;
    } else {
      const { email, name } = req.body as { email?: string; name?: string };
      const [created] = await db
        .insert(usersTable)
        .values({
          id: userId,
          email: email ?? `${userId}@unknown.com`,
          name: name ?? null,
        })
        .returning();
      user = created;
    }

    // Ensure at least one company_settings row exists (first-run seed)
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (!settings) {
      await db.insert(companySettingsTable).values({
        name: "My Company",
        email: user!.email,
        addressLine1: "",
        city: "",
        postalCode: "",
        country: "",
        currency: "USD",
        defaultTaxRate: "0",
        defaultTemplate: "MODERN",
      });
    }

    res.json({ user, seeded: !settings });
  } catch {
    res.status(500).json({ error: "Failed to seed" });
  }
});

// Get current user info
router.get("/user/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
