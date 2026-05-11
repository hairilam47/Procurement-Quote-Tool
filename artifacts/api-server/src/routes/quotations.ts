import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, quotationsTable, lineItemsTable, clientsTable, companySettingsTable, usersTable, invoicesTable, invoiceLineItemsTable } from "@workspace/db";
import { quotationSchema, changeStatusSchema } from "../lib/validation";
import { computeTotals } from "../lib/calculations";
import { evaluateFormula } from "../lib/formula";
import { generateId } from "../lib/id";
import { renderQuotationPdf, renderFollowUpInvoicePdf, renderReceiptPdf } from "../lib/pdf/render";
import { sendReceiptForQuotation } from "../lib/email/resend";
import { requireAuth, requireSubscription } from "./auth";
import { getZodErrors } from "../lib/zodError";
import { getUncachableStripeClient } from "../stripeClient";

/** Currencies where Stripe expects the amount in whole units (no cents). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

/**
 * Fetch the live exchange rate from frankfurter.app.
 * Returns null on any failure so callers can degrade gracefully.
 */
async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  try {
    if (from.toUpperCase() === to.toUpperCase()) return 1;
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { rates?: Record<string, number> };
    return json.rates?.[to.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}

const router = Router();

type OwnedQuotation =
  | { quote: typeof quotationsTable.$inferSelect; status: null }
  | { quote: null; status: 403 | 404 };

async function fetchOwnedQuotation(id: string, userId: string): Promise<OwnedQuotation> {
  const [row] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, id));
  if (!row) return { quote: null, status: 404 };
  if (row.userId !== userId) return { quote: null, status: 403 };
  return { quote: row, status: null };
}

async function verifyClientOwnership(clientId: string, userId: string): Promise<boolean> {
  const [row] = await db.select({ id: clientsTable.id }).from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, userId)));
  return !!row;
}

/** Generate next invoice number atomically using a pg advisory lock. */
async function nextInvoiceNumberInTx(
  tx: Parameters<Parameters<(typeof db)["transaction"]>[0]>[0],
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"invoice_number_gen_" + userId}))`);
  const [last] = await tx
    .select({ number: invoicesTable.number })
    .from(invoicesTable)
    .where(and(eq(invoicesTable.userId, userId), sql`${invoicesTable.number} like ${prefix + "%"}`))
    .orderBy(desc(invoicesTable.number))
    .limit(1);
  const n = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Generate next quote number atomically using a pg advisory lock (held for the duration of the TX). */
async function nextQuoteNumberInTx(
  tx: Parameters<Parameters<(typeof db)["transaction"]>[0]>[0],
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"quote_number_gen_" + userId}))`);
  const [last] = await tx
    .select({ number: quotationsTable.number })
    .from(quotationsTable)
    .where(and(eq(quotationsTable.userId, userId), sql`${quotationsTable.number} like ${prefix + "%"}`))
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
        requiredTotal: quotationsTable.requiredTotal,
        secondaryCurrency: quotationsTable.secondaryCurrency,
        secondaryExchangeRate: quotationsTable.secondaryExchangeRate,
      })
      .from(quotationsTable)
      .leftJoin(clientsTable, eq(quotationsTable.clientId, clientsTable.id))
      .$dynamic();

    const conditions = [eq(quotationsTable.userId, req.userId)];
    if (status) conditions.push(eq(quotationsTable.status, status));
    if (clientId) conditions.push(eq(quotationsTable.clientId, clientId));
    query = query.where(and(...conditions));

    const quotations = await query.orderBy(desc(quotationsTable.createdAt));
    res.json(quotations);
  } catch {
    res.status(500).json({ error: "Failed to list quotations" });
  }
});

// Get quotation by ID (with line items)
router.get("/quotations/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const owned = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (owned.status) { res.status(owned.status).json({ error: owned.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = owned.quote;

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

type LineItemWithFormula = {
  sku?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  rateFormula?: string | null;
  paymentRequired: boolean;
  position: number;
};

/**
 * Evaluate any rate formulas in the line items, replacing unitPrice with the
 * computed result. Returns a 400 error response via res if any formula is invalid.
 */
function applyFormulas(
  lineItems: LineItemWithFormula[],
): { ok: true; items: LineItemWithFormula[] } | { ok: false; error: string } {
  let error: string | null = null;
  const items = lineItems.map((li, idx) => {
    if (!li.rateFormula || error) return li;
    try {
      const price = evaluateFormula(li.rateFormula);
      return { ...li, unitPrice: price };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Formula evaluation failed";
      error = `Line item ${idx + 1}: ${msg}`;
      return li;
    }
  });
  if (error) return { ok: false, error };
  return { ok: true, items };
}

// Create quotation
router.post("/quotations", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const data = quotationSchema.parse(req.body);

    const clientOwned = await verifyClientOwnership(data.clientId, req.userId);
    if (!clientOwned) { res.status(400).json({ error: "Client not found" }); return; }

    const formulaResult = applyFormulas(data.lineItems);
    if (!formulaResult.ok) {
      res.status(400).json({ error: formulaResult.error });
      return;
    }
    const resolvedLineItems = formulaResult.items;

    const totals = computeTotals(
      resolvedLineItems,
      { type: data.discountType ?? null, value: data.discountValue },
      data.taxRate,
    );
    const id = generateId();

    // Fetch exchange rate at creation time — required when secondary currency is set
    const secCurrency = data.secondaryCurrency ?? null;
    let secRate: number | null = null;
    if (secCurrency) {
      secRate = await fetchExchangeRate(data.currency, secCurrency);
      if (secRate === null) {
        res.status(400).json({
          error: `Could not fetch exchange rate for ${data.currency} → ${secCurrency}. Check that both currency codes are valid ISO 4217 codes supported by frankfurter.app.`,
        });
        return;
      }
    }

    await db.transaction(async (tx) => {
      const number = await nextQuoteNumberInTx(tx, req.userId);
      await tx.insert(quotationsTable).values({
        id,
        userId: req.userId,
        number,
        clientId: data.clientId,
        issueDate: data.issueDate,
        validUntil: data.validUntil,
        currency: data.currency,
        secondaryCurrency: secCurrency,
        secondaryExchangeRate: secRate !== null ? String(secRate) : null,
        discountType: data.discountType ?? null,
        discountValue: String(data.discountValue),
        taxRate: String(data.taxRate),
        subtotal: totals.subtotal.toFixed(2),
        discountAmount: totals.discountAmount.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        total: totals.total.toFixed(2),
        requiredTotal: totals.requiredTotal.toFixed(2),
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        paymentUrl: data.paymentUrl ?? null,
        showQrCode: data.showQrCode,
        paymentMethod: data.paymentMethod,
        template: data.template,
      });

      if (resolvedLineItems.length > 0) {
        await tx.insert(lineItemsTable).values(
          resolvedLineItems.map((li, i) => ({
            id: generateId(),
            quotationId: id,
            sku: li.sku ?? null,
            description: li.description,
            quantity: String(li.quantity),
            unit: li.unit,
            unitPrice: String(li.unitPrice),
            rateFormula: li.rateFormula ?? null,
            paymentRequired: li.paymentRequired,
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
router.put("/quotations/:id", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const data = quotationSchema.parse(req.body);

    const formulaResult = applyFormulas(data.lineItems);
    if (!formulaResult.ok) {
      res.status(400).json({ error: formulaResult.error });
      return;
    }
    const resolvedLineItems = formulaResult.items;

    const totals = computeTotals(
      resolvedLineItems,
      { type: data.discountType ?? null, value: data.discountValue },
      data.taxRate,
    );

    // Load the existing row to check ownership and whether currencies have changed
    const ownedForUpdate = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedForUpdate.status) { res.status(ownedForUpdate.status).json({ error: ownedForUpdate.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const existing = ownedForUpdate.quote;

    if (data.clientId) {
      const clientOwnedUpd = await verifyClientOwnership(data.clientId, req.userId);
      if (!clientOwnedUpd) { res.status(400).json({ error: "Client not found" }); return; }
    }

    const secCurrency = data.secondaryCurrency ?? null;
    let secRate: string | null = existing.secondaryExchangeRate;

    if (secCurrency) {
      const currenciesChanged =
        secCurrency !== existing.secondaryCurrency ||
        data.currency !== existing.currency;
      if (currenciesChanged || !secRate) {
        // Only re-fetch when the currency pair has changed
        const freshRate = await fetchExchangeRate(data.currency, secCurrency);
        if (freshRate === null) {
          res.status(400).json({
            error: `Could not fetch exchange rate for ${data.currency} → ${secCurrency}. Check that both currency codes are valid ISO 4217 codes supported by frankfurter.app.`,
          });
          return;
        }
        secRate = String(freshRate);
      }
      // Otherwise keep the previously frozen rate
    } else {
      secRate = null;
    }

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
          secondaryCurrency: secCurrency,
          secondaryExchangeRate: secRate,
          discountType: data.discountType ?? null,
          discountValue: String(data.discountValue),
          taxRate: String(data.taxRate),
          subtotal: totals.subtotal.toFixed(2),
          discountAmount: totals.discountAmount.toFixed(2),
          taxAmount: totals.taxAmount.toFixed(2),
          total: totals.total.toFixed(2),
          requiredTotal: totals.requiredTotal.toFixed(2),
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          paymentUrl: data.paymentUrl ?? null,
          showQrCode: data.showQrCode,
          paymentMethod: data.paymentMethod,
          template: data.template,
          updatedAt: new Date(),
        })
        .where(eq(quotationsTable.id, String(req.params.id)));

      if (resolvedLineItems.length > 0) {
        await tx.insert(lineItemsTable).values(
          resolvedLineItems.map((li, i) => ({
            id: generateId(),
            quotationId: String(req.params.id),
            sku: li.sku ?? null,
            description: li.description,
            quantity: String(li.quantity),
            unit: li.unit,
            unitPrice: String(li.unitPrice),
            rateFormula: li.rateFormula ?? null,
            paymentRequired: li.paymentRequired,
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
    const ownedStatus = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedStatus.status) { res.status(ownedStatus.status).json({ error: ownedStatus.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = ownedStatus.quote;

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
        .where(eq(companySettingsTable.userId, quote.userId));
      updates.clientSnapshot = client ?? null;
      updates.companySnapshot = settings ?? null;
    }

    const [updated] = await db
      .update(quotationsTable)
      .set(updates)
      .where(eq(quotationsTable.id, String(req.params.id)))
      .returning();

    if (status === "PAID") {
      sendReceiptForQuotation(String(req.params.id))
        .catch((err) => console.error("[email] receipt send failed:", err));
    }

    res.json(updated);
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to change status" });
  }
});

// Duplicate quotation
router.post("/quotations/:id/duplicate", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const ownedDup = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedDup.status) { res.status(ownedDup.status).json({ error: ownedDup.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const src = ownedDup.quote;

    const srcLines = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, src.id))
      .orderBy(lineItemsTable.position);

    const newId = generateId();
    const today = new Date();

    // For the duplicate (a new quote created today), fetch a fresh rate so the
    // rate is frozen at this new creation event. Fall back to the source rate
    // if the external service is unavailable.
    let dupSecRate: string | null = src.secondaryExchangeRate;
    if (src.secondaryCurrency) {
      const freshRate = await fetchExchangeRate(src.currency, src.secondaryCurrency);
      if (freshRate !== null) {
        dupSecRate = String(freshRate);
      }
      // If fetch fails, keep source rate as best-effort fallback
    }

    await db.transaction(async (tx) => {
      const number = await nextQuoteNumberInTx(tx, req.userId);
      await tx.insert(quotationsTable).values({
        id: newId,
        userId: req.userId,
        number,
        status: "DRAFT",
        clientId: src.clientId,
        issueDate: today,
        validUntil: today,
        currency: src.currency,
        secondaryCurrency: src.secondaryCurrency,
        secondaryExchangeRate: dupSecRate,
        discountType: src.discountType,
        discountValue: src.discountValue,
        taxRate: src.taxRate,
        subtotal: src.subtotal,
        discountAmount: src.discountAmount,
        taxAmount: src.taxAmount,
        total: src.total,
        requiredTotal: src.requiredTotal,
        notes: src.notes,
        terms: src.terms,
        paymentUrl: src.paymentUrl,
        showQrCode: src.showQrCode,
        paymentMethod: src.paymentMethod,
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
            rateFormula: li.rateFormula ?? null,
            paymentRequired: li.paymentRequired,
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

// Convert accepted quotation to invoice
router.post("/quotations/:id/convert-to-invoice", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const invoiceId = generateId();
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    await db.transaction(async (tx) => {
      // Lock the quotation row first to prevent concurrent conversions
      const [quote] = await tx
        .select()
        .from(quotationsTable)
        .where(eq(quotationsTable.id, String(req.params.id)))
        .for("update");
      if (!quote) {
        const err = new Error("NOT_FOUND");
        (err as NodeJS.ErrnoException).code = "NOT_FOUND";
        throw err;
      }
      if (quote.userId !== req.userId) {
        const err = new Error("FORBIDDEN");
        (err as NodeJS.ErrnoException).code = "FORBIDDEN";
        throw err;
      }
      if (quote.status !== "ACCEPTED") {
        const err = new Error("NOT_ACCEPTED");
        (err as NodeJS.ErrnoException).code = "NOT_ACCEPTED";
        throw err;
      }
      if (quote.invoiceId) {
        const err = new Error(quote.invoiceId);
        (err as NodeJS.ErrnoException).code = "ALREADY_CONVERTED";
        throw err;
      }

      const srcLines = await tx
        .select()
        .from(lineItemsTable)
        .where(eq(lineItemsTable.quotationId, quote.id))
        .orderBy(lineItemsTable.position);

      const number = await nextInvoiceNumberInTx(tx, req.userId);
      await tx.insert(invoicesTable).values({
        id: invoiceId,
        userId: req.userId,
        number,
        clientId: quote.clientId,
        issueDate: today,
        dueDate,
        currency: quote.currency,
        secondaryCurrency: quote.secondaryCurrency,
        secondaryExchangeRate: quote.secondaryExchangeRate,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        taxRate: quote.taxRate,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        taxAmount: quote.taxAmount,
        total: quote.total,
        requiredTotal: quote.requiredTotal,
        notes: quote.notes,
        terms: quote.terms,
        showQrCode: quote.showQrCode,
        paymentMethod: quote.paymentMethod,
        template: quote.template,
      });

      if (srcLines.length > 0) {
        await tx.insert(invoiceLineItemsTable).values(
          srcLines.map((li) => ({
            id: generateId(),
            invoiceId,
            sku: li.sku ?? null,
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPrice: li.unitPrice,
            rateFormula: li.rateFormula ?? null,
            paymentRequired: li.paymentRequired,
            lineTotal: li.lineTotal,
            position: li.position,
          })),
        );
      }

      await tx
        .update(quotationsTable)
        .set({ invoiceId, updatedAt: new Date() })
        .where(eq(quotationsTable.id, quote.id));
    });

    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId));
    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, invoiceId))
      .orderBy(invoiceLineItemsTable.position);

    res.status(201).json({ ...invoice, lineItems });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "NOT_FOUND") { res.status(404).json({ error: "Quotation not found" }); return; }
    if (code === "FORBIDDEN") { res.status(403).json({ error: "Forbidden" }); return; }
    if (code === "NOT_ACCEPTED") { res.status(400).json({ error: "Only ACCEPTED quotations can be converted to invoices" }); return; }
    if (code === "ALREADY_CONVERTED") {
      const existingInvoiceId = (err as Error).message;
      res.status(409).json({ error: "This quotation has already been converted to an invoice", invoiceId: existingInvoiceId });
      return;
    }
    res.status(500).json({ error: "Failed to convert quotation to invoice" });
  }
});

// Generate Stripe Payment Link for a quotation
router.post("/quotations/:id/payment-link", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedPayment = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedPayment.status) { res.status(ownedPayment.status).json({ error: ownedPayment.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = ownedPayment.quote;
    if (quote.status !== "SENT" && quote.status !== "ACCEPTED") {
      res.status(400).json({ error: "Payment links can only be generated for SENT or ACCEPTED quotations" });
      return;
    }
    if (!quote.requiredTotal || parseFloat(quote.requiredTotal) <= 0) {
      res.status(400).json({ error: "Quotation has no payable amount" });
      return;
    }
    if (quote.paymentUrl) {
      res.status(409).json({ error: "A payment link already exists for this quotation" });
      return;
    }

    // Check if the user has a connected Stripe account
    const [user] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user?.stripeAccountId) {
      res.status(402).json({
        error: "connect_required",
        message: "You must connect your Stripe account before generating payment links. Go to Settings to connect.",
      });
      return;
    }

    const connectedAccountId = user.stripeAccountId;
    const currency = quote.currency.toLowerCase();
    const rawAmount = parseFloat(quote.requiredTotal);
    const unitAmount = ZERO_DECIMAL_CURRENCIES.has(quote.currency.toUpperCase())
      ? Math.round(rawAmount)
      : Math.round(rawAmount * 100);

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const price = await stripe.prices.create(
      {
        currency,
        unit_amount: unitAmount,
        product_data: { name: `Payment for Quotation ${quote.number}` },
      },
      { stripeAccount: connectedAccountId },
    );

    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { quotationId: quote.id },
        payment_intent_data: { metadata: { quotationId: quote.id } },
        after_completion: {
          type: "redirect",
          redirect: { url: `${baseUrl}/pay/success?quotationId=${quote.id}` },
        },
      },
      { stripeAccount: connectedAccountId },
    );

    const [updated] = await db
      .update(quotationsTable)
      .set({ paymentUrl: paymentLink.url, updatedAt: new Date() })
      .where(eq(quotationsTable.id, quote.id))
      .returning();

    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, quote.id))
      .orderBy(lineItemsTable.position);

    res.json({ ...updated, lineItems });
  } catch (err) {
    console.error("[payment-link]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate payment link" });
  }
});

// Delete quotation
router.delete("/quotations/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedDel = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedDel.status) { res.status(ownedDel.status).json({ error: ownedDel.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    await db.delete(quotationsTable).where(eq(quotationsTable.id, String(req.params.id)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

// Manually resend receipt email (PAID quotations only)
router.post("/quotations/:id/resend-receipt", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedReceipt = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedReceipt.status) { res.status(ownedReceipt.status).json({ error: ownedReceipt.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = ownedReceipt.quote;
    if (quote.status !== "PAID") {
      res.status(400).json({ error: "Receipt emails can only be sent for PAID quotations" });
      return;
    }
    const result = await sendReceiptForQuotation(quote.id);
    res.json(result);
  } catch (err) {
    console.error("[resend-receipt]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to send receipt email" });
  }
});

// Receipt PDF endpoint (PAID quotations only)
router.get("/quotations/:id/receipt-pdf", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedReceiptPdf = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedReceiptPdf.status) { res.status(ownedReceiptPdf.status).json({ error: ownedReceiptPdf.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = ownedReceiptPdf.quote;

    if (quote.status !== "PAID") {
      res.status(400).json({ error: "Receipt is only available for PAID quotations" });
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

    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, req.userId));
    if (!settings) {
      res.status(400).json({ error: "Configure company settings first" });
      return;
    }

    const buffer = await renderReceiptPdf({
      quote: { ...quote, lineItems },
      client,
      company: settings,
    });

    const receiptNumber = `REC-${quote.number}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${receiptNumber}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[receipt-pdf]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

// Follow-up invoice PDF endpoint (deferred items only)
router.get("/quotations/:id/followup-invoice-pdf", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedFollowup = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedFollowup.status) { res.status(ownedFollowup.status).json({ error: ownedFollowup.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = ownedFollowup.quote;

    if (quote.status !== "ACCEPTED" && quote.status !== "PAID") {
      res.status(400).json({ error: "Follow-up invoice is only available for ACCEPTED or PAID quotations" });
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

    const deferredItems = lineItems.filter((li) => li.paymentRequired === false);
    if (deferredItems.length === 0) {
      res.status(400).json({ error: "This quotation has no deferred items" });
      return;
    }

    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, req.userId));
    if (!settings) {
      res.status(400).json({ error: "Configure company settings first" });
      return;
    }

    // Generate a follow-up invoice number based on the original quote number
    const invoiceNumber = `${quote.number}-FI`;

    const buffer = await renderFollowUpInvoicePdf({
      quote: { ...quote, lineItems },
      client,
      company: settings,
      invoiceNumber,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${invoiceNumber}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[followup-invoice-pdf]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

// PDF endpoint
router.get("/quotations/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedPdf = await fetchOwnedQuotation(String(req.params.id), req.userId);
    if (ownedPdf.status) { res.status(ownedPdf.status).json({ error: ownedPdf.status === 404 ? "Quotation not found" : "Forbidden" }); return; }
    const quote = ownedPdf.quote;

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, quote.clientId));

    const lineItems = await db
      .select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.quotationId, quote.id))
      .orderBy(lineItemsTable.position);

    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, req.userId));
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

// Public summary — no auth, safe fields only for customer-facing pages
router.get("/quotations/:id/public-summary", async (req, res): Promise<void> => {
  try {
    const [quote] = await db
      .select({
        number: quotationsTable.number,
        status: quotationsTable.status,
        total: quotationsTable.total,
        requiredTotal: quotationsTable.requiredTotal,
        currency: quotationsTable.currency,
        paidAt: quotationsTable.paidAt,
        clientId: quotationsTable.clientId,
        clientSnapshot: quotationsTable.clientSnapshot,
        companySnapshot: quotationsTable.companySnapshot,
      })
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));

    if (!quote) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }

    // Extract client name from snapshot (set at SENT time) or live client table
    type ClientSnap = { name?: string; company?: string | null };
    type CompanySnap = { name?: string; email?: string; phone?: string | null };
    const snap = quote.clientSnapshot as ClientSnap | null;
    let clientName: string | null = snap?.name ?? null;
    let clientCompany: string | null = snap?.company ?? null;
    if (!clientName) {
      const [liveClient] = await db
        .select({ name: clientsTable.name, company: clientsTable.company })
        .from(clientsTable)
        .where(eq(clientsTable.id, quote.clientId));
      clientName = liveClient?.name ?? null;
      clientCompany = liveClient?.company ?? null;
    }

    const companySnap = quote.companySnapshot as CompanySnap | null;
    const companyName: string | null = companySnap?.name ?? null;
    const companyEmail: string | null = companySnap?.email ?? null;
    const companyPhone: string | null = companySnap?.phone ?? null;

    res.json({
      number: quote.number,
      status: quote.status,
      clientName,
      clientCompany,
      total: quote.total,
      requiredTotal: quote.requiredTotal,
      currency: quote.currency,
      paidAt: quote.paidAt,
      companyName,
      companyEmail,
      companyPhone,
    });
  } catch (err) {
    console.error("[public-summary]", err);
    res.status(500).json({ error: "Failed to load payment summary" });
  }
});

// Public receipt PDF — no auth, PAID quotations only
router.get("/quotations/:id/receipt-pdf/public", async (req, res): Promise<void> => {
  try {
    const [quote] = await db
      .select()
      .from(quotationsTable)
      .where(eq(quotationsTable.id, String(req.params.id)));
    if (!quote) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }
    if (quote.status !== "PAID") {
      res.status(400).json({ error: "Receipt is only available for PAID quotations" });
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

    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, quote.userId));
    if (!settings) {
      res.status(400).json({ error: "Company not configured" });
      return;
    }

    const buffer = await renderReceiptPdf({
      quote: { ...quote, lineItems },
      client,
      company: settings,
    });

    const receiptNumber = `REC-${quote.number}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${receiptNumber}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[receipt-pdf-public]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

export default router;
