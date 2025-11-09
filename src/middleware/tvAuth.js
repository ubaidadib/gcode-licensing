import { timingSafeEqual } from "../utils/crypto.js";

export default function tvAuth(req, res, next) {
  const headerName = process.env.TV_WEBHOOK_SECRET_HEADER || "X-TV-Secret";
  const incoming = req.get(headerName) || (req.body && req.body.tv_secret) || "";
  const expected = process.env.TV_WEBHOOK_SECRET || "";
  if (!expected || !incoming || !timingSafeEqual(incoming, expected)) {
    return res.status(401).json({ ok: false, error: "invalid tv secret" });
  }
  next();
}
