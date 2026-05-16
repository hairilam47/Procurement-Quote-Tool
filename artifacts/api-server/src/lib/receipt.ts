import { eq, and, sql, desc } from "drizzle-orm";
import {
  db,
  invoicesTable,
  invoiceLineItemsTable,
  receiptsTable,
} from "@workspace/db";
import { generateId } from "./id";

/**
 * Auto-generate a receipt row when an invoice is marked PAID.
 * Idempotent — calling it twice for the same invoice is safe (no-op on second call).
 */
export async function createReceiptForInvoice(
  invoiceId: string,
  paymentMethod: "stripe" | "manual",
): Promise<void> {
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));
  if (!invoice) return;

  // Guard: skip if receipt already exists for this invoice
  const [existing] = await db
    .select({ id: receiptsTable.id })
    .from(receiptsTable)
    .where(eq(receiptsTable.invoiceId, invoiceId));
  if (existing) return;

  const lineItems = await db
    .select()
    .from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, invoiceId))
    .orderBy(invoiceLineItemsTable.position);

  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${"receipt_number_gen_" + invoice.userId}))`,
    );
    const [last] = await tx
      .select({ number: receiptsTable.number })
      .from(receiptsTable)
      .where(
        and(
          eq(receiptsTable.userId, invoice.userId),
          sql`${receiptsTable.number} LIKE ${prefix + "%"}`,
        ),
      )
      .orderBy(desc(receiptsTable.number))
      .limit(1);
    const n = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
    const number = `${prefix}${String(n).padStart(4, "0")}`;

    try {
      await tx.insert(receiptsTable).values({
        id: generateId(),
        number,
        invoiceId,
        userId: invoice.userId,
        invoiceNumber: invoice.number,
        issuedAt: new Date(),
        paidAt: invoice.paidAt ?? new Date(),
        paymentMethod,
        amountPaid: invoice.requiredTotal ?? invoice.total ?? "0",
        currency: invoice.currency,
        clientSnapshot: invoice.clientSnapshot,
        companySnapshot: invoice.companySnapshot,
        lineItemsSnapshot: lineItems,
      });
    } catch (e: unknown) {
      // Unique constraint violation means a concurrent caller already inserted the receipt
      // — treat as success so this call is idempotent under concurrency.
      const code = (e as Record<string, unknown>).code;
      if (code === "23505") return;
      throw e;
    }
  });
}
