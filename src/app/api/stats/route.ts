import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET() {
  const db = getDb();
  const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM customers").get().c as number;
  const totalInvoices = db.prepare("SELECT COUNT(*) as c FROM invoices").get().c as number;
  const lastInvoiceNoRow = db.prepare("SELECT MAX(invoice_no) as maxNo FROM invoices").get();
  const lastInvoiceNo = (lastInvoiceNoRow?.maxNo as number) || 0;
  return NextResponse.json({ totalCustomers, totalInvoices, lastInvoiceNo });
}


