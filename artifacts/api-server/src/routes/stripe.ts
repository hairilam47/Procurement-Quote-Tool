import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import Stripe from "stripe";
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
    // Build an ordered list of exactly the 4 canonical plan prices.
    // Priority: explicit STRIPE_PRICE_* env var → cheapest active price for that interval.
    const plans = [
      { plan: "daily",   interval: "day" },
      { plan: "weekly",  interval: "week" },
      { plan: "monthly", interval: "month" },
      { plan: "yearly",  interval: "year" },
    ] as const;

    const rows: object[] = [];

    for (const { plan, interval } of plans) {
      const explicitId = PLAN_PRICE_IDS[plan];

      if (explicitId) {
        // Fetch the exact configured price
        const result = await db.execute(sql`
          SELECT
            p.id as price_id,
            p.unit_amount,
            p.currency,
            p.recurring,
            p.active
          FROM stripe.prices p
          WHERE p.id = ${explicitId}
          LIMIT 1
        `);
        if (result.rows.length) rows.push(result.rows[0] as object);
      } else {
        // Fallback: cheapest active price for this interval
        const result = await db.execute(sql`
          SELECT
            p.id as price_id,
            p.unit_amount,
            p.currency,
            p.recurring,
            p.active
          FROM stripe.prices p
          WHERE p.active = true
            AND (p.recurring->>'interval') = ${interval}
            AND (p.recurring->>'interval_count')::int = 1
          ORDER BY p.unit_amount ASC
          LIMIT 1
        `);
        if (result.rows.length) rows.push(result.rows[0] as object);
      }
    }

    res.json({ data: rows });
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

    // Resolve price from the synced DB — always correct for the current Stripe environment
    // (test prices in dev, live prices in production). Never use the STRIPE_PRICE_* env
    // vars here because they are shared across environments and contain test-mode IDs that
    // Stripe rejects when the live API key is active in production.
    const interval = PLAN_INTERVALS[plan];
    let priceId: string | undefined;
    try {
      const result = await db.execute(sql`
        SELECT id FROM stripe.prices
        WHERE active = true
          AND (recurring->>'interval') = ${interval}
          AND (recurring->>'interval_count')::int = 1
        ORDER BY unit_amount ASC
        LIMIT 1
      `);
      priceId = (result.rows[0] as { id: string } | undefined)?.id;
    } catch {
      // stripe schema may not be ready yet
    }

    if (!priceId) {
      res.status(503).json({
        error: "Pricing not configured yet. Please contact support.",
      });
      return;
    }

    let stripe: Stripe;
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

    // Narrow priceId to string (guard above already ensures it's defined)
    const resolvedPriceId = priceId as string;

    /** Create (or recover) a valid Stripe customer ID for this user. */
    async function resolveCustomerId(): Promise<string> {
      const existing = user?.stripeCustomerId;
      if (existing) return existing;
      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.name ?? undefined,
        metadata: { userId: req.userId },
      });
      await db
        .update(usersTable)
        .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
        .where(eq(usersTable.id, req.userId));
      return customer.id;
    }

    let customerId = await resolveCustomerId();

    /** Build the session params (DRY helper). */
    function sessionParams(cid: string): Stripe.Checkout.SessionCreateParams {
      return {
        customer: cid,
        payment_method_types: ["card"],
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/app?checkout=success`,
        cancel_url: `${baseUrl}/app/settings`,
        allow_promotion_codes: true,
        subscription_data: { metadata: { userId: req.userId } },
      };
    }

    /** Create checkout session, recovering once from a stale customer ID. */
    async function createSession(): Promise<Stripe.Checkout.Session> {
      try {
        return await stripe.checkout.sessions.create(sessionParams(customerId));
      } catch (err) {
        // If the stored customer ID belongs to a different Stripe environment
        // (e.g. a test-mode cus_XXX used with a live API key), clear it and
        // create a fresh customer, then retry once.
        const stripeErr = err as { type?: string; param?: string; code?: string };
        if (
          stripeErr?.type === "StripeInvalidRequestError" &&
          (stripeErr?.param === "customer" || stripeErr?.code === "resource_missing")
        ) {
          console.warn("[checkout-session] Stale customer ID, resetting:", customerId);
          await db
            .update(usersTable)
            .set({ stripeCustomerId: null, updatedAt: new Date() })
            .where(eq(usersTable.id, req.userId));
          const freshCustomer = await stripe.customers.create({
            email: user?.email,
            name: user?.name ?? undefined,
            metadata: { userId: req.userId },
          });
          customerId = freshCustomer.id;
          await db
            .update(usersTable)
            .set({ stripeCustomerId: customerId, updatedAt: new Date() })
            .where(eq(usersTable.id, req.userId));
          return stripe.checkout.sessions.create(sessionParams(customerId));
        }
        throw err;
      }
    }

    const session = await createSession();
    res.json({ url: session.url });
  } catch (err) {
    console.error("[checkout-session] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to create checkout session: ${msg}` });
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
        currentPeriodEnd: (subscription as unknown as { current_period_end: number }).current_period_end,
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
