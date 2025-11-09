import { Router } from "express";
const router = Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, app: process.env.APP_NAME || "GCode", ts: new Date().toISOString() });
});

export default router;
