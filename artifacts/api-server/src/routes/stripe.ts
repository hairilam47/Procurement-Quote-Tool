import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

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

router.post("/stripe/create-checkout-session", async (req, res) => {
  const { plan } = req.body as { plan?: string };

  const validPlans = ["daily", "weekly", "monthly", "yearly"] as const;
  if (!plan || !validPlans.includes(plan as (typeof validPlans)[number])) {
    return res.status(400).json({ error: "Invalid plan. Must be daily, weekly, monthly, or yearly." });
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
    return res.status(503).json({
      error: "Pricing not configured yet. Please contact support.",
    });
  }

  const stripe = await getUncachableStripeClient();
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${baseUrl}/sign-in?checkout=success`,
    cancel_url: `${baseUrl}/marketing/#pricing`,
    allow_promotion_codes: true,
  });

  return res.json({ url: session.url });
});

export default router;
