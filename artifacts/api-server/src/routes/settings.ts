import { Router } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import { db, companySettingsTable } from "@workspace/db";
import { settingsSchema } from "../lib/validation";
import { ObjectStorageService } from "../lib/objectStorage";
import { getAuth } from "@clerk/express";

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

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Get settings
router.get("/settings", requireAuth, async (_req, res) => {
  try {
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (!settings) return res.status(404).json({ error: "Settings not configured" });
    res.json(settings);
  } catch {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// Upsert settings
router.put("/settings", requireAuth, async (req, res) => {
  try {
    const data = settingsSchema.parse(req.body);
    const [existing] = await db.select().from(companySettingsTable).limit(1);
    if (existing) {
      const [updated] = await db
        .update(companySettingsTable)
        .set({ ...data, defaultTaxRate: String(data.defaultTaxRate), updatedAt: new Date() })
        .where(eq(companySettingsTable.id, existing.id))
        .returning();
      return res.json(updated);
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
  } catch (err: any) {
    if (err?.name === "ZodError")
      return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Upload logo
router.post(
  "/settings/logo",
  requireAuth,
  upload.single("logo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const objStorage = new ObjectStorageService();
      const uploadUrl = await objStorage.getObjectEntityUploadURL();

      // Upload file to GCS via presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": req.file.mimetype },
        body: req.file.buffer,
      });

      if (!uploadResponse.ok) {
        return res.status(500).json({ error: "Failed to upload logo" });
      }

      // Derive the serving URL from the upload URL
      const uploadedUrl = uploadUrl.split("?")[0];
      // Normalize to our serving path
      const normalized = objStorage.normalizeObjectEntityPath(uploadedUrl);
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "";
      const servingUrl = `${baseUrl}/api/storage${normalized}`;

      res.json({ url: servingUrl, objectPath: normalized });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to upload logo" });
    }
  },
);

export default router;
