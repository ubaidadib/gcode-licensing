import { Router } from "express";
import adminAuth from "../middleware/adminAuth.js";
import { generateLicenseKey } from "../utils/crypto.js";
import { isPlanValid, futureDateFromPlan } from "../utils/validation.js";
import { insertLicense, getLicense, updateLicenseStatus, upsertCustomer, logAudit } from "../db/queries.js";

const router = Router();

/**
 * POST /license/create
 * Admin protected
 * body: { plan, customer: { external_id, email, name }, notes }
 */
router.post("/license/create", adminAuth, (req, res) => {
  const { plan, customer, notes } = req.body || {};
  if (!isPlanValid(plan)) return res.status(400).json({ ok: false, error: "invalid plan" });

  const cust = customer?.external_id ? upsertCustomer(customer) : null;

  const prefix = process.env.LICENSE_PREFIX || "GCODE-";
  const key = generateLicenseKey(prefix);

  const expires = futureDateFromPlan(plan, process.env.TRIAL_DAYS);
  const license = insertLicense({
    key,
    plan,
    status: "active",
    expires_at: expires ? expires.toISOString() : null,
    customer_id: cust ? cust.id : null,
    notes: notes || null
  });

  logAudit("license_create", license.key, { plan, customer: cust?.external_id });

  res.json({ ok: true, license });
});

/**
 * POST /license/validate
 * body: { key }
 */
router.post("/license/validate", (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: "missing key" });

  const lic = getLicense(key);
  if (!lic) return res.status(404).json({ ok: false, error: "not found" });

  // Expiry handling
  if (lic.expires_at) {
    const now = Date.now();
    const exp = Date.parse(lic.expires_at);
    if (Number.isFinite(exp) && now > exp && lic.status === "active") {
      updateLicenseStatus(key, "expired", lic.expires_at);
      lic.status = "expired";
    }
  }

  const valid = lic.status === "active" || (lic.status === "active" && lic.plan === "lifetime");
  res.json({
    ok: true,
    valid: lic.status === "active" && lic.plan !== "expired",
    license: {
      key: lic.key,
      plan: lic.plan,
      status: lic.status,
      expires_at: lic.expires_at
    }
  });
});

/**
 * POST /license/revoke
 * Admin protected
 * body: { key, reason }
 */
router.post("/license/revoke", adminAuth, (req, res) => {
  const { key, reason } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: "missing key" });
  const lic = getLicense(key);
  if (!lic) return res.status(404).json({ ok: false, error: "not found" });

  const updated = updateLicenseStatus(key, "revoked");
  logAudit("license_revoke", key, { reason: reason || "none" });
  res.json({ ok: true, license: updated });
});

export default router;
