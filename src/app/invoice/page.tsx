"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BillInput } from "@/types/billing";
import { computeBillTotals, computeNewItemAmount, computeNewItemNetWeightGm, computeOldItemAmount, currency } from "@/utils/billing";
import { decodeBillFromParam } from "@/utils/share";
import Link from "next/link";

export default function InvoicePage() {
  const params = useSearchParams();
  const dataParam = params.get("data");
  const num = params.get("no");
  const bill: BillInput | null = useMemo(() => (dataParam ? decodeBillFromParam(dataParam) : null), [dataParam]);

  const totals = useMemo(() => (bill ? computeBillTotals(bill) : null), [bill]);

  // Avoid hydration mismatch by rendering time only on client
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!bill || !totals) {
    return <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">No invoice data. Open from the billing page.</div>;
  }

  return (
    <div className="bg-white print:bg-white text-black max-w-5xl mx-auto my-6 p-6 print:p-0 print:my-0">
      <style>{`
        @media print {
          .no-print { display: none }
          html, body { background: #ffffff !important; color: #000000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { color: #000000 !important; }
          table, th, td { border-color: #000000 !important; }
        }
      `}</style>
      <div className="no-print flex justify-between items-center mb-4">
        <Link href="/" className="px-3 py-2 rounded bg-amber-500/10 text-amber-700">Back to Home</Link>
        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded">Print</button>
      </div>

      <header className="border-b pb-4 mb-4">
        {/* Banner logo - replace with your own file in /public (optional) */}
        <div className="mb-3">
          <img src="/globe.svg" alt="Shop Banner" className="w-full max-h-28 object-contain" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Shop Name</h1>
            <p className="text-[70%] text-gray-700 font-bold">GSTIN: YOUR-GSTIN-HERE</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Tax Invoice {String(num || '').padStart(3,'0')}</p>
            <p className="text-sm" suppressHydrationWarning>Date: {now ? now.toLocaleDateString() : ''}</p>
            <p className="text-sm" suppressHydrationWarning>Time: {now ? now.toLocaleTimeString() : ''}</p>
          </div>
        </div>
        {/* Business details ribbon */}
        <div className="mt-3 pt-3 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col">
              <span className="text-gray-500">Established</span>
              <span className="font-medium">YYYY</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">Address</span>
              <span className="font-medium">Your address line, City, State, ZIP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">Contact</span>
              <span className="font-medium">+91-XXXXXXXXXX</span>
            </div>
          </div>
          
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><span className="font-semibold">Customer Name:</span> {bill.customerName || "-"}</p>
          <p><span className="font-semibold">Contact:</span> {bill.customerMobile || "-"}</p>
        </div>
        <div>
          <p><span className="font-semibold">Address:</span> {bill.customerAddress || "-"}</p>
        </div>
      </section>

      <section className="mb-4">
        <h3 className="font-semibold mb-2">New Items</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">S.No</th>
              <th className="text-left p-2">Product Description</th>
              <th className="text-left p-2">Gross Wt.</th>
              <th className="text-left p-2">Net Wt.</th>
              <th className="text-left p-2">Stone Wt.</th>
              <th className="text-left p-2">Stone Cost</th>
              <th className="text-left p-2">Rate</th>
              <th className="text-left p-2">MC</th>
              <th className="text-left p-2">Hallmark</th>
              <th className="text-left p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.newItems.map((i, idx) => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">{i.description}</td>
                <td className="p-2">{i.grossWeightGm}</td>
                <td className="p-2">{computeNewItemNetWeightGm(i).toFixed(3)}</td>
                <td className="p-2">{i.stoneWeightGm}</td>
                <td className="p-2">{currency(i.stoneCost)}</td>
                <td className="p-2">{currency(i.ratePerGm)}</td>
                <td className="p-2">{
                  i.makingChargeMode === 'PERCENT'
                    ? `${i.makingChargeValue || 0}%`
                    : i.makingChargeMode === 'PER_GM'
                      ? `${currency(i.makingChargeValue || 0)}/g`
                      : currency(i.makingChargeValue || 0)
                }</td>
                <td className="p-2">{currency(i.hallmarkCost || 0)}</td>
                <td className="p-2 font-semibold">{currency(computeNewItemAmount(i))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {bill.oldItems.length > 0 && (
        <section className="mb-4">
          <h3 className="font-semibold mb-2">Old Purchase Items (Exchange)</h3>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">S.No</th>
                <th className="text-left p-2">Old Purchase Products</th>
                <th className="text-left p-2">Wt.</th>
                <th className="text-left p-2">Wastage</th>
                <th className="text-left p-2">Rate</th>
                <th className="text-left p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.oldItems.map((i, idx) => (
                <tr key={i.id} className="border-t">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">{i.description}</td>
                  <td className="p-2">{i.weightGm}</td>
                  <td className="p-2">{i.wastageGm}</td>
                  <td className="p-2">{currency(i.ratePerGm)}</td>
                  <td className="p-2 font-semibold">{currency(computeOldItemAmount(i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {bill.miscItems.length > 0 && (
        <section className="mb-4">
          <h3 className="font-semibold mb-2">Miscellaneous</h3>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.miscItems.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-2">{i.description}</td>
                  <td className="p-2">{currency(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-6">
        <div className="text-sm">
          <p><span className="font-semibold">CGST ({bill.cgstPct}%):</span> {currency(totals.cgstAmount)}</p>
          <p><span className="font-semibold">SGST ({bill.sgstPct}%):</span> {currency(totals.sgstAmount)}</p>
          <p><span className="font-semibold">Old Purchase (Rs.):</span> {currency(totals.oldItemsTotal)}</p>
          <p><span className="font-semibold">Misc Total (Rs.):</span> {currency(totals.miscTotal)}</p>
        </div>
        <div className="text-right text-lg">
          <p><span className="font-semibold">Gross Total:</span> {currency(totals.grossTotal)}</p>
          <p><span className="font-semibold">Net Amount (Rs.):</span> {currency(totals.netAmount)}</p>
          <p className="text-xl font-bold mt-2">Bill Amount (Rs.): {currency(totals.grandTotal)}</p>
        </div>
      </section>

      <footer className="mt-6 text-xs text-gray-600">
        <p>Terms & Conditions:</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Gold 22k, 18k Hallmark Jewellery can exchange 100% of the weight.</li>
          <li>Stones, Meena, Pola, Moti & other materials will be deducted on Exchange or Cash.</li>
          <li>No guarantee for color/chemical impact on Silver/Gold articles.</li>
        </ol>
      </footer>
    </div>
  );
}


