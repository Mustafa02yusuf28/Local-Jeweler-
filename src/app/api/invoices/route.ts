import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { upsertInvoiceExcel } from "@/server/excel";

export async function POST(req: Request) {
  // Basic same-origin CSRF guard
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { invoice, customer } = payload || {};
  // Minimal input validation
  if (!customer || typeof customer.mobile !== 'string' || !customer.mobile.trim()) {
    return NextResponse.json({ error: "customer.mobile required" }, { status: 400 });
  }
  if (!invoice || typeof invoice.id !== 'string' || !invoice.id) {
    return NextResponse.json({ error: "invoice.id required" }, { status: 400 });
  }
  const db = getDb();

  const upsertCustomer = db.prepare(
    "INSERT INTO customers(mobile, name, address, updated_at) VALUES(?, ?, ?, datetime('now')) ON CONFLICT(mobile) DO UPDATE SET name=excluded.name, address=excluded.address, updated_at=datetime('now')"
  );
  const insertInvoice = db.prepare(
    "INSERT INTO invoices(id, customer_mobile, invoice_no, date_iso, cgst, sgst, total, color, snapshot) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertItem = db.prepare(
    "INSERT INTO invoice_items(id, invoice_id, description, karat, gross, stone, net, rate, making_mode, making_value, hallmark, stone_cost, line_total) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertOld = db.prepare(
    "INSERT INTO old_items(id, invoice_id, description, weight, wastage, rate, total) VALUES(?, ?, ?, ?, ?, ?, ?)"
  );
  const insertMisc = db.prepare(
    "INSERT INTO misc_items(id, invoice_id, description, amount) VALUES(?, ?, ?, ?)"
  );

  let assignedNumber = 0;
  const tx = db.transaction(() => {
    upsertCustomer.run(customer.mobile, customer.name, customer.address);
    const maxRow = db.prepare("SELECT COALESCE(MAX(invoice_no), 0) as m FROM invoices WHERE color=?").get(invoice.color || "white");
    const nextInvoiceNo = (invoice?.invoiceNo && invoice.invoiceNo > 0) ? invoice.invoiceNo : ((maxRow?.m as number) + 1);
    assignedNumber = nextInvoiceNo;
    insertInvoice.run(
      invoice.id,
      customer.mobile,
      nextInvoiceNo,
      invoice.dateISO,
      invoice.cgst,
      invoice.sgst,
      invoice.total,
      invoice.color,
      JSON.stringify(invoice.snapshot)
    );
    for (const it of invoice.newItems || []) {
      insertItem.run(it.id, invoice.id, it.description, it.karat, it.gross, it.stone, it.net, it.rate, it.makingMode, it.makingValue, it.hallmark, it.stoneCost, it.total);
    }
    for (const it of invoice.oldItems || []) {
      insertOld.run(it.id, invoice.id, it.description, it.weight, it.wastage, it.rate, it.total);
    }
    for (const it of invoice.miscItems || []) {
      insertMisc.run(it.id, invoice.id, it.description, it.amount);
    }
  });

  tx();
  try { await upsertInvoiceExcel(payload); } catch {}
  return NextResponse.json({ ok: true, id: invoice.id, number: assignedNumber });
}


