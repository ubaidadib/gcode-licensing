export default function adminAuth(req, res, next) {
  const token = req.get("X-Admin-Token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  next();
}
