import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, quotationsTable, lineItemsTable, clientsTable, companySettingsTable } from "@workspace/db";
import { quotationSchema, changeStatusSchema } from "../lib/validation";
import { computeTotals } from "../lib/calculations";
import { generateId } from "../lib/id";
import { renderQuotationPdf } from "../lib/pdf/render";
import { requireAuth } from "./auth";
import { getZodErrors } from "../lib/zodError";

const router = Router();

/** Generate next quote number atomically using a pg advisory lock (held for the duration of the TX). */
async function nextQuoteNumberInTx(
  tx: Parameters<Parameters<(typeof db)["transaction"]>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('quote_number_gen'))`);
  const [last] = await tx
    .select({ number: quotationsTable.number })
    .from(quotationsTable)
    .where(sql`${quotationsTable.number} like ${prefix + "%"}`)
    .orderBy(desc(quotationsTable.number))
    .limit(1);
  const n = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

// List quotations
router.get("/quotations", requireAuth, async (req, res): Promise<void> => {
  try {
    const { status, clientId } = req.query as {
      status?: string;
      clientId?: string;
    };

    let query = db
      .select({
        id: quotationsTable.id,
        number: quotationsTable.number,
        status: quotationsTable.status,
        total: quotationsTable.total,
        currency: quotationsTable.currency,
        issueDate: quotationsTable.issueDate,
        validUntil: quotationsTable.validUntil,
        createdAt: quotationsTable.createdAt,
        clientId: quotationsTable.clientId,
        clientName: clientsTable.name,
        clientCompany: clientsTable.company,
        template: quotationsTable.template,
        paymentUrl: quotationsTable.paymentUrl,
        discountType: quotationsTable.discountType,
        discountValue: quotationsTable.discountValue,
        taxRate: quotationsTable.taxRate,
        subtotal: quotationsTable.subtotal,
        discountAmount: quotationsTable.discountAmount,
        taxAmount: quotationsTable.taxAmount,
      })
      .from(quotationsTable)
      .leftJoin(clientsTable, eq(quotationsTable.clientId, clientsTable.id))
      .$dynamic();

    const conditions = [];
    if (status) conditions.push(eq(quotationsTable.status, status));
    if (clientId) conditions.push(eq(quotationsTable.clientId, clientId));
    if (conditions.length) query = query.where(and(...conditions));

    const quotations = await query.orderBy(desc(quotationsTable.createdAt));
    res.json(quotations);
  } catch {
    res.status(500).json({ error: "Failed to list quotations" });
  }
});

// Get quotation by ID (with line items)
router.get("/quotations/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const [quote] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    if (!quote) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, quote.clientId));

    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, quote.id))
      .orderBy(lineItemsTable.position);

    res.json({ ...quote, client, lineItems });
  } catch {
    res.status(500).json({ error: "Failed to get quotation" });
  }
});

// Create quotation
router.post("/quotations", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = quotationSchema.parse(req.body);
    const totals = computeTotals(
      data.lineItems,
      { type: data.discountType ?? null, value: data.discountValue },
      data.taxRate,
    );
    const id = generateId();

    await db.transaction(async (tx) => {
      const number = await nextQuoteNumberInTx(tx);
      await tx.insert(quotationsTable).values({
        id,
        number,
        clientId: data.clientId,
        issueDate: data.issueDate,
        validUntil: data.validUntil,
        currency: data.currency,
        discountType: data.discountType ?? null,
        discountValue: String(data.discountValue),
        taxRate: String(data.taxRate),
        subtotal: totals.subtotal.toFixed(2),
        discountAmount: totals.discountAmount.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        total: totals.total.toFixed(2),
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        paymentUrl: data.paymentUrl ?? null,
        showQrCode: data.showQrCode,
        template: data.template,
      });

      if (data.lineItems.length > 0) {
        await tx.insert(lineItemsTable).values(
          data.lineItems.map((li, i) => ({
            id: generateId(),
            quotationId: id,
            sku: li.sku ?? null,
            description: li.description,
            quantity: String(li.quantity),
            unit: li.unit,
            unitPrice: String(li.unitPrice),
            lineTotal: totals.lineTotals[i].toFixed(2),
            position: i,
          })),
        );
      }
    });

    const [created] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, id));
    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, id))
      .orderBy(lineItemsTable.position);

    res.status(201).json({ ...created, lineItems });
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to create quotation" });
  }
});

// Update quotation
router.put("/quotations/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = quotationSchema.parse(req.body);
    const totals = computeTotals(
      data.lineItems,
      { type: data.discountType ?? null, value: data.discountValue },
      data.taxRate,
    );

    await db.transaction(async (tx) => {
      await tx
        .delete(lineItemsTable)
        .where(eq(lineItemsTable.quotationId, String(req.params.id)));

      await tx
        .update(quotationsTable)
        .set({
          clientId: data.clientId,
          issueDate: data.issueDate,
          validUntil: data.validUntil,
          currency: data.currency,
          discountType: data.discountType ?? null,
          discountValue: String(data.discountValue),
          taxRate: String(data.taxRate),
          subtotal: totals.subtotal.toFixed(2),
          discountAmount: totals.discountAmount.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          total: totals.total.toFixed(2),
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          paymentUrl: data.paymentUrl ?? null,
          showQrCode: data.showQrCode,
          template: data.template,
          updatedAt: new Date(),
        })
        .where(eq(quotationsTable.id, String(req.params.id)));

      if (data.lineItems.length > 0) {
        await tx.insert(lineItemsTable).values(
          data.lineItems.map((li, i) => ({
            id: generateId(),
            quotationId: String(req.params.id),
            sku: li.sku ?? null,
            description: li.description,
            quantity: String(li.quantity),
            unit: li.unit,
            unitPrice: String(li.unitPrice),
            lineTotal: totals.lineTotals[i].toFixed(2),
            position: i,
          })),
        );
      }
    });

    const [updated] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    if (!updated) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, String(req.params.id)))
      .orderBy(lineItemsTable.position);

    res.json({ ...updated, lineItems });
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to update quotation" });
  }
});

// Change status
router.patch("/quotations/:id/status", requireAuth, async (req, res): Promise<void> => {
  try {
    const { status } = changeStatusSchema.parse(req.body);
    const [quote] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    if (!quote) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    const now = new Date();
    if (status === "SENT") updates.sentAt = now;
    if (status === "ACCEPTED") updates.acceptedAt = now;
    if (status === "PAID") updates.paidAt = now;

    // Snapshot client + company on first SENT transition
    if (status === "SENT" && !quote.clientSnapshot) {
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.id, quote.clientId));
      const [settings] = await db
        .select()
        .from(companySettingsTable)
        .limit(1);
      updates.clientSnapshot = client ?? null;
      updates.companySnapshot = settings ?? null;
    }

    const [updated] = await db
      .update(quotationsTable)
      .set(updates)
      .where(eq(quotationsTable.id, String(req.params.id)))
      .returning();

    res.json(updated);
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to change status" });
  }
});

// Duplicate quotation
router.post("/quotations/:id/duplicate", requireAuth, async (req, res): Promise<void> => {
  try {
    const [src] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    if (!src) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    const srcLines = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, src.id))
      .orderBy(lineItemsTable.position);

    const newId = generateId();
    const today = new Date();

    await db.transaction(async (tx) => {
      const number = await nextQuoteNumberInTx(tx);
      await tx.insert(quotationsTable).values({
        id: newId,
        number,
        status: "DRAFT",
        clientId: src.clientId,
        issueDate: today,
        validUntil: today,
        currency: src.currency,
        discountType: src.discountType,
        discountValue: src.discountValue,
        taxRate: src.taxRate,
        subtotal: src.subtotal,
        discountAmount: src.discountAmount,
        taxAmount: src.taxAmount,
        total: src.total,
        notes: src.notes,
        terms: src.terms,
        paymentUrl: src.paymentUrl,
        showQrCode: src.showQrCode,
        template: src.template,
      });

      if (srcLines.length > 0) {
        await tx.insert(lineItemsTable).values(
          srcLines.map((li) => ({
            id: generateId(),
            quotationId: newId,
            sku: li.sku ?? null,
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: li.unitPrice,
            lineTotal: li.lineTotal,
            position: li.position,
          })),
        );
      }
    });

    const [dup] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, newId));
    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, newId))
      .orderBy(lineItemsTable.position);

    res.status(201).json({ ...dup, lineItems });
  } catch {
    res.status(500).json({ error: "Failed to duplicate quotation" });
  }
});

// Delete quotation
router.delete("/quotations/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    await db
      .delete(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

// PDF endpoint
router.get("/quotations/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  try {
    const [quote] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    if (!quote) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, quote.clientId));

    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, quote.id))
      .orderBy(lineItemsTable.position);

    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (!settings) {
      res.status(400).json({ error: "Configure company settings first" });
      return;
    }

    const buffer = await renderQuotationPdf({
      quote: { ...quote, lineItems },
      client,
      company: settings,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${quote.number}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[pdf]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

export default router;
