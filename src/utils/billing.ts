import type { BillInput, BillTotals, NewItem, OldItem } from "@/types/billing";

export const defaultGoldRates: Record<string, number> = {
  "24K": 10000,
  "22K": 9166.67,
  "20K": 8333.33,
  "18K": 7500,
  "14K": 5833.33,
  SILVER: 150,
};

export function computeNewItemNetWeightGm(item: NewItem): number {
  // Wastage temporarily disabled
  const net = item.grossWeightGm - item.stoneWeightGm;
  return Math.max(0, round2(net));
}

export function computeNewItemAmount(item: NewItem): number {
  const netWeight = computeNewItemNetWeightGm(item);
  const netAmount = netWeight * item.ratePerGm;
  let mc = 0;
  if (item.makingChargeMode === "PERCENT") {
    mc = (netAmount * (item.makingChargeValue || 0)) / 100;
  } else if (item.makingChargeMode === "PER_GM") {
    mc = netWeight * (item.makingChargeValue || 0);
  } else if (item.makingChargeMode === "FIXED") {
    mc = item.makingChargeValue || 0;
  }
  const hm = item.hallmarkCost || 0;
  return round2(netAmount + mc + hm + (item.stoneCost || 0));
}

export function computeOldItemAmount(item: OldItem): number {
  const payableWeight = Math.max(0, (item.weightGm || 0) - (item.wastageGm || 0));
  return round2(payableWeight * (item.ratePerGm || 0));
}

export function computeBillTotals(bill: BillInput): BillTotals {
  const newItemsTotal = round2(
    (bill.newItems || []).reduce((sum, i) => sum + computeNewItemAmount(i), 0)
  );
  const oldItemsTotal = round2(
    (bill.oldItems || []).reduce((sum, i) => sum + computeOldItemAmount(i), 0)
  );
  const miscTotal = round2(
    (bill.miscItems || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  );

  const grossTotal = round2(newItemsTotal + miscTotal);
  // Taxes should NOT apply on old exchange amount; compute on gross only
  const cgstAmount = round2((grossTotal * (bill.cgstPct || 0)) / 100);
  const sgstAmount = round2((grossTotal * (bill.sgstPct || 0)) / 100);
  const netAmount = round2(grossTotal + cgstAmount + sgstAmount - oldItemsTotal);
  const grandTotal = netAmount;

  return {
    newItemsTotal,
    oldItemsTotal,
    miscTotal,
    grossTotal,
    netAmount,
    cgstAmount,
    sgstAmount,
    grandTotal,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function currency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
}


