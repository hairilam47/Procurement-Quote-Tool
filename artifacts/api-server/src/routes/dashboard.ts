import { Router, Request, Response } from "express";
import { eq, inArray, sql, desc, and, gte, lt } from "drizzle-orm";
import { db, quotationsTable, clientsTable, invoicesTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();

const ALL_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "PAID", "EXPIRED"] as const;

router.get("/dashboard", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Status counts — query then fill zeros for every enum value
    const statusRows = await db
      .select({
        status: quotationsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(quotationsTable)
      .groupBy(quotationsTable.status);

    const countsMap: Record<string, number> = Object.fromEntries(
      ALL_STATUSES.map((s) => [s, 0]),
    );
    for (const { status, count } of statusRows) {
      countsMap[status] = count;
    }

    // Outstanding total (SENT + ACCEPTED)
    const outstanding = await db
      .select({
        total: sql<string>`coalesce(sum(${quotationsTable.total}), 0)::text`,
      })
      .from(quotationsTable)
      .where(inArray(quotationsTable.status, ["SENT", "ACCEPTED"]));

    // Recent 10 quotations — full QuotationSummary shape to match OpenAPI contract
    const recent = await db
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
        discountType: quotationsTable.discountType,
        discountValue: quotationsTable.discountValue,
        taxRate: quotationsTable.taxRate,
        subtotal: quotationsTable.subtotal,
        discountAmount: quotationsTable.discountAmount,
        taxAmount: quotationsTable.taxAmount,
      })
      .from(quotationsTable)
      .leftJoin(clientsTable, eq(quotationsTable.clientId, clientsTable.id))
      .orderBy(desc(quotationsTable.createdAt))
      .limit(10);

    // Invoice stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [invoiceOutstanding] = await db
      .select({ total: sql<string>`coalesce(sum(${invoicesTable.total}), 0)::text` })
      .from(invoicesTable)
      .where(eq(invoicesTable.status, "SENT"));

    const [invoicePaidThisMonth] = await db
      .select({ total: sql<string>`coalesce(sum(${invoicesTable.total}), 0)::text` })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.status, "PAID"),
          gte(invoicesTable.paidAt, monthStart),
          lt(invoicesTable.paidAt, monthEnd),
        ),
      );

    const [invoiceTotalInvoiced] = await db
      .select({ total: sql<string>`coalesce(sum(${invoicesTable.total}), 0)::text` })
      .from(invoicesTable);

    const [invoiceDraftCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoicesTable)
      .where(eq(invoicesTable.status, "DRAFT"));

    res.json({
      statusCounts: countsMap,
      outstandingTotal: outstanding[0]?.total ?? "0",
      recentQuotations: recent,
      invoiceStats: {
        outstanding: invoiceOutstanding?.total ?? "0",
        paidThisMonth: invoicePaidThisMonth?.total ?? "0",
        totalInvoiced: invoiceTotalInvoiced?.total ?? "0",
        draftCount: invoiceDraftCount?.count ?? 0,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
