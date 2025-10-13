"use client";

import { useEffect, useMemo, useState } from "react";
import BackHome from "@/components/BackHome";
import { loadCustomers } from "@/utils/customersStore";
import { decodeBillFromParam } from "@/utils/share";
import { computeBillTotals, currency } from "@/utils/billing";
import type { CustomerRecord } from "@/types/customers";

// Temporary in-memory data; later replace with SQLite-backed API
const demoCustomers: CustomerRecord[] = [
  {
    name: "Thieves",
    mobile: "916886653569",
    address: "Vfkbkbhk",
    purchases: [
      { invoiceNo: 6, dateISO: new Date().toISOString(), totalAmount: 169897.0 },
      { invoiceNo: 5, dateISO: new Date(Date.now() - 86400000).toISOString(), totalAmount: 114000.0 },
    ],
  },
];

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<Array<{ mobile: string; name: string; address?: string }>>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Array<{ mobile: string; name: string; address?: string }>>([]);
  const [allFilter, setAllFilter] = useState("");
  const [records, setRecords] = useState<CustomerRecord[]>(demoCustomers);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const hasAnyExpanded = Object.values(expanded).some(Boolean);

  // Prefetch customer list in background to avoid lag when expanding
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/customers/list?limit=300', { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          setAllCustomers(d.customers || []);
        }
      } catch {}
    })();
  }, []);

  const filteredAll = useMemo(() => {
    if (!allFilter) return allCustomers;
    const f = allFilter.toLowerCase();
    return allCustomers.filter(c => (c.name || '').toLowerCase().includes(f) || (c.mobile || '').includes(allFilter));
  }, [allFilter, allCustomers]);

  useEffect(() => {
    (async () => {
      try {
        if (!query) return;
        const res = await fetch(`/api/customers/${encodeURIComponent(query)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.customer) {
          setRecords([{ name: data.customer.name, mobile: data.customer.mobile, address: data.customer.address, purchases: data.purchases || [] }]);
        }
      } catch {}
    })();
  }, [query]);

  const match = useMemo(() => {
    const mobile = query.trim();
    if (!mobile) return null;
    return records.find((r) => r.mobile === mobile) || null;
  }, [query, records]);

  return (
    <div className="max-w-3xl mx-auto">
      <BackHome />
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">Customers</h1>
        <p className="text-sm text-gray-400 mt-1">Search customers and view purchase history</p>
      </header>
      <div className="card p-6">
        <h1 className="text-2xl font-bold section-title mb-4">Customer Search</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input
            type="tel"
            placeholder="Search by mobile number"
            className="px-4 py-3 border rounded-lg focus-ring"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search by name"
            className="px-4 py-3 border rounded-lg focus-ring"
            value={nameQuery}
            onChange={async (e) => {
              const v = e.target.value;
              setNameQuery(v);
              if (v.trim().length < 2) { setNameResults([]); return; }
              try {
                const res = await fetch(`/api/customers/search?name=${encodeURIComponent(v)}`, { cache: 'no-store' });
                if (res.ok) {
                  const d = await res.json();
                  setNameResults(d.results || []);
                }
              } catch {}
            }}
          />
        </div>
        {nameResults.length > 0 && (
          <div className="mb-4 text-sm text-gray-300">
            <div className="mb-1">Matches:</div>
            <div className="flex flex-wrap gap-2">
              {nameResults.map((r) => (
                <button key={r.mobile} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10" onClick={() => setQuery(r.mobile)}>
                  {r.name} ({r.mobile})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border border-gray-800 p-3">
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" onClick={async () => {
              const next = !allExpanded;
              setAllExpanded(next);
              if (next && allCustomers.length === 0) {
                try {
                  const res = await fetch('/api/customers/list?limit=300', { cache: 'no-store' });
                  if (res.ok) {
                    const d = await res.json();
                    setAllCustomers(d.customers || []);
                  }
                } catch {}
              }
            }}>{allExpanded ? 'Hide All' : 'Show All Customers'}</button>
            {allExpanded && (
              <input placeholder="Filter list" className="px-3 py-2 border rounded bg-[#0b0e12]" value={allFilter} onChange={(e) => setAllFilter(e.target.value)} />
            )}
          </div>
          {allExpanded && (
            <div className="mt-3 max-h-64 overflow-auto text-sm">
              {filteredAll.map((c) => (
                  <div key={c.mobile} className="flex justify-between items-center py-1 border-b border-gray-800">
                    <div>
                      <div className="font-medium">{c.name || '-'}</div>
                      <div className="text-gray-400 text-xs">{c.mobile}</div>
                    </div>
                    <button className="px-2 py-1 rounded bg-white/5 hover:bg-white/10" onClick={() => { setQuery(c.mobile); setAllExpanded(false); setExpanded({}); }}>View</button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {match ? (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Customer Details</h2>
              {hasAnyExpanded && (
                <button className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-sm" onClick={() => setExpanded({})}>Collapse All Invoices</button>
              )}
            </div>
            <div className="rounded p-4 mb-4 bg-[#0b0e12] border border-gray-800">
              <p className="text-gray-300"><span className="font-medium">Name:</span> {match.name}</p>
              <p className="text-gray-300"><span className="font-medium">Mobile:</span> {match.mobile}</p>
              <p className="text-gray-300"><span className="font-medium">Address:</span> {match.address || "-"}</p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">Purchase History</h3>
            <div className="space-y-3">
              {match.purchases.map((p, idx) => {
                const decoded = p.dataParam ? decodeBillFromParam(p.dataParam) : null;
                const totals = decoded ? computeBillTotals(decoded) : null;
                const keyId = String(p.invoiceNo || idx) + ":" + p.dateISO;
                return (
                  <div key={p.invoiceNo + String(p.dateISO)} className="rounded bg-[#0b0e12] border border-gray-800">
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Invoice #{p.invoiceNo ?? "-"}</p>
                        <p className="text-sm text-gray-400">{new Date(p.dateISO).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* color indicator removed */}
                        <p className="text-amber-400 font-bold">₹{Number(p.totalAmount || 0).toFixed(2)}</p>
                        {p.dataParam && (
                          <a
                            className="px-3 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                            href={`/invoice?data=${encodeURIComponent(p.dataParam)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Bill
                          </a>
                        )}
                        <a
                          className="px-3 py-1 rounded bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                          href={`/billing?mobile=${encodeURIComponent(match.mobile)}&name=${encodeURIComponent(match.name || '')}&address=${encodeURIComponent(match.address || '')}`}
                        >
                          New Bill
                        </a>
                        <button
                          className="px-3 py-1 rounded bg-white/5 text-gray-200 hover:bg-white/10"
                          onClick={() => setExpanded((e) => ({ ...e, [keyId]: !e[keyId] }))}
                        >
                          {expanded[keyId] ? "Hide Details" : "Details"}
                        </button>
                      </div>
                    </div>
                    {decoded && expanded[keyId] && (
                      <div className="px-3 pb-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-gray-300">
                              <tr>
                                <th className="text-left py-2">Item</th>
                                <th className="text-left py-2">Gross</th>
                                <th className="text-left py-2">Stone</th>
                                <th className="text-left py-2">Rate</th>
                                <th className="text-left py-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {decoded.newItems.map((it, idx) => (
                                <tr key={idx} className="border-t border-gray-800">
                                  <td className="py-2">{it.description || `Item ${idx + 1}`}</td>
                                  <td className="py-2">{it.grossWeightGm}</td>
                                  <td className="py-2">{it.stoneWeightGm}</td>
                                  <td className="py-2">{currency(it.ratePerGm)}</td>
                                  <td className="py-2">{currency(it.ratePerGm * Math.max(0, (it.grossWeightGm - it.stoneWeightGm)))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {totals && (
                          <div className="mt-2 text-sm text-gray-300">
                            <div className="flex justify-between"><span>Gross:</span><span>{currency(totals.grossTotal)}</span></div>
                            <div className="flex justify-between"><span>Old Exchange:</span><span>- {currency(totals.oldItemsTotal)}</span></div>
                            <div className="flex justify-between"><span>CGST/SGST:</span><span>{currency(totals.cgstAmount + totals.sgstAmount)}</span></div>
                            <div className="flex justify-between font-semibold"><span>Final:</span><span>{currency(totals.grandTotal)}</span></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Type a mobile number to view customer details and history.</p>
        )}
      </div>
    </div>
  );
}


