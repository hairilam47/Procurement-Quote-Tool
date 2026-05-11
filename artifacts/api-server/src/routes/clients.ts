import { Router } from "express";
import { getZodErrors } from "../lib/zodError";
import { eq, ilike, or, and } from "drizzle-orm";
import { db, clientsTable, quotationsTable } from "@workspace/db";
import { clientSchema } from "../lib/validation";
import { generateId } from "../lib/id";
import { requireAuth, requireSubscription } from "./auth";

const router = Router();

type OwnedClient =
  | { client: typeof clientsTable.$inferSelect; status: null }
  | { client: null; status: 403 | 404 };

async function fetchOwnedClient(id: string, userId: string): Promise<OwnedClient> {
  const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!row) return { client: null, status: 404 };
  if (row.userId !== userId) return { client: null, status: 403 };
  return { client: row, status: null };
}

// List clients
router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    let clients;
    if (search) {
      const like = `%${search}%`;
      clients = await db
        .select()
        .from(clientsTable)
        .where(
          and(
            eq(clientsTable.userId, req.userId),
            or(
              ilike(clientsTable.name, like),
              ilike(clientsTable.email, like),
              ilike(clientsTable.company, like),
            ),
          ),
        )
        .orderBy(clientsTable.name);
    } else {
      clients = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.userId, req.userId))
        .orderBy(clientsTable.name);
    }
    res.json(clients);
  } catch {
    res.status(500).json({ error: "Failed to list clients" });
  }
});

// Get client by ID
router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const owned = await fetchOwnedClient(String(req.params.id), req.userId);
    if (owned.status) {
      res.status(owned.status).json({ error: owned.status === 404 ? "Client not found" : "Forbidden" });
      return;
    }
    res.json(owned.client);
  } catch {
    res.status(500).json({ error: "Failed to get client" });
  }
});

// Create client
router.post("/clients", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .insert(clientsTable)
      .values({ ...data, id: generateId(), userId: req.userId })
      .returning();
    res.status(201).json(client);
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to create client" });
  }
});

// Update client
router.put("/clients/:id", requireAuth, requireSubscription, async (req, res): Promise<void> => {
  try {
    const owned = await fetchOwnedClient(String(req.params.id), req.userId);
    if (owned.status) {
      res.status(owned.status).json({ error: owned.status === 404 ? "Client not found" : "Forbidden" });
      return;
    }
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .update(clientsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientsTable.id, String(req.params.id)))
      .returning();
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
    res.json(client);
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete client
router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const owned = await fetchOwnedClient(String(req.params.id), req.userId);
    if (owned.status) {
      res.status(owned.status).json({ error: owned.status === 404 ? "Client not found" : "Forbidden" });
      return;
    }
    const [existing] = await db
      .select({ id: quotationsTable.id })
      .from(quotationsTable)
      .where(eq(quotationsTable.clientId, String(req.params.id)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Cannot delete client with existing quotations" });
      return;
    }
    await db.delete(clientsTable).where(eq(clientsTable.id, String(req.params.id)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
