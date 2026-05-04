import { Router } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, clientsTable } from "@workspace/db";
import { clientSchema } from "../lib/validation";
import { generateId } from "../lib/id";
import { getAuth } from "@clerk/express";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// List clients
router.get("/clients", requireAuth, async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: "Failed to list clients" });
  }
});

// Get client by ID
router.get("/clients/:id", requireAuth, async (req, res) => {
  try {
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, req.params.id));
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch {
    res.status(500).json({ error: "Failed to get client" });
  }
});

// Create client
router.post("/clients", requireAuth, async (req, res) => {
  try {
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .insert(clientsTable)
      .values({ ...data, id: generateId() })
      .returning();
    res.status(201).json(client);
  } catch (err: any) {
    if (err?.name === "ZodError")
      return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to create client" });
  }
});

// Update client
router.put("/clients/:id", requireAuth, async (req, res) => {
  try {
    const data = clientSchema.parse(req.body);
    const [client] = await db
      .update(clientsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientsTable.id, req.params.id))
      .returning();
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch (err: any) {
    if (err?.name === "ZodError")
      return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete client
router.delete("/clients/:id", requireAuth, async (req, res) => {
  try {
    // Check for existing quotations
    const { quotationsTable } = await import("@workspace/db");
    const [existing] = await db
      .select({ id: quotationsTable.id })
      .from(quotationsTable)
      .where(eq(quotationsTable.clientId, req.params.id))
      .limit(1);
    if (existing) {
      return res
        .status(409)
        .json({ error: "Cannot delete client with existing quotations" });
    }
    await db
      .delete(clientsTable)
      .where(eq(clientsTable.id, req.params.id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
