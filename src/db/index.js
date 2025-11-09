import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const sqlFile = path.join(__dirname, "migrations.sql");

function connectSqlite(file) {
  const db = new Database(file, { fileMustExist: false });
  db.pragma("journal_mode = WAL");
  return db;
}

function runMigrations(db) {
  const sql = fs.readFileSync(sqlFile, "utf8");
  db.exec(sql);
}

if (process.argv[2] === "migrate") {
  const sqlitePath = process.env.SQLITE_FILE || path.join(root, "gcode.sqlite");
  const db = connectSqlite(sqlitePath);
  runMigrations(db);
  console.log("Migrations applied");
  process.exit(0);
}

if (process.argv[2] === "seed") {
  const sqlitePath = process.env.SQLITE_FILE || path.join(root, "gcode.sqlite");
  const db = connectSqlite(sqlitePath);
  const now = new Date();
  db.prepare("INSERT INTO audit_logs(action, meta) VALUES(?, ?)").run("seed", JSON.stringify({ at: now.toISOString() }));
  console.log("Seed complete");
  process.exit(0);
}

export function getDb() {
  const sqlitePath = process.env.SQLITE_FILE || path.join(root, "gcode.sqlite");
  const db = connectSqlite(sqlitePath);
  runMigrations(db);
  return db;
}
