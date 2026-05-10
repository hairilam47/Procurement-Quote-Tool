import { eq } from 'drizzle-orm';
import { db, quotationsTable } from '@workspace/db';
import { getStripeSync } from './stripeClient';

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

    // Handle checkout.session.completed to auto-PAID quotations
    try {
      const event = JSON.parse(payload.toString()) as {
        type: string;
        data: { object: { metadata?: Record<string, string | null> } };
      };

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const quotationId = session.metadata?.quotationId;
        if (quotationId) {
          const [quote] = await db
            .select({ id: quotationsTable.id, status: quotationsTable.status })
            .from(quotationsTable)
            .where(eq(quotationsTable.id, quotationId));
          if (quote && quote.status !== 'PAID') {
            await db
              .update(quotationsTable)
              .set({ status: 'PAID', paidAt: new Date(), updatedAt: new Date() })
              .where(eq(quotationsTable.id, quotationId));
            console.log(`[webhook] Quotation ${quotationId} auto-transitioned to PAID`);
          }
        }
      }
    } catch (err) {
      console.error('[webhook] checkout.session.completed handler error:', err);
    }
  }
}
