import { Router, Request, Response, NextFunction } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, usersTable, clientsTable, quotationsTable, invoicesTable, companySettingsTable } from "@workspace/db";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { getUncachableStripeClient } from "../stripeClient";

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

const FREE_TRIAL_LIMIT = 1;

/**
 * Require an active or trialing Stripe subscription, OR within free-trial limits.
 *
 * Resolution order:
 *  1. Short-circuit on req.subscriptionActive (already verified by an earlier middleware in the chain)
 *  2. Check users.stripeSubscriptionId — if missing, check free-trial eligibility
 *     a. If trialDismissedAt is null → user hasn't seen the modal yet → block (modal will show)
 *     b. If trialDismissedAt is set → user is in free-trial mode → check record counts
 *        - ≤1 client, ≤1 quotation, ≤1 invoice → allow
 *        - Any limit exceeded → return 402 with trial-limit message
 *  3. Query the synced stripe.subscriptions table for the subscription status
 *  4. If the DB row is present and status is active/trialing → allow
 *  5. If the DB row is present but status is something else → reject
 *  6. If the DB row is missing OR the query fails → fall back to Stripe API (fail-closed)
 *  7. If Stripe API also fails → reject (fail-closed)
 */
export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.subscriptionActive === true) {
    next();
    return;
  }

  try {
    const [user] = await db
      .select({
        stripeSubscriptionId: usersTable.stripeSubscriptionId,
        trialDismissedAt: usersTable.trialDismissedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user?.stripeSubscriptionId) {
      // No subscription — check free-trial mode
      if (!user?.trialDismissedAt) {
        // User hasn't dismissed the modal yet — block so the frontend can show the modal
        res.status(402).json({
          error: "subscription_required",
          message: "An active subscription is required. Please subscribe to continue.",
        });
        return;
      }

      // User is in free-trial mode — check record counts
      const [[clientCount], [quotationCount], [invoiceCount]] = await Promise.all([
        db.select({ n: count() }).from(clientsTable).where(eq(clientsTable.userId, req.userId)),
        db.select({ n: count() }).from(quotationsTable).where(eq(quotationsTable.userId, req.userId)),
        db.select({ n: count() }).from(invoicesTable).where(eq(invoicesTable.userId, req.userId)),
      ]);

      const clients = clientCount?.n ?? 0;
      const quotations = quotationCount?.n ?? 0;
      const invoices = invoiceCount?.n ?? 0;

      if (clients > FREE_TRIAL_LIMIT || quotations > FREE_TRIAL_LIMIT || invoices > FREE_TRIAL_LIMIT) {
        res.status(402).json({
          error: "trial_limit_reached",
          message: "Free trial limit reached. Subscribe to continue.",
        });
        return;
      }

      // Within free-trial limits — allow the request
      next();
      return;
    }

    const subscriptionId = user.stripeSubscriptionId;
    let resolvedStatus: string | null = null;
    let dbQueryFailed = false;
    let dbRowMissing = false;

    try {
      const result = await db.execute(sql`
        SELECT status FROM stripe.subscriptions
        WHERE id = ${subscriptionId}
        LIMIT 1
      `);
      const row = result.rows[0] as { status?: string } | undefined;
      if (row?.status) {
        resolvedStatus = row.status;
      } else {
        dbRowMissing = true;
      }
    } catch {
      dbQueryFailed = true;
    }

    if (resolvedStatus !== null) {
      if (resolvedStatus === "active" || resolvedStatus === "trialing") {
        req.subscriptionActive = true;
        next();
      } else {
        res.status(402).json({
          error: "subscription_required",
          message: "Your subscription is not active. Please renew to continue.",
        });
      }
      return;
    }

    if (dbQueryFailed || dbRowMissing) {
      try {
        const stripe = await getUncachableStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.status === "active" || subscription.status === "trialing") {
          req.subscriptionActive = true;
          next();
        } else {
          res.status(402).json({
            error: "subscription_required",
            message: "Your subscription is not active. Please renew to continue.",
          });
        }
      } catch {
        res.status(402).json({
          error: "subscription_required",
          message: "Unable to verify your subscription. Please try again or contact support.",
        });
      }
      return;
    }

    res.status(402).json({
      error: "subscription_required",
      message: "An active subscription is required. Please subscribe to continue.",
    });
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

    const [settings] = await db
      .select()
      .from(companySettingsTable)
      .where(eq(companySettingsTable.userId, userId));
    if (!settings) {
      await db.insert(companySettingsTable).values({
        userId,
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

// Dismiss the subscription modal — enters free-trial mode
router.post("/user/dismiss-trial", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await db
      .update(usersTable)
      .set({ trialDismissedAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to dismiss trial" });
  }
});

export default router;
