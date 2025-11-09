import crypto from "crypto";

export function generateLicenseKey(prefix = "GCODE-") {
  // 20 random bytes to base32 without padding then chunk for readability
  const buf = crypto.randomBytes(16);
  const base = buf.toString("hex").toUpperCase();
  const chunks = base.match(/.{1,4}/g).join("-");
  return `${prefix}${chunks}`;
}

export function timingSafeEqual(a, b) {
  try {
    const buffA = Buffer.from(a);
    const buffB = Buffer.from(b);
    if (buffA.length !== buffB.length) return false;
    return crypto.timingSafeEqual(buffA, buffB);
  } catch {
    return false;
  }
}
