import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, invoicesTable, invoiceLineItemsTable, clientsTable, companySettingsTable, usersTable } from "@workspace/db";
import { invoiceSchema, changeInvoiceStatusSchema } from "../lib/validation";
import { computeTotals } from "../lib/calculations";
import { evaluateFormula } from "../lib/formula";
import { generateId } from "../lib/id";
import { renderInvoicePdf } from "../lib/pdf/render";
import { requireAuth, requireSubscription } from "./auth";
import { createReceiptForInvoice } from "../lib/receipt";
import { getZodErrors } from "../lib/zodError";
import { getUncachableStripeClient } from "../stripeClient";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  try {
    if (from.toUpperCase() === to.toUpperCase()) return 1;
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    // open.er-api.com supports 160+ currencies including MYR, INR, BRL, ZAR, KRW, MXN
    // (frankfurter.dev only covers ~31 ECB currencies)
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(fromUpper)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { result?: string; rates?: Record<string, number> };
    if (json.result !== "success") return null;
    return json.rates?.[toUpper] ?? null;
  } catch {
    return null;
  }
}

const router = Router();

type OwnedInvoice =
  | { invoice: typeof invoicesTable.$inferSelect; status: null }
  | { invoice: null; status: 403 | 404 };

async function fetchOwnedInvoice(id: string, userId: string): Promise<OwnedInvoice> {
  const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!row) return { invoice: null, status: 404 };
  if (row.userId !== userId) return { invoice: null, status: 403 };
  return { invoice: row, status: null };
}

async function verifyClientOwnership(clientId: string, userId: string): Promise<boolean> {
  const [row] = await db.select({ id: clientsTable.id }).from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, userId)));
  return !!row;
}

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

// List invoices
router.get("/invoices", requireAuth, async (req, res): Promise<void> => {
  try {
    const { status, clientId } = req.query as {
      status?: string;
      clientId?: string;
    };

    let query = db
      .select({
        id: invoicesTable.id,
        number: invoicesTable.number,
        status: invoicesTable.status,
        total: invoicesTable.total,
        currency: invoicesTable.currency,
        issueDate: invoicesTable.issueDate,
        dueDate: invoicesTable.dueDate,
        createdAt: invoicesTable.createdAt,
        clientId: invoicesTable.clientId,
        clientName: clientsTable.name,
        clientCompany: clientsTable.company,
        template: invoicesTable.template,
        paymentUrl: invoicesTable.paymentUrl,
        discountType: invoicesTable.discountType,
        discountValue: invoicesTable.discountValue,
        taxRate: invoicesTable.taxRate,
        subtotal: invoicesTable.subtotal,
        discountAmount: invoicesTable.discountAmount,
        taxAmount: invoicesTable.taxAmount,
        requiredTotal: invoicesTable.requiredTotal,
        secondaryCurrency: invoicesTable.secondaryCurrency,
        secondaryExchangeRate: invoicesTable.secondaryExchangeRate,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
      .$dynamic();

    const conditions = [eq(invoicesTable.userId, req.userId)];
    if (status) conditions.push(eq(invoicesTable.status, status));
    if (clientId) conditions.push(eq(invoicesTable.clientId, clientId));
    query = query.where(and(...conditions));

    const invoices = await query.orderBy(desc(invoicesTable.createdAt));
    res.json(invoices);
  } catch {
    res.status(500).json({ error: "Failed to list invoices" });
  }
});

// Get invoice by ID (with line items)
router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const owned = await fetchOwnedInvoice(String(req.params.id), req.userId);
    if (owned.status) { res.status(owned.status).json({ error: owned.status === 404 ? "Invoice not found" : "Forbidden" }); return; }
    const invoice = owned.invoice;

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, invoice.clientId));

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, invoice.id))
      .orderBy(invoiceLineItemsTable.position);

    res.json({ ...invoice, client, lineItems });
  } catch {
    res.status(500).json({ error: "Failed to get invoice" });
  }
});

// Create invoice
router.post("/invoices", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const data = invoiceSchema.parse(req.body);

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

    const secCurrency = data.secondaryCurrency ?? null;
    let secRate: number | null = null;
    if (secCurrency) {
      secRate = await fetchExchangeRate(data.currency, secCurrency);
      if (secRate === null) {
        res.status(400).json({
          error: `Could not fetch exchange rate for ${data.currency} → ${secCurrency}. Try removing the secondary currency, or verify both codes are valid ISO 4217 codes.`,
        });
        return;
      }
    }

    await db.transaction(async (tx) => {
      const number = await nextInvoiceNumberInTx(tx, req.userId);
      await tx.insert(invoicesTable).values({
        id,
        userId: req.userId,
        number,
        clientId: data.clientId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
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
        await tx.insert(invoiceLineItemsTable).values(
          resolvedLineItems.map((li, i) => ({
            id: generateId(),
            invoiceId: id,
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
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id));
    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, id))
      .orderBy(invoiceLineItemsTable.position);

    res.status(201).json({ ...created, lineItems });
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Update invoice
router.put("/invoices/:id", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const data = invoiceSchema.parse(req.body);

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

    const ownedForUpdate = await fetchOwnedInvoice(String(req.params.id), req.userId);
    if (ownedForUpdate.status) { res.status(ownedForUpdate.status).json({ error: ownedForUpdate.status === 404 ? "Invoice not found" : "Forbidden" }); return; }
    const existing = ownedForUpdate.invoice;

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
        const freshRate = await fetchExchangeRate(data.currency, secCurrency);
        if (freshRate === null) {
          res.status(400).json({
            error: `Could not fetch exchange rate for ${data.currency} → ${secCurrency}. Try removing the secondary currency, or verify both codes are valid ISO 4217 codes.`,
          });
          return;
        }
        secRate = String(freshRate);
      }
    } else {
      secRate = null;
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(invoiceLineItemsTable)
        .where(eq(invoiceLineItemsTable.invoiceId, String(req.params.id)));

      await tx
        .update(invoicesTable)
        .set({
          clientId: data.clientId,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
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
        .where(eq(invoicesTable.id, String(req.params.id)));

      if (resolvedLineItems.length > 0) {
        await tx.insert(invoiceLineItemsTable).values(
          resolvedLineItems.map((li, i) => ({
            id: generateId(),
            invoiceId: String(req.params.id),
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
      .from(invoicesTable)
      .where(eq(invoicesTable.id, String(req.params.id)));
    if (!updated) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, String(req.params.id)))
      .orderBy(invoiceLineItemsTable.position);

    res.json({ ...updated, lineItems });
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// Change status
router.patch("/invoices/:id/status", requireAuth, async (req, res): Promise<void> => {
  try {
    const { status } = changeInvoiceStatusSchema.parse(req.body);
    const ownedStatus = await fetchOwnedInvoice(String(req.params.id), req.userId);
    if (ownedStatus.status) { res.status(ownedStatus.status).json({ error: ownedStatus.status === 404 ? "Invoice not found" : "Forbidden" }); return; }
    const invoice = ownedStatus.invoice;

    // Enforce legal status transitions: DRAFT→SENT, SENT→PAID only
    const legalTransitions: Record<string, string[]> = {
      DRAFT: ["SENT"],
      SENT: ["PAID"],
      PAID: [],
    };
    const allowed = legalTransitions[invoice.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(400).json({
        error: `Cannot transition invoice from ${invoice.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}.`,
      });
      return;
    }

    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    const now = new Date();
    if (status === "SENT") updates.sentAt = now;
    if (status === "PAID") updates.paidAt = now;

    if (status === "SENT" && !invoice.clientSnapshot) {
      const [client] = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.id, invoice.clientId));
      const [settings] = await db
        .select()
        .from(companySettingsTable)
        .where(eq(companySettingsTable.userId, invoice.userId));
      updates.clientSnapshot = client ?? null;
      updates.companySnapshot = settings ?? null;
    }

    const [updated] = await db
      .update(invoicesTable)
      .set(updates)
      .where(eq(invoicesTable.id, String(req.params.id)))
      .returning();

    // Auto-generate receipt when manually marking as paid (awaited so errors surface)
    if (status === "PAID") {
      try {
        await createReceiptForInvoice(updated.id, "manual");
      } catch (e) {
        console.error("[invoice-status] receipt creation failed:", e);
        // Invoice is already PAID — don't roll back, but log the failure
      }
    }

    res.json(updated);
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to change invoice status" });
  }
});

// Generate Stripe Payment Link for an invoice
router.post("/invoices/:id/payment-link", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedPayment = await fetchOwnedInvoice(String(req.params.id), req.userId);
    if (ownedPayment.status) { res.status(ownedPayment.status).json({ error: ownedPayment.status === 404 ? "Invoice not found" : "Forbidden" }); return; }
    const invoice = ownedPayment.invoice;
    if (invoice.status !== "SENT") {
      res.status(400).json({ error: "Payment links can only be generated for SENT invoices" });
      return;
    }
    if (!invoice.requiredTotal || parseFloat(invoice.requiredTotal) <= 0) {
      res.status(400).json({ error: "Invoice has no payable amount" });
      return;
    }
    if (invoice.paymentUrl) {
      res.status(409).json({ error: "A payment link already exists for this invoice" });
      return;
    }

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
    const currency = invoice.currency.toLowerCase();
    const rawAmount = parseFloat(invoice.requiredTotal);
    const unitAmount = ZERO_DECIMAL_CURRENCIES.has(invoice.currency.toUpperCase())
      ? Math.round(rawAmount)
      : Math.round(rawAmount * 100);

    let stripe;
    try {
      stripe = await getUncachableStripeClient();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stripe is not configured";
      res.status(503).json({
        error: "stripe_misconfigured",
        message: `Payment links unavailable: ${msg}. Go to Settings → Billing to resolve.`,
      });
      return;
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const price = await stripe.prices.create(
      {
        currency,
        unit_amount: unitAmount,
        product_data: { name: `Payment for Invoice ${invoice.number}` },
      },
      { stripeAccount: connectedAccountId },
    );

    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoiceId: invoice.id },
        payment_intent_data: { metadata: { invoiceId: invoice.id } },
        after_completion: {
          type: "redirect",
          redirect: { url: `${baseUrl}/pay/success?invoiceId=${invoice.id}` },
        },
      },
      { stripeAccount: connectedAccountId },
    );

    const [updated] = await db
      .update(invoicesTable)
      .set({ paymentUrl: paymentLink.url, updatedAt: new Date() })
      .where(eq(invoicesTable.id, invoice.id))
      .returning();

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, invoice.id))
      .orderBy(invoiceLineItemsTable.position);

    res.json({ ...updated, lineItems });
  } catch (err) {
    console.error("[invoice-payment-link]", err);
    res.status(500).json({ error: "Failed to generate payment link" });
  }
});

// Public summary — no auth required (used by payment success page)
router.get("/invoices/:id/public-summary", async (req, res): Promise<void> => {
  try {
    const [invoice] = await db
      .select({
        number: invoicesTable.number,
        status: invoicesTable.status,
        total: invoicesTable.total,
        requiredTotal: invoicesTable.requiredTotal,
        currency: invoicesTable.currency,
        paidAt: invoicesTable.paidAt,
        clientId: invoicesTable.clientId,
        clientSnapshot: invoicesTable.clientSnapshot,
        companySnapshot: invoicesTable.companySnapshot,
      })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, String(req.params.id)));

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    type ClientSnap = { name?: string; company?: string | null };
    type CompanySnap = { name?: string; email?: string; phone?: string | null };
    const snap = invoice.clientSnapshot as ClientSnap | null;
    let clientName: string | null = snap?.name ?? null;
    let clientCompany: string | null = snap?.company ?? null;
    if (!clientName) {
      const [liveClient] = await db
        .select({ name: clientsTable.name, company: clientsTable.company })
        .from(clientsTable)
        .where(eq(clientsTable.id, invoice.clientId));
      clientName = liveClient?.name ?? null;
      clientCompany = liveClient?.company ?? null;
    }

    const companySnap = invoice.companySnapshot as CompanySnap | null;
    const companyName: string | null = companySnap?.name ?? null;
    const companyEmail: string | null = companySnap?.email ?? null;
    const companyPhone: string | null = companySnap?.phone ?? null;

    res.json({
      number: invoice.number,
      status: invoice.status,
      clientName,
      clientCompany,
      total: invoice.total,
      requiredTotal: invoice.requiredTotal ?? invoice.total,
      currency: invoice.currency,
      paidAt: invoice.paidAt,
      companyName,
      companyEmail,
      companyPhone,
    });
  } catch (err) {
    console.error("[invoice-public-summary]", err);
    res.status(500).json({ error: "Failed to load invoice summary" });
  }
});

// Public invoice PDF — no auth, PAID invoices only (mirrors quotation receipt-pdf/public)
router.get("/invoices/:id/pdf/public", async (req, res): Promise<void> => {
  try {
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, String(req.params.id)));
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    if (invoice.status !== "PAID") {
      res.status(400).json({ error: "Invoice PDF is only available for PAID invoices" });
      return;
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, invoice.clientId));

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, invoice.id))
      .orderBy(invoiceLineItemsTable.position);

    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, invoice.userId));
    if (!settings) {
      res.status(400).json({ error: "Company not configured" });
      return;
    }

    const buffer = await renderInvoicePdf({
      invoice: { ...invoice, lineItems },
      client,
      company: settings,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.number}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[invoice-pdf-public]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

// Delete invoice
router.delete("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedDel = await fetchOwnedInvoice(String(req.params.id), req.userId);
    if (ownedDel.status) { res.status(ownedDel.status).json({ error: ownedDel.status === 404 ? "Invoice not found" : "Forbidden" }); return; }
    await db.delete(invoicesTable).where(eq(invoicesTable.id, String(req.params.id)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// PDF endpoint
router.get("/invoices/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  try {
    const ownedPdf = await fetchOwnedInvoice(String(req.params.id), req.userId);
    if (ownedPdf.status) { res.status(ownedPdf.status).json({ error: ownedPdf.status === 404 ? "Invoice not found" : "Forbidden" }); return; }
    const invoice = ownedPdf.invoice;

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, invoice.clientId));

    const lineItems = await db
      .select()
      .from(invoiceLineItemsTable)
      .where(eq(invoiceLineItemsTable.invoiceId, invoice.id))
      .orderBy(invoiceLineItemsTable.position);

    const [settings] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, req.userId));
    if (!settings) {
      res.status(400).json({ error: "Configure company settings first" });
      return;
    }

    const buffer = await renderInvoicePdf({
      invoice: { ...invoice, lineItems },
      client,
      company: settings,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${invoice.number}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[invoice-pdf]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

export default router;
