import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripePublishableKey, getStripeSync } from "./stripeClient";
import { db, quotationsTable } from "@workspace/db";
import { sql, and, isNotNull, eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }

  try {
    // Log which Stripe mode is active so future mismatches are immediately visible.
    try {
      const pk = await getStripePublishableKey();
      const mode = pk.startsWith("pk_live_") ? "LIVE" : pk.startsWith("pk_test_") ? "TEST" : "UNKNOWN";
      logger.info(`Stripe mode: ${mode}`);
    } catch {
      logger.warn("Could not determine Stripe mode — credentials may not be ready yet");
    }

    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    // Prefer the custom domain (e.g. kuotflow.com) over the *.replit.app
    // fallback so Stripe delivers webhooks to the right endpoint.
    const allDomains = (process.env.REPLIT_DOMAINS ?? "").split(",").filter(Boolean);
    const preferredDomain = allDomains.find((d) => !d.endsWith(".replit.app")) ?? allDomains[0];
    const webhookBaseUrl = `https://${preferredDomain}`;
    logger.info({ url: `${webhookBaseUrl}/api/stripe/webhook` }, "Setting up managed webhook");
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Webhook configured");

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err: unknown) => logger.error({ err }, "Stripe syncBackfill error"));
  } catch (err) {
    logger.error({ err }, "Failed to initialize Stripe — continuing without it");
  }
}

await initStripe();

// Backfill: existing quotations that have a paymentUrl but still carry the default
// paymentMethod of "none" (created before this feature was added) should be treated
// as stripe so their PDFs continue to render the payment block correctly.
async function backfillPaymentMethod() {
  if (!process.env.DATABASE_URL) return;
  try {
    await db
      .update(quotationsTable)
      .set({ paymentMethod: "stripe" })
      .where(
        and(
          eq(quotationsTable.paymentMethod, "none"),
          isNotNull(quotationsTable.paymentUrl),
        ),
      );
    logger.info("Payment method backfill complete");
  } catch (err) {
    logger.error({ err }, "Payment method backfill failed — continuing");
  }
}

await backfillPaymentMethod();

if (!process.env.RESEND_API_KEY) {
  logger.warn("RESEND_API_KEY is not set — receipt emails will be silently skipped");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
