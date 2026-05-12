import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import Stripe from "stripe";
import { getStripeClient, getStripePublishableKey } from "../stripeClient";
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
    // Canonical plan order for display
    const plans = [
      { plan: "daily"   as const, interval: "day"   },
      { plan: "weekly"  as const, interval: "week"  },
      { plan: "monthly" as const, interval: "month" },
      { plan: "yearly"  as const, interval: "year"  },
    ];

    // Collect the plans that have an explicit price ID configured
    const explicitIds = plans
      .map(({ plan }) => PLAN_PRICE_IDS[plan])
      .filter((id): id is string => Boolean(id));

    interface PriceRow {
      price_id: string;
      unit_amount: number;
      currency: string;
      recurring: { interval: string; interval_count: number } | null;
      active: boolean;
    }

    let fetchedRows: PriceRow[] = [];

    if (explicitIds.length > 0) {
      // Single parameterized query for all configured price IDs — no sequential round trips.
      // sql.join produces safe bound parameters rather than raw string interpolation.
      const idList = sql.join(explicitIds.map((id) => sql`${id}`), sql`, `);
      const result = await db.execute(sql`
        SELECT
          p.id as price_id,
          p.unit_amount,
          p.currency,
          p.recurring,
          p.active
        FROM stripe.prices p
        WHERE p.id IN (${idList})
      `);
      fetchedRows = result.rows as unknown as PriceRow[];
    }

    // Re-order to canonical plan order; fall back to per-interval DB query for any missing plan
    const rows: PriceRow[] = [];
    for (const { plan, interval } of plans) {
      const explicitId = PLAN_PRICE_IDS[plan];
      if (explicitId) {
        const found = fetchedRows.find((r) => r.price_id === explicitId);
        if (found) { rows.push(found); continue; }
      }
      // Fallback: query by interval, scoped to the subscription product to avoid
      // rogue prices. Falls back to unscoped only when product ID is not configured.
      const productId = process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID;
      const result = await db.execute(productId
        ? sql`
          SELECT
            p.id as price_id,
            p.unit_amount,
            p.currency,
            p.recurring,
            p.active
          FROM stripe.prices p
          WHERE p.active = true
            AND p.product = ${productId}
            AND (p.recurring->>'interval') = ${interval}
            AND (p.recurring->>'interval_count')::int = 1
          ORDER BY p.created ASC
          LIMIT 1
        `
        : sql`
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
          ORDER BY p.created ASC
          LIMIT 1
        `
      );
      if (result.rows.length) rows.push(result.rows[0] as unknown as PriceRow);
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

    // Resolve the price ID for this plan.
    // Priority 1: explicit STRIPE_PRICE_* env var — always correct, bypasses DB entirely.
    //   These must be live-mode price IDs from the same Stripe account as the API key.
    // Priority 2: product-scoped DB query (STRIPE_SUBSCRIPTION_PRODUCT_ID required).
    //   Falls back to this when env vars are absent, but the DB may contain test-mode
    //   prices that won't work in a live-mode production deployment.
    let priceId: string | undefined = PLAN_PRICE_IDS[plan];

    if (priceId) {
      console.info(`[checkout-session] Using env var price for plan=${plan}: ${priceId}`);
    } else {
      const subscriptionProductId = process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID;
      if (!subscriptionProductId) {
        console.error("[checkout-session] No STRIPE_PRICE_* env var set and STRIPE_SUBSCRIPTION_PRODUCT_ID is not configured");
        res.status(503).json({ error: "Payment configuration incomplete. Please contact support." });
        return;
      }

      const interval = PLAN_INTERVALS[plan];
      try {
        const result = await db.execute(sql`
          SELECT id FROM stripe.prices
          WHERE active = true
            AND product = ${subscriptionProductId}
            AND (recurring->>'interval') = ${interval}
            AND (recurring->>'interval_count')::int = 1
          ORDER BY created ASC
          LIMIT 1
        `);
        priceId = (result.rows[0] as { id: string } | undefined)?.id;
      } catch {
        // stripe schema may not be ready yet
      }

      if (!priceId) {
        console.error(`[checkout-session] No active price found for product=${subscriptionProductId} interval=${interval}`);
        res.status(503).json({
          error: "Pricing not configured yet. Please contact support.",
        });
        return;
      }

      console.info(`[checkout-session] Using DB price for plan=${plan}: ${priceId}`);
    }

    let stripe: Stripe;
    try {
      stripe = await getStripeClient();
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
      stripe = await getStripeClient();
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
        currentPeriodEnd: item?.current_period_end ?? null,
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
      stripe = await getStripeClient();
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
