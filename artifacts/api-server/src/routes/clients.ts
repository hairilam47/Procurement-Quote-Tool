import { Router } from "express";
import { getZodErrors } from "../lib/zodError";
import { eq, ilike, or, and } from "drizzle-orm";
import { db, clientsTable, quotationsTable } from "@workspace/db";
import { clientSchema } from "../lib/validation";
import { generateId } from "../lib/id";
import { requireAuth, requireSubscription } from "./auth";

const router = Router();

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
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, String(req.params.id)), eq(clientsTable.userId, req.userId)));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(client);
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
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .update(clientsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(clientsTable.id, String(req.params.id)), eq(clientsTable.userId, req.userId)))
      .returning();
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
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
    const [existing] = await db
      .select({ id: quotationsTable.id })
      .from(quotationsTable)
      .where(eq(quotationsTable.clientId, String(req.params.id)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Cannot delete client with existing quotations" });
      return;
    }
    await db
      .delete(clientsTable)
      .where(and(eq(clientsTable.id, String(req.params.id)), eq(clientsTable.userId, req.userId)));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
