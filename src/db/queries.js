import { getDb } from "./index.js";

const db = getDb();

export function createCustomer({ external_id, email, name }) {
  const stmt = db.prepare("INSERT OR IGNORE INTO customers(external_id, email, name) VALUES(?,?,?)");
  stmt.run(external_id || null, email || null, name || null);
  return db.prepare("SELECT * FROM customers WHERE external_id = ?").get(external_id);
}

export function upsertCustomer({ external_id, email, name }) {
  const existing = db.prepare("SELECT * FROM customers WHERE external_id = ?").get(external_id);
  if (existing) {
    db.prepare("UPDATE customers SET email = COALESCE(?, email), name = COALESCE(?, name) WHERE id = ?")
      .run(email || null, name || null, existing.id);
    return db.prepare("SELECT * FROM customers WHERE id = ?").get(existing.id);
  }
  return createCustomer({ external_id, email, name });
}

export function insertLicense({ key, plan, status, expires_at, customer_id, notes }) {
  const stmt = db.prepare(`
    INSERT INTO licenses(key, plan, status, expires_at, customer_id, notes)
    VALUES(?,?,?,?,?,?)
  `);
  stmt.run(key, plan, status, expires_at || null, customer_id || null, notes || null);
  return db.prepare("SELECT * FROM licenses WHERE key = ?").get(key);
}

export function updateLicenseStatus(key, status, expires_at) {
  db.prepare(`
    UPDATE licenses
    SET status = ?, expires_at = COALESCE(?, expires_at), updated_at = CURRENT_TIMESTAMP
    WHERE key = ?
  `).run(status, expires_at || null, key);
  return db.prepare("SELECT * FROM licenses WHERE key = ?").get(key);
}

export function getLicense(key) {
  return db.prepare("SELECT * FROM licenses WHERE key = ?").get(key);
}

export function logAudit(action, subject, meta) {
  db.prepare("INSERT INTO audit_logs(action, subject, meta) VALUES(?,?,?)")
    .run(action, subject || null, JSON.stringify(meta || {}));
}
