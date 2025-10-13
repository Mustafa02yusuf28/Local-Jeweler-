export type Karat = "24K" | "22K" | "21K" | "20K" | "19K" | "18K" | "17K" | "16K" | "15K" | "14K" | "SILVER";

export interface NewItem {
  id: string;
  description: string;
  karat: Karat;
  grossWeightGm: number; // grams
  stoneWeightGm: number; // grams
  wastageValue: number; // value paired with wastageUnit
  wastageUnit: "g" | "%" | "AMOUNT"; // grams, percent, or flat currency amount
  stoneCost: number; // currency
  ratePerGm: number; // currency per gram
  makingChargeMode?: "PERCENT" | "PER_GM" | "FIXED";
  makingChargeValue?: number; // interpretation depends on mode
  hallmarkCost: number; // flat currency amount
}

export interface OldItem {
  id: string;
  description: string;
  weightGm: number;
  wastageGm: number; // grams deducted
  ratePerGm: number;
}

export interface MiscItem {
  id: string;
  description: string;
  amount: number;
}

export interface BillInput {
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  cgstPct: number;
  sgstPct: number;
  newItems: NewItem[];
  oldItems: OldItem[];
  miscItems: MiscItem[];
}

export interface BillTotals {
  newItemsTotal: number;
  oldItemsTotal: number;
  miscTotal: number;
  grossTotal: number; // new + misc
  netAmount: number; // gross - old
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number; // net + taxes
}


