import fs from "fs";
import path from "path";
import type { Workbook } from "exceljs";

// Lazy import exceljs only on server
async function getWorkbook() {
  const ExcelJS = (await import("exceljs")) as any;
  return new ExcelJS.Workbook() as Workbook;
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export async function upsertInvoiceExcel(payload: any) {
  const dataDir = ensureDataDir();
  const file = path.join(dataDir, "backup.xlsx");
  const wb = await getWorkbook();

  if (fs.existsSync(file)) {
    await wb.xlsx.readFile(file);
  }

  const sheets = {
    invoices: wb.getWorksheet("Invoices") || wb.addWorksheet("Invoices"),
    items: wb.getWorksheet("Items") || wb.addWorksheet("Items"),
    oldItems: wb.getWorksheet("OldItems") || wb.addWorksheet("OldItems"),
    misc: wb.getWorksheet("Misc") || wb.addWorksheet("Misc"),
    customers: wb.getWorksheet("Customers") || wb.addWorksheet("Customers"),
  };

  // Setup headers if empty
  if (sheets.invoices.rowCount === 0) sheets.invoices.addRow(["id", "invoice_no", "date_iso", "customer_mobile", "cgst", "sgst", "total", "color"]);
  if (sheets.items.rowCount === 0) sheets.items.addRow(["invoice_id", "item_id", "description", "karat", "gross", "stone", "net", "rate", "making_mode", "making_value", "hallmark", "stone_cost", "line_total"]);
  if (sheets.oldItems.rowCount === 0) sheets.oldItems.addRow(["invoice_id", "old_id", "description", "weight", "wastage", "rate", "total"]);
  if (sheets.misc.rowCount === 0) sheets.misc.addRow(["invoice_id", "misc_id", "description", "amount"]);
  if (sheets.customers.rowCount === 0) sheets.customers.addRow(["mobile", "name", "address"]);

  const inv = payload.invoice;
  const cust = payload.customer;

  // Append invoice
  sheets.invoices.addRow([inv.id, inv.invoiceNo || "", inv.dateISO, cust.mobile, inv.cgst, inv.sgst, inv.total, inv.color]);

  // Append line items
  for (const it of inv.newItems || []) {
    sheets.items.addRow([inv.id, it.id, it.description, it.karat, it.gross, it.stone, it.net, it.rate, it.makingMode, it.makingValue, it.hallmark, it.stoneCost, it.total]);
  }

  for (const it of inv.oldItems || []) {
    sheets.oldItems.addRow([inv.id, it.id, it.description, it.weight, it.wastage, it.rate, it.total]);
  }

  for (const it of inv.miscItems || []) {
    sheets.misc.addRow([inv.id, it.id, it.description, it.amount]);
  }

  // Upsert customer row (simple append; Excel isn't relational). Optionally we could de-dupe.
  sheets.customers.addRow([cust.mobile, cust.name, cust.address]);

  await wb.xlsx.writeFile(file);
}


