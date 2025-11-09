import crypto from "crypto";

/**
 * Supports two modes
 * 1 Paddle Billing HMAC mode using PADDLE_WEBHOOK_SECRET and header Paddle-Signature
 * 2 Paddle Classic RSA mode using PADDLE_PUBLIC_KEY_PEM and field p_signature
 */
export function verifyPaddleBillingHmac({ rawBody, signature, secret }) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export function verifyPaddleClassicRsa({ body, publicKeyPem }) {
  if (!body || !body.p_signature || !publicKeyPem) return false;

  const { p_signature, ...rest } = body;
  // Normalize to sorted key order and serialize as PHP style string for classic
  const keys = Object.keys(rest).sort();
  const serialized = keys.map(k => `${k}=${rest[k]}`).join("&");
  const verifier = crypto.createVerify("RSA-SHA1"); // classic uses SHA1
  verifier.update(serialized, "utf8");
  const sig = Buffer.from(p_signature, "base64");
  try {
    return verifier.verify(publicKeyPem, sig);
  } catch {
    return false;
  }
}
