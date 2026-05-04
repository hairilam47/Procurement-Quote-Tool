import { Router, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, companySettingsTable } from "@workspace/db";
import { getAuth } from "@clerk/express";

const router = Router();

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
}

// First-run seed: upsert user record + ensure company_settings row exists
router.post("/auth/seed", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { email, name } = req.body as { email?: string; name?: string };

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, clerkUserId));

    let user;
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({
          email: email ?? existing.email,
          name: name ?? existing.name,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, clerkUserId))
        .returning();
      user = updated;
    } else {
      const [created] = await db
        .insert(usersTable)
        .values({
          id: clerkUserId,
          email: email ?? `${clerkUserId}@unknown.com`,
          name: name ?? null,
        })
        .returning();
      user = created;
    }

    // Ensure at least one company_settings row exists (first-run seed)
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (!settings) {
      await db.insert(companySettingsTable).values({
        name: "My Company",
        email: user!.email,
        addressLine1: "",
        city: "",
        postalCode: "",
        country: "",
        currency: "USD",
        defaultTaxRate: "0",
        defaultTemplate: "MODERN",
      });
    }

    res.json({ user, seeded: !settings });
  } catch {
    res.status(500).json({ error: "Failed to seed" });
  }
});

// Sync Clerk user into our DB
router.post("/auth/sync", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { email, name } = req.body as { email?: string; name?: string };

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, clerkUserId));

    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ email: email ?? existing.email, name: name ?? existing.name, updatedAt: new Date() })
        .where(eq(usersTable.id, clerkUserId))
        .returning();
      res.json(updated);
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        id: clerkUserId,
        email: email ?? `${clerkUserId}@unknown.com`,
        name: name ?? null,
      })
      .returning();
    res.status(201).json(user);
  } catch {
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// Get current user info
router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.clerkUserId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
