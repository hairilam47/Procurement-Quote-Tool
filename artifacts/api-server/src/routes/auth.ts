import { Router, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, companySettingsTable } from "@workspace/db";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

const router = Router();

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = session.user.id;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// First-run seed: upsert user record + ensure company_settings row exists
// Note: uses /user/seed prefix to avoid conflict with better-auth's /auth/* handler
router.post("/user/seed", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    let user;
    if (existing) {
      user = existing;
    } else {
      const { email, name } = req.body as { email?: string; name?: string };
      const [created] = await db
        .insert(usersTable)
        .values({
          id: userId,
          email: email ?? `${userId}@unknown.com`,
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

// Get current user info
router.get("/user/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));
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
