import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  receiptsTable,
  invoicesTable,
  invoiceLineItemsTable,
  companySettingsTable,
} from "@workspace/db";
import { requireAuth } from "./auth";
import { renderReceiptPdf } from "../lib/pdf/render";

const router = Router();

// List receipts for the current user
router.get("/receipts", requireAuth, async (req, res): Promise<void> => {
  try {
    const receipts = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.userId, req.userId))
      .orderBy(desc(receiptsTable.issuedAt));
    res.json(receipts);
  } catch {
    res.status(500).json({ error: "Failed to list receipts" });
  }
});

// Get receipt by ID
router.get("/receipts/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, String(req.params.id)));
    if (!receipt) { res.status(404).json({ error: "Receipt not found" }); return; }
    if (receipt.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    res.json(receipt);
  } catch {
    res.status(500).json({ error: "Failed to get receipt" });
  }
});

// Get receipt by invoice ID
router.get("/receipts/by-invoice/:invoiceId", requireAuth, async (req, res): Promise<void> => {
  try {
    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.invoiceId, String(req.params.invoiceId)));
    if (!receipt) { res.status(404).json({ error: "Receipt not found" }); return; }
    if (receipt.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    res.json(receipt);
  } catch {
    res.status(500).json({ error: "Failed to get receipt" });
  }
});

// Download receipt PDF
router.get("/receipts/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  try {
    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, String(req.params.id)));
    if (!receipt) { res.status(404).json({ error: "Receipt not found" }); return; }
    if (receipt.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    // Fetch the linked invoice for template + financial metadata
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, receipt.invoiceId));

    const [settings] = await db
      .select()
      .from(companySettingsTable)
      .where(eq(companySettingsTable.userId, req.userId));

    if (!settings) {
      res.status(400).json({ error: "Configure company settings first" });
      return;
    }

    // Reconstruct line items from snapshot or fall back to live DB rows
    type SnapLineItem = {
      id: string;
      sku?: string | null;
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      rateFormula?: string | null;
      paymentRequired: boolean;
      lineTotal: string;
    };

    let lineItems: SnapLineItem[] = [];
    if (Array.isArray(receipt.lineItemsSnapshot) && receipt.lineItemsSnapshot.length > 0) {
      lineItems = receipt.lineItemsSnapshot as SnapLineItem[];
    } else if (invoice) {
      lineItems = await db
        .select()
        .from(invoiceLineItemsTable)
        .where(eq(invoiceLineItemsTable.invoiceId, invoice.id))
        .orderBy(invoiceLineItemsTable.position) as SnapLineItem[];
    }

    // Build a QuoteData-compatible object from the receipt snapshots + invoice metadata
    const invoiceData = invoice ?? {
      id: receipt.invoiceId,
      number: receipt.invoiceNumber,
      status: "PAID",
      issueDate: receipt.issuedAt,
      dueDate: receipt.issuedAt,
      paidAt: receipt.paidAt,
      currency: receipt.currency,
      secondaryCurrency: null,
      secondaryExchangeRate: null,
      discountType: null,
      discountValue: "0",
      discountAmount: "0",
      taxRate: "0",
      taxAmount: "0",
      subtotal: receipt.amountPaid,
      total: receipt.amountPaid,
      requiredTotal: receipt.amountPaid,
      notes: null,
      terms: null,
      paymentUrl: null,
      showQrCode: false,
      paymentMethod: receipt.paymentMethod,
      template: "MODERN",
    };

    const quoteData = {
      ...invoiceData,
      lineItems,
      clientSnapshot: receipt.clientSnapshot,
      companySnapshot: receipt.companySnapshot,
      // Use the receipt's stored payment method (stripe/manual) so the PDF shows it correctly
      paymentMethod: receipt.paymentMethod,
    };

    const buffer = await renderReceiptPdf({
      quote: quoteData as Parameters<typeof renderReceiptPdf>[0]["quote"],
      client: settings as Parameters<typeof renderReceiptPdf>[0]["client"],
      company: settings as Parameters<typeof renderReceiptPdf>[0]["company"],
      receiptNumber: receipt.number,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${receipt.number}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  } catch (err) {
    console.error("[receipt-pdf]", err);
    res.status(500).json({ error: "PDF render failed" });
  }
});

export default router;
