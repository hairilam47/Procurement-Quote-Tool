import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { requireAuth } from "./auth";

const router: IRouter = Router();

// Primary plan→price mapping via explicit env vars set at startup.
// These are populated by seed-products.ts which writes the Stripe price IDs
// after seeding, or can be set manually via STRIPE_PRICE_* env vars.
const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  daily: process.env.STRIPE_PRICE_DAILY,
  weekly: process.env.STRIPE_PRICE_WEEKLY,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
};

// DB interval fallback for plans not covered by env vars
const PLAN_INTERVALS: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

router.get("/stripe/mode", async (_req, res): Promise<void> => {
  try {
    const publishableKey = await getStripePublishableKey();
    const mode = publishableKey.startsWith("pk_live_")
      ? "live"
      : publishableKey.startsWith("pk_test_")
        ? "test"
        : "unknown";
    res.json({ mode });
  } catch {
    res.json({ mode: "unknown" });
  }
});

router.get("/stripe/prices", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id as price_id,
        p.unit_amount,
        p.currency,
        p.recurring,
        p.active
      FROM stripe.prices p
      WHERE p.active = true
      ORDER BY p.unit_amount ASC
    `);
    res.json({ data: result.rows });
  } catch {
    res.status(503).json({ error: "Stripe data unavailable" });
  }
});

router.post("/stripe/create-checkout-session", requireAuth, async (req, res): Promise<void> => {
  try {
    const { plan } = req.body as { plan?: string };

    const validPlans = ["daily", "weekly", "monthly", "yearly"] as const;
    if (!plan || !validPlans.includes(plan as (typeof validPlans)[number])) {
      res.status(400).json({ error: "Invalid plan. Must be daily, weekly, monthly, or yearly." });
      return;
    }

    // 1. Try explicit env var (fastest, no DB round-trip)
    let priceId: string | undefined = PLAN_PRICE_IDS[plan];

    // 2. Fall back to DB (stripe-replit-sync may have synced the price)
    if (!priceId) {
      const interval = PLAN_INTERVALS[plan];
      try {
        const result = await db.execute(sql`
          SELECT id FROM stripe.prices
          WHERE active = true
            AND (recurring->>'interval') = ${interval}
          ORDER BY unit_amount ASC
          LIMIT 1
        `);
        priceId = (result.rows[0] as { id: string } | undefined)?.id;
      } catch {
        // stripe schema may not be ready yet
      }
    }

    if (!priceId) {
      res.status(503).json({
        error: "Pricing not configured yet. Please contact support.",
      });
      return;
    }

    let stripe;
    try {
      stripe = await getUncachableStripeClient();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe is not configured";
      res.status(503).json({ error: `Payment unavailable: ${msg}` });
      return;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    let customerId = user?.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.name ?? undefined,
        metadata: { userId: req.userId },
      });
      customerId = customer.id;
      await db
        .update(usersTable)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(usersTable.id, req.userId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/app?checkout=success`,
      cancel_url: `${baseUrl}/app/settings`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId: req.userId },
      },
    });

    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/stripe/subscription", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user?.stripeSubscriptionId) {
      res.json({ subscription: null });
      return;
    }

    let stripe;
    try {
      stripe = await getUncachableStripeClient();
    } catch {
      res.json({ subscription: null });
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
      expand: ["items.data.price.product"],
    });

    const item = subscription.items.data[0];
    const price = item?.price;
    const product = price?.product as { name?: string } | undefined;

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: product?.name ?? price?.nickname ?? "Subscription",
        interval: price?.recurring?.interval ?? null,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.post("/stripe/customer-portal", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found. Please subscribe first." });
      return;
    }

    let stripe;
    try {
      stripe = await getUncachableStripeClient();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe is not configured";
      res.status(503).json({ error: `Billing portal unavailable: ${msg}` });
      return;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/app/settings`,
    });

    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

export default router;
