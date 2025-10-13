import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(_: Request, context: { params: Promise<{ mobile: string }> }) {
  const db = getDb();
  const { mobile } = await context.params;
  const customer = db.prepare("SELECT mobile, name, address FROM customers WHERE mobile=?").get(mobile);
  const rows: any[] = db
    .prepare("SELECT id, invoice_no as invoiceNo, date_iso as dateISO, total as totalAmount, snapshot FROM invoices WHERE customer_mobile=? ORDER BY date_iso DESC")
    .all(mobile);
  // Encode snapshot JSON to base64 so the client can open /invoice?data=
  const purchases = rows.map((r) => ({
    id: r.id,
    invoiceNo: r.invoiceNo,
    dateISO: r.dateISO,
    totalAmount: r.totalAmount,
    dataParam: r.snapshot ? Buffer.from(String(r.snapshot), "utf8").toString("base64") : undefined,
  }));
  return NextResponse.json({ customer, purchases });
}


