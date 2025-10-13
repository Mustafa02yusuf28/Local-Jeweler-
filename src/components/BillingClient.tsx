"use client";

import { useEffect, useMemo, useState } from "react";
import type { BillInput, NewItem, OldItem, MiscItem, Karat } from "@/types/billing";
import { computeBillTotals, computeNewItemAmount, computeNewItemNetWeightGm, computeOldItemAmount, currency, defaultGoldRates } from "@/utils/billing";
import { loadRates } from "@/utils/rates";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import BillingActions from "./BillingActions";

const karats: Karat[] = ["24K", "22K", "20K", "18K", "14K", "SILVER"];

export default function BillingClient() {
  const searchParams = useSearchParams();
  const initialRates = (() => {
    if (typeof window === "undefined") return defaultGoldRates;
    const stored = loadRates();
    const map: Record<string, number> = { ...defaultGoldRates };
    Object.entries({
      "24K": 1,
      "22K": 0.9166667,
      "20K": 0.8333333,
      "18K": 0.75,
      "14K": 0.5833333,
    }).forEach(([key, m]) => {
      map[key] = Math.round(stored.pure24K * (m as number) * 100) / 100;
    });
    map["SILVER"] = stored.silver;
    Object.assign(map, stored.overrides || {});
    return map;
  })();
  const [rates, setRates] = useState<Record<string, number>>(initialRates);
  const [bill, setBill] = useState<BillInput>({
    customerName: "",
    customerMobile: "",
    customerAddress: "",
    cgstPct: 1.5,
    sgstPct: 1.5,
    newItems: [],
    oldItems: [],
    miscItems: [],
  });

  const totals = useMemo(() => computeBillTotals(bill), [bill]);

  // Prefill from query params (coming from Customers page "New Bill")
  useEffect(() => {
    const mobile = searchParams.get("mobile") || "";
    const name = searchParams.get("name") || "";
    const address = searchParams.get("address") || "";
    if (mobile || name || address) {
      setBill((b) => ({ ...b, customerMobile: mobile || b.customerMobile, customerName: name || b.customerName, customerAddress: address || b.customerAddress }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofill customer details by mobile if record exists in DB
  useEffect(() => {
    const mobile = (bill.customerMobile || "").trim();
    if (!mobile) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/${encodeURIComponent(mobile)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.customer) {
          setBill((b) => ({
            ...b,
            customerName: data.customer.name || b.customerName,
            customerAddress: data.customer.address || b.customerAddress,
          }));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [bill.customerMobile]);

  function addNewItem() {
    const newItem: NewItem = {
      id: crypto.randomUUID(),
      description: "",
      karat: "22K",
      grossWeightGm: 0,
      stoneWeightGm: 0,
      wastageValue: 0,
      wastageUnit: "%",
      stoneCost: 0,
      ratePerGm: rates["22K"],
      makingChargeMode: "PERCENT",
      makingChargeValue: 0,
      hallmarkCost: 0,
    };
    setBill((b) => ({ ...b, newItems: [...b.newItems, newItem] }));
  }

  function addOldItem() {
    const item: OldItem = {
      id: crypto.randomUUID(),
      description: "",
      weightGm: 0,
      wastageGm: 0,
      ratePerGm: rates["22K"],
    };
    setBill((b) => ({ ...b, oldItems: [...b.oldItems, item] }));
  }

  function addMiscItem() {
    const item: MiscItem = { id: crypto.randomUUID(), description: "", amount: 0 };
    setBill((b) => ({ ...b, miscItems: [...b.miscItems, item] }));
  }

  function updateRateForKarat(k: Karat, value: number) {
    const newRates = { ...rates, [k]: value };
    setRates(newRates);
    setBill((b) => ({
      ...b,
      newItems: b.newItems.map((i) => (i.karat === k ? { ...i, ratePerGm: newRates[k] } : i)),
      oldItems: b.oldItems,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-5xl md:text-2xl font-bold bg-gradient-to-r from-[#D6B893] via-[#E8D4B8] to-[#D6B893] bg-clip-text text-transparent mb-4 tracking-tight">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="px-4 py-2 border rounded-lg focus-ring" placeholder="Customer Name" value={bill.customerName} onChange={(e) => setBill({ ...bill, customerName: e.target.value })} />
          <input className="px-4 py-2 border rounded-lg focus-ring" placeholder="Mobile Number" value={bill.customerMobile} onChange={(e) => setBill({ ...bill, customerMobile: e.target.value })} />
          <input className="px-4 py-2 border rounded-lg focus-ring" placeholder="Address" value={bill.customerAddress} onChange={(e) => setBill({ ...bill, customerAddress: e.target.value })} />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-5xl md:text-2xl font-bold bg-gradient-to-r from-[#D6B893] via-[#E8D4B8] to-[#D6B893] bg-clip-text text-transparent mb-4 tracking-tight">New Items</h3>
          <button onClick={addNewItem} className="px-4 py-2 btn-primary rounded-lg flex items-center gap-2"><Plus size={16} /> Add Item</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-left">Karat</th>
                <th className="px-2 py-2 text-left">Gross (g)</th>
                <th className="px-2 py-2 text-left">Stone (g)</th>
                {/* <th className="px-2 py-2 text-left">Wastage</th>
                <th className="px-2 py-2 text-left">Unit</th> */}
                <th className="px-2 py-2 text-left">Stone Cost</th>
                <th className="px-2 py-2 text-left">Rate</th>
                <th className="px-2 py-2 text-left">MC Mode</th>
                <th className="px-2 py-2 text-left">MC Value</th>
                <th className="px-2 py-2 text-left">Hallmark</th>
                <th className="px-2 py-2 text-left">Net (g)</th>
                <th className="px-2 py-2 text-left">Total</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {bill.newItems.map((item, idx) => {
                const netGm = computeNewItemNetWeightGm(item);
                const total = computeNewItemAmount(item);
                return (
                  <tr key={item.id} className="border-b">
                    <td className="px-2 py-2"><input className="w-full px-2 py-1 border rounded" value={item.description} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], description: e.target.value };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    <td className="px-2 py-2">
                      <select className="px-2 py-1 border rounded" value={item.karat} onChange={(e) => {
                        const k = e.target.value as Karat;
                        const arr = [...bill.newItems];
                        arr[idx] = { ...arr[idx], karat: k, ratePerGm: rates[k] };
                        setBill({ ...bill, newItems: arr });
                      }}>
                        {karats.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2"><input type="number" className="w-24 px-2 py-1 border rounded" value={item.grossWeightGm} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], grossWeightGm: parseFloat(e.target.value) || 0 };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    <td className="px-2 py-2"><input type="number" className="w-24 px-2 py-1 border rounded" value={item.stoneWeightGm} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], stoneWeightGm: parseFloat(e.target.value) || 0 };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    {/* Wastage temporarily hidden */}
                    <td className="px-2 py-2"><input type="number" placeholder="₹ amount" step="0.01" min="0" className="w-24 px-2 py-1 border rounded" value={item.stoneCost} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], stoneCost: parseFloat(e.target.value) || 0 };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    <td className="px-2 py-2"><input type="number" className="w-24 px-2 py-1 border rounded" value={item.ratePerGm} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], ratePerGm: parseFloat(e.target.value) || 0 };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    <td className="px-2 py-2">
                      <select className="px-2 py-1 border rounded" value={item.makingChargeMode || "PERCENT"} onChange={(e) => {
                        const arr = [...bill.newItems];
                        arr[idx] = { ...arr[idx], makingChargeMode: e.target.value as any };
                        setBill({ ...bill, newItems: arr });
                      }}>
                        <option value="PERCENT">MC %</option>
                        <option value="PER_GM">MC /g</option>
                        <option value="FIXED">Making /Total</option>
                      </select>
                    </td>
                    <td className="px-2 py-2"><input type="number" className="w-24 px-2 py-1 border rounded" value={item.makingChargeValue || 0} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], makingChargeValue: parseFloat(e.target.value) || 0 };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    <td className="px-2 py-2"><input type="number" className="w-24 px-2 py-1 border rounded" value={item.hallmarkCost} onChange={(e) => {
                      const arr = [...bill.newItems];
                      arr[idx] = { ...arr[idx], hallmarkCost: parseFloat(e.target.value) || 0 };
                      setBill({ ...bill, newItems: arr });
                    }} /></td>
                    <td className="px-2 py-2">{netGm.toFixed(3)}</td>
                    <td className="px-2 py-2 font-semibold text-black">{currency(total)}</td>
                    <td className="px-2 py-2">
                      <button className="text-red-600" onClick={() => setBill({ ...bill, newItems: bill.newItems.filter((x) => x.id !== item.id) })}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-5xl md:text-2xl font-bold bg-gradient-to-r from-[#D6B893] via-[#E8D4B8] to-[#D6B893] bg-clip-text text-transparent mb-4 tracking-tight">Old Purchase Items (Exchange)</h3>
          <button onClick={addOldItem} className="px-4 py-2 btn-primary rounded-lg flex items-center gap-2"><Plus size={16} /> Add Old Item</button>
        </div>
        <div className="space-y-3">
          {bill.oldItems.map((item, idx) => (
            <div className="flex gap-4 items-end flex-wrap" key={item.id}>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={item.description} onChange={(e) => {
                  const arr = [...bill.oldItems];
                  arr[idx] = { ...arr[idx], description: e.target.value };
                  setBill({ ...bill, oldItems: arr });
                }} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Weight (g)</label>
                <input type="number" className="w-28 px-3 py-2 border rounded-lg" value={item.weightGm} onChange={(e) => {
                  const arr = [...bill.oldItems];
                  arr[idx] = { ...arr[idx], weightGm: parseFloat(e.target.value) || 0 };
                  setBill({ ...bill, oldItems: arr });
                }} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Wastage (g)</label>
                <input type="number" className="w-28 px-3 py-2 border rounded-lg" value={item.wastageGm} onChange={(e) => {
                  const arr = [...bill.oldItems];
                  arr[idx] = { ...arr[idx], wastageGm: parseFloat(e.target.value) || 0 };
                  setBill({ ...bill, oldItems: arr });
                }} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rate (₹/g)</label>
                <input type="number" className="w-32 px-3 py-2 border rounded-lg" value={item.ratePerGm} onChange={(e) => {
                  const arr = [...bill.oldItems];
                  arr[idx] = { ...arr[idx], ratePerGm: parseFloat(e.target.value) || 0 };
                  setBill({ ...bill, oldItems: arr });
                }} />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-400 mb-1">Total</label>
                <div className="font-semibold text-white px-2 py-2">{currency(computeOldItemAmount(item))}</div>
              </div>
              <button className="text-red-400 hover:text-red-300" onClick={() => setBill({ ...bill, oldItems: bill.oldItems.filter((x) => x.id !== item.id) })}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-5xl md:text-2xl font-bold bg-gradient-to-r from-[#D6B893] via-[#E8D4B8] to-[#D6B893] bg-clip-text text-transparent mb-4 tracking-tight">Miscellaneous Items</h3>
          <button onClick={addMiscItem} className="px-4 py-2 btn-primary rounded-lg flex items-center gap-2"><Plus size={16} /> Add Misc</button>
        </div>
        <div className="space-y-3">
          {bill.miscItems.map((item, idx) => (
            <div className="flex gap-3 items-center" key={item.id}>
              <input className="flex-1 px-3 py-2 border rounded-lg" placeholder="Description" value={item.description} onChange={(e) => {
                const arr = [...bill.miscItems];
                arr[idx] = { ...arr[idx], description: e.target.value };
                setBill({ ...bill, miscItems: arr });
              }} />
              <input type="number" className="w-32 px-3 py-2 border rounded-lg" placeholder="Amount" value={item.amount} onChange={(e) => {
                const arr = [...bill.miscItems];
                arr[idx] = { ...arr[idx], amount: parseFloat(e.target.value) || 0 };
                setBill({ ...bill, miscItems: arr });
              }} />
              <button className="text-red-600" onClick={() => setBill({ ...bill, miscItems: bill.miscItems.filter((x) => x.id !== item.id) })}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 text-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CGST %</label>
            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={bill.cgstPct} onChange={(e) => setBill({ ...bill, cgstPct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SGST %</label>
            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={bill.sgstPct} onChange={(e) => setBill({ ...bill, sgstPct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Rates</label>
            <div className="flex gap-2 flex-wrap">
              {karats.map(k => (
                <div key={k} className="flex items-center gap-1">
                  <span className="text-xs text-gray-600">{k}</span>
                  <input type="number" className="w-24 px-2 py-1 border rounded" value={rates[k] || 0} onChange={(e) => updateRateForKarat(k, parseFloat(e.target.value) || 0)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-lg">
          <div className="flex justify-between"><span>New Items Total:</span><span className="font-semibold text-black">{currency(totals.newItemsTotal)}</span></div>
          <div className="flex justify-between"><span>Misc Total:</span><span className="font-semibold text-black">{currency(totals.miscTotal)}</span></div>
          <div className="flex justify-between"><span>Gross Total (before GST):</span><span className="font-semibold text-black">{currency(totals.grossTotal)}</span></div>
          <div className="flex justify-between text-sm"><span>CGST ({bill.cgstPct}%):</span><span className="text-black">{currency(totals.cgstAmount)}</span></div>
          <div className="flex justify-between text-sm"><span>SGST ({bill.sgstPct}%):</span><span className="text-black">{currency(totals.sgstAmount)}</span></div>
          <div className="flex justify-between border-t pt-2"><span>Total With GST:</span><span className="font-semibold text-black">{currency(totals.grossTotal + totals.cgstAmount + totals.sgstAmount)}</span></div>
          {bill.oldItems.length > 0 && (
            <div className="flex justify-between text-orange-700"><span>Less: Old Exchange:</span><span className="font-semibold">- {currency(totals.oldItemsTotal)}</span></div>
          )}
          <div className="flex justify-between border-t-2 border-amber-600 pt-2 text-xl"><span className="font-bold">Final Amount:</span><span className="font-bold text-black">{currency(totals.grandTotal)}</span></div>
        </div>
      </div>

      <BillingActions bill={bill} />
    </div>
  );
}


