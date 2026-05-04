import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getAuth } from "@clerk/express";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });
  (req as any).clerkUserId = auth.userId;
  next();
}

// Sync Clerk user into our DB
router.post("/auth/sync", requireAuth, async (req: any, res) => {
  try {
    const clerkUserId = req.clerkUserId;
    const { email, name } = req.body;

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
      return res.json(updated);
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
router.get("/auth/me", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.clerkUserId));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
