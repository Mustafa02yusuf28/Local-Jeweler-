import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

function ensureDatabase(): Database.Database {
  if (db) return db;
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "app.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations(
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE
    );
  `);

  const migrations: { name: string; sql: string }[] = [
    {
      name: "001_init",
      sql: `
        CREATE TABLE IF NOT EXISTS customers (
          mobile TEXT PRIMARY KEY,
          name TEXT,
          address TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          customer_mobile TEXT,
          invoice_no INTEGER,
          date_iso TEXT,
          cgst REAL,
          sgst REAL,
          total REAL,
          color TEXT,
          snapshot TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY(customer_mobile) REFERENCES customers(mobile)
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
          id TEXT PRIMARY KEY,
          invoice_id TEXT,
          description TEXT,
          karat TEXT,
          gross REAL,
          stone REAL,
          net REAL,
          rate REAL,
          making_mode TEXT,
          making_value REAL,
          hallmark REAL,
          stone_cost REAL,
          line_total REAL,
          FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        );

        CREATE TABLE IF NOT EXISTS old_items (
          id TEXT PRIMARY KEY,
          invoice_id TEXT,
          description TEXT,
          weight REAL,
          wastage REAL,
          rate REAL,
          total REAL,
          FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        );

        CREATE TABLE IF NOT EXISTS misc_items (
          id TEXT PRIMARY KEY,
          invoice_id TEXT,
          description TEXT,
          amount REAL,
          FOREIGN KEY(invoice_id) REFERENCES invoices(id)
        );

        CREATE TABLE IF NOT EXISTS rates (
          karat TEXT PRIMARY KEY,
          rate REAL
        );
      `,
    },
  ];

  const applied = new Set<string>(
    db.prepare("SELECT name FROM schema_migrations").all().map((r: any) => r.name)
  );
  const insert = db.prepare("INSERT INTO schema_migrations(name) VALUES(?)");
  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    db.exec(m.sql);
    insert.run(m.name);
  }
}

export function getDb() {
  return ensureDatabase();
}


