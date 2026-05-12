import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, companySettingsTable, clientsTable, quotationsTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();

router.get("/onboarding/status", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId;

    const [settingsRow] = await db
      .select({ name: companySettingsTable.name, addressLine1: companySettingsTable.addressLine1 })
      .from(companySettingsTable)
      .where(eq(companySettingsTable.userId, userId));

    const [userRow] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const [clientRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clientsTable)
      .where(eq(clientsTable.userId, userId));

    const [sentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotationsTable)
      .where(and(eq(quotationsTable.userId, userId), eq(quotationsTable.status, "SENT")));

    const hasCompanyDetails =
      !!settingsRow?.name?.trim() && !!settingsRow?.addressLine1?.trim();
    const hasStripeConnect = !!userRow?.stripeAccountId;
    const hasClient = (clientRow?.count ?? 0) > 0;
    const hasSentQuotation = (sentRow?.count ?? 0) > 0;

    res.json({ hasCompanyDetails, hasStripeConnect, hasClient, hasSentQuotation });
  } catch {
    res.status(500).json({ error: "Failed to load onboarding status" });
  }
});

export default router;
