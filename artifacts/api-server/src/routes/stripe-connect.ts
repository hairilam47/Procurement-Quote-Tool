import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { requireAuth } from "./auth";
import crypto from "crypto";

const router: IRouter = Router();

const STRIPE_CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID;

/**
 * Server-side nonce store for CSRF protection.
 * Maps nonce → userId. Expires entries after 10 minutes.
 */
const pendingNonces = new Map<string, { userId: string; expiresAt: number }>();

function createNonce(userId: string): string {
  const nonce = crypto.randomBytes(32).toString("hex");
  pendingNonces.set(nonce, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return nonce;
}

function consumeNonce(nonce: string): string | null {
  const entry = pendingNonces.get(nonce);
  pendingNonces.delete(nonce);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

router.get("/stripe/connect/status", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.id, req.clerkUserId));

    if (!user?.stripeAccountId) {
      res.json({ connected: false, accountId: null, displayName: null });
      return;
    }

    const stripe = await getUncachableStripeClient();
    try {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      const displayName =
        account.business_profile?.name ??
        account.email ??
        user.stripeAccountId;
      res.json({ connected: true, accountId: user.stripeAccountId, displayName });
    } catch {
      res.json({ connected: true, accountId: user.stripeAccountId, displayName: user.stripeAccountId });
    }
  } catch {
    res.status(500).json({ error: "Failed to fetch Stripe Connect status" });
  }
});

router.get("/stripe/connect", requireAuth, async (req, res): Promise<void> => {
  if (!STRIPE_CLIENT_ID) {
    res.status(503).json({ error: "Stripe Connect is not configured. Set STRIPE_CONNECT_CLIENT_ID." });
    return;
  }

  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  const redirectUri = `${baseUrl}/api/stripe/connect/callback`;

  const nonce = createNonce(req.clerkUserId);

  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", STRIPE_CLIENT_ID);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", nonce);

  res.redirect(url.toString());
});

/**
 * OAuth callback — called by Stripe after the user authorizes.
 * Uses requireAuth (Clerk cookie session) to identify the authenticated user,
 * then validates the nonce from state against server-side storage to prevent CSRF.
 */
router.get("/stripe/connect/callback", requireAuth, async (req, res): Promise<void> => {
  const { code, error, error_description, state } = req.query as Record<string, string | undefined>;
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  const settingsUrl = `${baseUrl}/settings?stripe_connect=`;

  if (error || !code) {
    const msg = error_description ?? error ?? "Authorization failed";
    res.redirect(`${settingsUrl}error&reason=${encodeURIComponent(msg)}`);
    return;
  }

  if (!state) {
    res.redirect(`${settingsUrl}error&reason=missing_state`);
    return;
  }

  const nonceUserId = consumeNonce(state);
  if (!nonceUserId) {
    res.redirect(`${settingsUrl}error&reason=invalid_or_expired_state`);
    return;
  }

  if (nonceUserId !== req.clerkUserId) {
    res.redirect(`${settingsUrl}error&reason=state_user_mismatch`);
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const response = await stripe.oauth.token({ grant_type: "authorization_code", code });
    const stripeUserId = response.stripe_user_id;

    if (!stripeUserId) {
      res.redirect(`${settingsUrl}error&reason=no_account_id`);
      return;
    }

    await db
      .update(usersTable)
      .set({ stripeAccountId: stripeUserId, updatedAt: new Date() })
      .where(eq(usersTable.id, req.clerkUserId));

    res.redirect(`${settingsUrl}success`);
  } catch (err) {
    console.error("[stripe-connect] callback error:", err);
    const msg = err instanceof Error ? err.message : "OAuth exchange failed";
    res.redirect(`${settingsUrl}error&reason=${encodeURIComponent(msg)}`);
  }
});

router.delete("/stripe/connect", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.id, req.clerkUserId));

    if (!user?.stripeAccountId) {
      res.status(400).json({ error: "No Stripe account connected" });
      return;
    }

    if (STRIPE_CLIENT_ID) {
      try {
        const stripe = await getUncachableStripeClient();
        await stripe.oauth.deauthorize({
          client_id: STRIPE_CLIENT_ID,
          stripe_user_id: user.stripeAccountId,
        });
      } catch (err) {
        console.warn("[stripe-connect] deauthorize warning:", err);
      }
    }

    await db
      .update(usersTable)
      .set({ stripeAccountId: null, updatedAt: new Date() })
      .where(eq(usersTable.id, req.clerkUserId));

    res.json({ disconnected: true });
  } catch {
    res.status(500).json({ error: "Failed to disconnect Stripe account" });
  }
});

export default router;
