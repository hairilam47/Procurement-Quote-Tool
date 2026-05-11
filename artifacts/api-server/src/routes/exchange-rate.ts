import { Router } from "express";

const router = Router();

router.get("/exchange-rate", async (req, res): Promise<void> => {
  const { from, to } = req.query as Record<string, string | undefined>;

  if (!from || !to) {
    res.status(400).json({ error: "Missing required query params: from, to" });
    return;
  }

  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) {
    res.json({ rate: 1 });
    return;
  }

  try {
    // open.er-api.com supports 160+ currencies including MYR, INR, BRL, ZAR, KRW, MXN
    // (frankfurter.dev only covers ~31 ECB currencies and does not support these)
    const upstream = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(fromUpper)}`,
      { signal: AbortSignal.timeout(6000) },
    );

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }

    const json = await upstream.json() as { result?: string; rates?: Record<string, number> };

    if (json.result !== "success") {
      res.status(502).json({ error: `Rate not available for ${fromUpper}` });
      return;
    }

    const rate = json.rates?.[toUpper];

    if (rate == null) {
      res.status(502).json({ error: `Rate not found for ${fromUpper} → ${toUpper}` });
      return;
    }

    res.json({ rate });
  } catch {
    res.status(502).json({ error: "Failed to fetch exchange rate from upstream" });
  }
});

export default router;
