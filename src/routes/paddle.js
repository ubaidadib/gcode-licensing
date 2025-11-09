import { Router } from "express";
import getRawBody from "raw-body";
import { verifyPaddleBillingHmac, verifyPaddleClassicRsa } from "../utils/paddleVerify.js";
import { insertLicense, updateLicenseStatus, upsertCustomer, logAudit } from "../db/queries.js";
import { generateLicenseKey } from "../utils/crypto.js";
import { futureDateFromPlan } from "../utils/validation.js";

const router = Router();

/**
 * Paddle sends signed webhooks. We must access the raw body.
 * This route reads raw payload, verifies signature, then parses.
 */
router.post("/paddle/webhook", async (req, res) => {
  try {
    const raw = await getRawBody(req);
    const contentType = req.get("content-type") || "";

    const mode = process.env.PADDLE_SIGNATURE_TYPE || "hmac_or_rsa";
    let verified = false;
    let payload = {};

    if (mode === "hmac") {
      const signature = req.get("Paddle-Signature");
      verified = verifyPaddleBillingHmac({
        rawBody: raw,
        signature,
        secret: process.env.PADDLE_WEBHOOK_SECRET
      });
      if (!verified) return res.status(401).json({ ok: false, error: "invalid signature" });
      payload = JSON.parse(raw.toString("utf8"));
    } else if (mode === "rsa") {
      // Classic often uses form encoded
      if (contentType.includes("application/json")) {
        payload = JSON.parse(raw.toString("utf8"));
      } else {
        const txt = raw.toString("utf8");
        payload = Object.fromEntries(new URLSearchParams(txt));
      }
      verified = verifyPaddleClassicRsa({
        body: payload,
        publicKeyPem: process.env.PADDLE_PUBLIC_KEY_PEM
      });
      if (!verified) return res.status(401).json({ ok: false, error: "invalid signature" });
    } else {
      return res.status(400).json({ ok: false, error: "unsupported signature mode" });
    }

    // Normalize event
    // For Billing: event type examples subscription.created, subscription.updated, transaction.completed, subscription.canceled
    // For Classic: alert_name indicates event
    const alertName = payload.event_type || payload.alert_name || "unknown";
    const subId = payload.subscription_id || payload.data?.id || payload.subscription?.id || payload.subscription_id;
    const customerEmail = payload.email || payload.customer_email || payload.data?.customer?.email;
    const customerId = payload.customer_id || payload.data?.customer_id || payload.customer?.id || payload.user_id;

    // Decide plan from product info when present
    const productPlan = payload.product_plan || payload.items?.[0]?.price?.description || "monthly";
    let plan = "monthly";
    if (/annual/i.test(productPlan)) plan = "annual";
    if (/lifetime/i.test(productPlan)) plan = "lifetime";
    if (/trial/i.test(productPlan)) plan = "trial";

    // Create or update customer
    const customer = upsertCustomer({
      external_id: String(customerId || subId || customerEmail || Math.random()),
      email: customerEmail || null,
      name: payload.customer_name || null
    });

    // Handle events
    if (/subscription\.created|transaction\.completed|payment_succeeded|payment_succeeded/i.test(alertName) || /subscription_created/i.test(alertName)) {
      const prefix = process.env.LICENSE_PREFIX || "GCODE-";
      const key = generateLicenseKey(prefix);
      const expires = futureDateFromPlan(plan, process.env.TRIAL_DAYS);
      const lic = insertLicense({
        key,
        plan,
        status: "active",
        expires_at: expires ? expires.toISOString() : null,
        customer_id: customer.id,
        notes: `Paddle ${alertName}`
      });
      logAudit("paddle_activate", key, { alertName, subId, customer: customer.external_id });
      return res.json({ ok: true, action: "activated", license_key: lic.key });
    }

    if (/subscription\.canceled|subscription\.past_due|refund|payment_refunded/i.test(alertName) || /subscription_cancelled|refund_issued/i.test(alertName)) {
      // In real flows you would map license by subscription id you stored
      // Here we assume license key can be provided in passthrough metadata if you set it on Paddle side
      const key = payload.passthrough_license_key || payload.passthrough || payload.metadata?.license_key;
      if (!key) {
        logAudit("paddle_inactive_no_key", subId, { alertName });
        return res.json({ ok: true, action: "noop_no_license_key" });
      }
      const updated = updateLicenseStatus(key, "inactive");
      logAudit("paddle_inactivate", key, { alertName });
      return res.json({ ok: true, action: "inactivated", license_key: updated?.key || key });
    }

    // Default acknowledge
    logAudit("paddle_unhandled", alertName, { sample: true });
    res.json({ ok: true, action: "ack" });
  } catch (e) {
    console.error(e);
    res.status(400).json({ ok: false, error: "bad_request" });
  }
});

export default router;
