import { eq } from 'drizzle-orm';
import { db, quotationsTable } from '@workspace/db';
import { getStripeSync } from './stripeClient';
import { sendReceiptForQuotation } from './lib/email/resend';

type StripeEvent = {
  type: string;
  account?: string;
  data: { object: Record<string, unknown> };
};

async function handleQuotationPaid(quotationId: string, source: string): Promise<void> {
  const [quote] = await db
    .select({ id: quotationsTable.id, status: quotationsTable.status })
    .from(quotationsTable)
    .where(eq(quotationsTable.id, quotationId));
  if (quote && quote.status !== 'PAID') {
    await db
      .update(quotationsTable)
      .set({ status: 'PAID', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(quotationsTable.id, quotationId));
    console.log(`[webhook:${source}] Quotation ${quotationId} auto-transitioned to PAID`);
    sendReceiptForQuotation(quotationId)
      .catch((err) => console.error('[email] receipt send failed (webhook):', err));
  }
}

async function handleQuotationRefunded(quotationId: string, source: string): Promise<void> {
  const [quote] = await db
    .select({ id: quotationsTable.id, status: quotationsTable.status })
    .from(quotationsTable)
    .where(eq(quotationsTable.id, quotationId));
  if (quote && quote.status === 'PAID') {
    await db
      .update(quotationsTable)
      .set({ status: 'ACCEPTED', updatedAt: new Date() })
      .where(eq(quotationsTable.id, quotationId));
    console.log(`[webhook:${source}] Quotation ${quotationId} reverted from PAID to ACCEPTED (refund)`);
  }
}

/**
 * Extract quotationId from a Stripe event object.
 *
 * For payment links: metadata.quotationId is set on the Payment Link object.
 * For payment intents: payment_intent_data.metadata.quotationId is set at
 *   payment link creation time, so it propagates to the payment intent directly.
 * For charges: inherits from payment intent metadata.
 * For checkout sessions: metadata.quotationId is set directly.
 *
 * We check: top-level metadata → nested payment_intent/charge/payment_link metadata.
 */
function extractQuotationId(obj: Record<string, unknown>): string | null {
  const topMeta = obj.metadata as Record<string, string | null> | undefined;
  if (topMeta?.quotationId) return topMeta.quotationId;

  const nested = ['payment_intent', 'charge', 'payment_link', 'latest_charge'];
  for (const key of nested) {
    const sub = obj[key] as Record<string, unknown> | undefined;
    if (!sub || typeof sub !== 'object') continue;
    const subMeta = sub.metadata as Record<string, string | null> | undefined;
    if (subMeta?.quotationId) return subMeta.quotationId;
  }

  return null;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString()) as StripeEvent;
      const obj = event.data.object;
      const source = event.account ? `connected:${event.account}` : 'platform';

      /**
       * checkout.session.completed — primary reliable event for both platform and
       * connected-account payment link completions. Stripe fires this for all
       * payment link payments, whether on the platform or a connected account.
       * Connected-account events arrive at the platform webhook with `account` set.
       */
      if (event.type === 'checkout.session.completed') {
        const quotationId = extractQuotationId(obj as Record<string, unknown>);
        if (quotationId) {
          await handleQuotationPaid(quotationId, `${source}:checkout.session.completed`);
        }
        return;
      }

      /**
       * payment_intent.succeeded — secondary handler for connected-account events.
       * Works because payment links created with payment_intent_data.metadata
       * propagate quotationId to the resulting payment intent.
       */
      if (event.type === 'payment_intent.succeeded' && event.account) {
        const quotationId = extractQuotationId(obj as Record<string, unknown>);
        if (quotationId) {
          await handleQuotationPaid(quotationId, `${source}:payment_intent.succeeded`);
        } else {
          console.log(`[webhook] payment_intent.succeeded on connected account ${event.account} — no quotationId in metadata, skipping`);
        }
        return;
      }

      /**
       * payment_intent.payment_failed — log failure for observability.
       * No status transition: the quotation remains SENT/ACCEPTED (correct —
       * a failed payment does not change quotation state; the client can retry).
       */
      if (event.type === 'payment_intent.payment_failed' && event.account) {
        const quotationId = extractQuotationId(obj as Record<string, unknown>);
        console.warn(
          `[webhook] payment_intent.payment_failed on connected account ${event.account}` +
          (quotationId ? ` for quotation ${quotationId}` : ' (no quotationId)') +
          ' — quotation status unchanged, client may retry payment'
        );
        return;
      }

      /**
       * charge.refunded — revert PAID quotation to ACCEPTED.
       * Charges inherit metadata from the payment intent when payment_intent_data.metadata
       * is set at payment link creation time.
       */
      if (event.type === 'charge.refunded' && event.account) {
        const quotationId = extractQuotationId(obj as Record<string, unknown>);
        if (quotationId) {
          await handleQuotationRefunded(quotationId, `${source}:charge.refunded`);
        } else {
          console.log(`[webhook] charge.refunded on connected account ${event.account} — no quotationId in metadata, skipping`);
        }
        return;
      }
    } catch (err) {
      console.error('[webhook] event handler error:', err);
    }
  }
}
