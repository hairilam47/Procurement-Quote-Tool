import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

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

  const interval = plan ? PLAN_INTERVALS[plan] : undefined;
  if (!interval) {
    return res.status(400).json({ error: "Invalid plan. Must be daily, weekly, monthly, or yearly." });
  }

  let priceId: string | undefined;

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
    // stripe schema may not exist yet
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

  res.json({ url: session.url });
});

export default router;
