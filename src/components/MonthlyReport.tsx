"use client";

import { useEffect, useState } from "react";

export default function MonthlyReport() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [data, setData] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`, { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } catch {}
    })();
  }, [year, month]);

  return (
    <div className="card p-6 mt-4">
      <div className="flex flex-wrap items-end gap-3 mb-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Year</label>
          <input type="number" className="px-3 py-2 border rounded bg-[#0b0e12]" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Month</label>
          <input type="number" min={1} max={12} className="px-3 py-2 border rounded bg-[#0b0e12]" value={month} onChange={(e) => setMonth(parseInt(e.target.value) || month)} />
        </div>
        <div className="ml-auto">
          <button
            className="px-3 py-2 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide Report" : "Show Report"}
          </button>
        </div>
      </div>

      {expanded && data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi title="Invoices" value={data.kpis.invoiceCount} />
            <Kpi title="Customers" value={data.kpis.uniqueCustomers} />
            <Kpi title="Gross" value={`₹${(data.kpis.gross || 0).toFixed(2)}`} />
            <Kpi title="Net" value={`₹${(data.kpis.net || 0).toFixed(2)}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded border border-gray-800 p-4">
              <h4 className="font-semibold mb-2">By Day</h4>
              <div className="space-y-1 text-sm">
                {data.byDay.map((r: any) => (
                  <div key={r.day} className="flex justify-between"><span>{r.day}</span><span>₹{Number(r.netAmount || 0).toFixed(2)}</span></div>
                ))}
              </div>
            </div>
            <div className="rounded border border-gray-800 p-4">
              <h4 className="font-semibold mb-2">By Karat</h4>
              <div className="space-y-1 text-sm">
                {data.karatBreakdown.map((r: any) => (
                  <div key={r.karat} className="flex justify-between"><span>{r.karat}</span><span>₹{Number(r.amount || 0).toFixed(2)} ({Number(r.grams || 0).toFixed(3)}g)</span></div>
                ))}
              </div>
            </div>
          </div>

            <div className="rounded border border-gray-800 p-4">
              <h4 className="font-semibold mb-2">Invoices</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-300">
                  <tr>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Mobile</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-left py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((i: any) => (
                    <tr key={i.id} className="border-t border-gray-800">
                      <td className="py-2">{new Date(i.dateISO).toLocaleDateString()}</td>
                      <td className="py-2">{i.mobile}</td>
                      <td className="py-2">₹{Number(i.total || 0).toFixed(2)}</td>
                      <td className="py-2"><a className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" href={`/invoice?data=${encodeURIComponent(i.snapshot ? (typeof i.snapshot === 'string' ? btoa(unescape(encodeURIComponent(i.snapshot))) : btoa(unescape(encodeURIComponent(JSON.stringify(i.snapshot))))) : '')}`} target="_blank">View</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded border border-gray-800 p-4">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-2xl font-bold text-amber-400 mt-1">{value}</div>
    </div>
  );
}


