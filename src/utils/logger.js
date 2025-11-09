export function redact(obj, keys = ["authorization", "cookie", "x-tv-secret"]) {
  const lower = new Set(keys.map(k => k.toLowerCase()));
  const safe = {};
  for (const [k, v] of Object.entries(obj || {})) {
    safe[k] = lower.has(k.toLowerCase()) ? "[redacted]" : v;
  }
  return safe;
}
