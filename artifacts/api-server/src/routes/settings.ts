import { Router } from "express";
import { getZodErrors } from "../lib/zodError";
import { eq } from "drizzle-orm";
import multer from "multer";
import { db, companySettingsTable } from "@workspace/db";
import { settingsSchema } from "../lib/validation";
import { ObjectStorageService } from "../lib/objectStorage";
import { requireAuth } from "./auth";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|jpg|svg\+xml|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Logo must be PNG, JPG, SVG, or WEBP"));
    }
  },
});

// Get settings
router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  try {
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (!settings) {
      res.status(404).json({ error: "Settings not configured" });
      return;
    }
    res.json(settings);
  } catch {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// Upsert settings
router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = settingsSchema.parse(req.body);
    const [existing] = await db.select().from(companySettingsTable).limit(1);
    if (existing) {
      const [updated] = await db
        .update(companySettingsTable)
        .set({ ...data, defaultTaxRate: String(data.defaultTaxRate), updatedAt: new Date() })
        .where(eq(companySettingsTable.id, existing.id))
        .returning();
      res.json(updated);
      return;
    }
    const [created] = await db
      .insert(companySettingsTable)
      .values({
        id: "singleton",
        ...data,
        defaultTaxRate: String(data.defaultTaxRate),
      })
      .returning();
    res.status(201).json(created);
  } catch (err: unknown) {
    const zodErrors = getZodErrors(err);
    if (zodErrors) { res.status(400).json({ error: zodErrors }); return; }
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Upload logo
router.post(
  "/settings/logo",
  requireAuth,
  upload.single("logo"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const objStorage = new ObjectStorageService();
      const uploadUrl = await objStorage.getObjectEntityUploadURL();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": req.file.mimetype },
        body: req.file.buffer,
      });

      if (!uploadResponse.ok) {
        res.status(500).json({ error: "Failed to upload logo" });
        return;
      }

      const uploadedUrl = uploadUrl.split("?")[0];
      const normalized = objStorage.normalizeObjectEntityPath(uploadedUrl);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "";
      const servingUrl = `${baseUrl}/api/storage${normalized}`;

      res.json({ url: servingUrl, objectPath: normalized });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload logo";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
