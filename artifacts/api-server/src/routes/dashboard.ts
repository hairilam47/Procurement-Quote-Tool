import { Router, Request, Response } from "express";
import { eq, inArray, sql, desc } from "drizzle-orm";
import { db, quotationsTable, clientsTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();

router.get("/dashboard", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Status counts
    const statusCounts = await db
      .select({
        status: quotationsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(quotationsTable)
      .groupBy(quotationsTable.status);

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

    const countsMap: Record<string, number> = {};
    for (const { status, count } of statusCounts) {
      countsMap[status] = count;
    }

    res.json({
      statusCounts: countsMap,
      outstandingTotal: outstanding[0]?.total ?? "0",
      recentQuotations: recent,
    });
  } catch {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
