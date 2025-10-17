import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const row = db.prepare("SELECT id, invoice_no as invoiceNo, snapshot FROM invoices WHERE id=?").get(id) as any;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let snapshot: any = null;
  try {
    snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
  } catch {
    snapshot = null;
  }
  return NextResponse.json({ id: row.id, number: row.invoiceNo || 0, snapshot });
}


