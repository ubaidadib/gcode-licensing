export default function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error("Unhandled error", err);
  res.status(500).json({ ok: false, error: "internal_error" });
}
