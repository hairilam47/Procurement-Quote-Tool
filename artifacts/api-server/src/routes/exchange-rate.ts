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
    const upstream = await fetch(
      `https://api.frankfurter.dev/v1/latest?from=${encodeURIComponent(fromUpper)}&to=${encodeURIComponent(toUpper)}`,
      { signal: AbortSignal.timeout(6000) },
    );

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream returned ${upstream.status}` });
      return;
    }

    const json = await upstream.json() as { rates?: Record<string, number> };
    const rate = json.rates?.[toUpper];

    if (rate == null) {
      res.status(502).json({ error: `Rate not found for ${fromUpper} → ${toUpper}` });
      return;
    }

    res.json({ rate });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch exchange rate from upstream" });
  }
});

export default router;
