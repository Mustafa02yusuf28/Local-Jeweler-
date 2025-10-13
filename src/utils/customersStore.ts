import type { BillInput } from "@/types/billing";
import { encodeBillToParam } from "@/utils/share";

const STORAGE_KEY = "customers.v1";

export type StoredCustomers = Record<string, {
  name: string;
  address?: string;
  purchases: Array<{ invoiceNo?: number; dateISO: string; totalAmount: number; dataParam?: string }>;
}>;

export function loadCustomers(): StoredCustomers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCustomers) : {};
  } catch {
    return {};
  }
}

export function saveCustomers(data: StoredCustomers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function appendPurchase(bill: BillInput, totalAmount: number) {
  if (!bill.customerMobile) return;
  const customers = loadCustomers();
  const existing = customers[bill.customerMobile] || {
    name: bill.customerName || "",
    address: bill.customerAddress || "",
    purchases: [],
  };
  existing.name = bill.customerName || existing.name;
  existing.address = bill.customerAddress || existing.address;
  const dataParam = encodeBillToParam(bill);
  existing.purchases.push({ dateISO: new Date().toISOString(), totalAmount, dataParam });
  customers[bill.customerMobile] = existing;
  saveCustomers(customers);
}


