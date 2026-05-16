import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Stripe webhook route MUST be registered BEFORE express.json()
// It needs the raw Buffer body for signature verification
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      return res.status(200).json({ received: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Webhook error";
      logger.error({ err: error }, "Stripe webhook error");
      return res.status(400).json({ error: message });
    }
  },
);

// Intercept Better Auth's error redirect before it reaches the Better Auth handler.
// By default Better Auth redirects /api/auth/error to baseURL ("/") which is the
// marketing page. We send users to the dashboard sign-in page instead.
app.get("/api/auth/error", (_req, res) => {
  res.redirect("/app/sign-in?error=auth");
});

// Better-auth handler — MUST be before body parsers so it can read the raw body
const authHandler = toNodeHandler(auth);
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    return authHandler(req, res);
  }
  next();
});

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// SEO static files served at root level
app.get("/sitemap.xml", (_req, res) => {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "kuotflow.app";
  res.setHeader("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/marketing/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

app.get("/robots.txt", (_req, res) => {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "kuotflow.app";
  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *\nAllow: /\nSitemap: https://${domain}/sitemap.xml\n`);
});

export default app;
