"use client";

import type { BillInput } from "@/types/billing";
import { computeBillTotals, computeNewItemNetWeightGm, computeNewItemAmount, computeOldItemAmount } from "@/utils/billing";
import { encodeBillToParam } from "@/utils/share";
import { appendPurchase } from "@/utils/customersStore";

export default function BillingActions({ bill }: { bill: BillInput }) {
  function openPrint() {
    if (typeof window !== 'undefined') {
      const ok = window.confirm("Press Print to confirm. This will save the bill to customer history.");
      if (!ok) return;
    }
    const param = encodeBillToParam(bill);
    const query = new URLSearchParams({ data: param });
    const url = `/invoice?${query.toString()}`;
    try {
      const totals = computeBillTotals(bill);
      // Save full invoice to server DB
      const payload = {
        customer: {
          mobile: bill.customerMobile,
          name: bill.customerName,
          address: bill.customerAddress,
        },
        invoice: {
          id: crypto.randomUUID(),
          invoiceNo: 0,
          dateISO: new Date().toISOString(),
          cgst: bill.cgstPct,
          sgst: bill.sgstPct,
          total: totals.grandTotal,
          color: "white",
          snapshot: bill,
          newItems: bill.newItems.map((i) => ({
            id: crypto.randomUUID(),
            description: i.description,
            karat: i.karat,
            gross: i.grossWeightGm,
            stone: i.stoneWeightGm,
            net: computeNewItemNetWeightGm(i),
            rate: i.ratePerGm,
            makingMode: i.makingChargeMode,
            makingValue: i.makingChargeValue,
            hallmark: i.hallmarkCost,
            stoneCost: i.stoneCost,
            total: computeNewItemAmount(i),
          })),
          oldItems: bill.oldItems.map((i) => ({
            id: crypto.randomUUID(),
            description: i.description,
            weight: i.weightGm,
            wastage: i.wastageGm,
            rate: i.ratePerGm,
            total: computeOldItemAmount(i),
          })),
          miscItems: bill.miscItems.map((i) => ({ id: crypto.randomUUID(), description: i.description, amount: i.amount })),
        },
      };
      fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(async (r) => {
          const res = await r.json().catch(() => ({} as any));
          const number = res?.number;
          const color = res?.color || "white";
          const param = encodeBillToParam({ ...bill, customerName: bill.customerName, customerMobile: bill.customerMobile, customerAddress: bill.customerAddress } as any);
          const q = new URLSearchParams({ data: param });
          q.set("no", String(number || 0));
          window.open(`/invoice?${q.toString()}`, "_blank");
        })
        .catch(() => {
          window.open(url, "_blank");
        });
      appendPurchase(bill, totals.grandTotal);
    } catch {}
    // window.open handled in then/catch above
  }

  return (
    <div className="flex gap-2 justify-end mt-4">
      <button onClick={() => openPrint()} className="px-4 py-2 rounded m-4 btn-primary">Print Invoice</button>
    </div>
  );
}


