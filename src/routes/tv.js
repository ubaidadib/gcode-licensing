import { Router } from "express";
import tvAuth from "../middleware/tvAuth.js";
import { getLicense, updateLicenseStatus, logAudit } from "../db/queries.js";

const router = Router();

/**
 * TradingView alerts post here
 * body: { lic_key, symbol, direction, price, timeframe, tv_secret? }
 * Endpoint checks secret header or tv_secret field and validates license
 */
router.post("/tv/alert", tvAuth, (req, res) => {
  const { lic_key, symbol, direction, price, timeframe } = req.body || {};
  if (!lic_key) return res.status(400).json({ ok: false, error: "missing lic_key" });

  const lic = getLicense(lic_key);
  if (!lic) return res.status(404).json({ ok: false, error: "license_not_found" });

  // Expiry handling
  if (lic.expires_at) {
    const now = Date.now();
    const exp = Date.parse(lic.expires_at);
    if (Number.isFinite(exp) && now > exp && lic.status === "active") {
      updateLicenseStatus(lic_key, "expired", lic.expires_at);
      lic.status = "expired";
    }
  }

  if (lic.status !== "active") {
    logAudit("tv_reject", lic_key, { reason: "license_inactive_or_expired", symbol, timeframe });
    return res.status(403).json({ ok: false, error: "license_invalid" });
  }

  // Here you can forward to your own signal bus or queue if needed
  logAudit("tv_accept", lic_key, { symbol, direction, price, timeframe });

  res.json({
    ok: true,
    accepted: true,
    info: {
      license_plan: lic.plan,
      symbol,
      direction,
      price,
      timeframe
    }
  });
});

export default router;
