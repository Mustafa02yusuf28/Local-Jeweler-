import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month"); // 1-12
  if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });
  const ym = `${year}-${String(Number(month)).padStart(2, "0")}`;

  const db = getDb();
  const invoices: any[] = db
    .prepare("SELECT id, customer_mobile as mobile, date_iso as dateISO, total, cgst, sgst, color, invoice_no, snapshot FROM invoices WHERE strftime('%Y-%m', date_iso)=? ORDER BY date_iso")
    .all(ym);
  const invoiceIds = invoices.map((i) => i.id);

  let gross = 0;
  if (invoiceIds.length) {
    const qMarks = invoiceIds.map(() => "?").join(",");
    const sumLine = db.prepare(`SELECT SUM(line_total) as s FROM invoice_items WHERE invoice_id IN (${qMarks})`).get(...invoiceIds);
    const sumMisc = db.prepare(`SELECT SUM(amount) as s FROM misc_items WHERE invoice_id IN (${qMarks})`).get(...invoiceIds);
    gross = (sumLine?.s || 0) + (sumMisc?.s || 0);
  }

  let oldExchange = 0;
  if (invoiceIds.length) {
    const qMarks = invoiceIds.map(() => "?").join(",");
    const row = db.prepare(`SELECT SUM(total) as s FROM old_items WHERE invoice_id IN (${qMarks})`).get(...invoiceIds);
    oldExchange = row?.s || 0;
  }

  const totalCGST = invoices.reduce((s, r) => s + (r.cgst || 0), 0);
  const totalSGST = invoices.reduce((s, r) => s + (r.sgst || 0), 0);
  const net = gross + totalCGST + totalSGST - oldExchange;

  const byDay = db
    .prepare("SELECT strftime('%Y-%m-%d', date_iso) as day, SUM(total) as netAmount FROM invoices WHERE strftime('%Y-%m', date_iso)=? GROUP BY day ORDER BY day")
    .all(ym);

  const karatBreakdown = invoiceIds.length
    ? db
        .prepare(
          `SELECT karat, SUM(line_total) as amount, SUM(net) as grams, AVG(rate) as avgRate
           FROM invoice_items WHERE invoice_id IN (${invoiceIds.map(() => "?").join(",")}) GROUP BY karat`
        )
        .all(...invoiceIds)
    : [];

  const hallmarkTotal = invoiceIds.length
    ? db.prepare(`SELECT SUM(hallmark) as s FROM invoice_items WHERE invoice_id IN (${invoiceIds.map(() => "?").join(",")})`).get(...invoiceIds).s || 0
    : 0;
  const stoneTotal = invoiceIds.length
    ? db.prepare(`SELECT SUM(stone_cost) as s FROM invoice_items WHERE invoice_id IN (${invoiceIds.map(() => "?").join(",")})`).get(...invoiceIds).s || 0
    : 0;

  const colorMix = undefined;

  const uniqueCustomers = db
    .prepare("SELECT COUNT(DISTINCT customer_mobile) as c FROM invoices WHERE strftime('%Y-%m', date_iso)=?")
    .get(ym).c as number;

  return NextResponse.json({
    month: ym,
    kpis: {
      invoiceCount: invoices.length,
      uniqueCustomers,
      gross,
      oldExchange,
      totalCGST,
      totalSGST,
      net,
      colorMix,
    },
    byDay,
    karatBreakdown,
    invoices,
    extras: {
      hallmarkTotal,
      stoneTotal,
    },
  });
}


