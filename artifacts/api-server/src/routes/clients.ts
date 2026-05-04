import { Router } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, clientsTable, quotationsTable } from "@workspace/db";
import { clientSchema } from "../lib/validation";
import { generateId } from "../lib/id";
import { requireAuth } from "./auth";

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
          or(
            ilike(clientsTable.name, like),
            ilike(clientsTable.email, like),
            ilike(clientsTable.company, like),
          ),
        )
        .orderBy(clientsTable.name);
    } else {
      clients = await db
        .select()
        .from(clientsTable)
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
      .where(eq(clientsTable.id, req.params.id));
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
router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .insert(clientsTable)
      .values({ ...data, id: generateId() })
      .returning();
    res.status(201).json(client);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: "Failed to create client" });
  }
});

// Update client
router.put("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .update(clientsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientsTable.id, req.params.id))
      .returning();
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(client);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete client
router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const [existing] = await db
      .select({ id: quotationsTable.id })
      .from(quotationsTable)
      .where(eq(quotationsTable.clientId, req.params.id))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Cannot delete client with existing quotations" });
      return;
    }
    await db.delete(clientsTable).where(eq(clientsTable.id, req.params.id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
