"use client";

import { useEffect, useMemo, useState } from "react";
import { loadRates, saveRates } from "@/utils/rates";

const KARAT_M_VALUES: Record<string, number> = {
  "10": 0.4166667,
  "11": 0.4583333,
  "12": 0.5,
  "13": 0.5416667,
  "14": 0.5833333,
  "15": 0.625,
  "16": 0.6666667,
  "17": 0.7083333,
  "18": 0.75,
  "19": 0.7916667,
  "20": 0.8333333,
  "21": 0.875,
  "22": 0.9166667,
  "23": 0.9583333,
  "24": 1.0,
};

export default function RatesClient() {
  // Base inputs
  const initial = typeof window !== "undefined" ? loadRates() : { pure24K: 10000, silver: 150, overrides: {} };
  const [pureGoldRate, setPureGoldRate] = useState<number>(initial.pure24K);
  const [silverRate, setSilverRate] = useState<number>(initial.silver);

  // Editable rates per karat; initialized from 24K
  const initialRates = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(KARAT_M_VALUES).forEach(([k, m]) => (map[`${k}K`] = round2(pureGoldRate * m)));
    map["SILVER"] = round2(silverRate);
    return map;
  }, []);
  const [rates, setRates] = useState<Record<string, number>>(initialRates);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(initial.overrides || {}).map((k) => [k, true]))
  );
  useEffect(() => {
    saveRates({ pure24K: pureGoldRate, silver: silverRate, overrides: Object.fromEntries(Object.entries(rates).filter(([k]) => overrides[k]).map(([k, v]) => [k, v])) });
  }, [pureGoldRate, silverRate, rates, overrides]);

  // Load from server on mount; fall back to local cached values
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/rates", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const serverRates: Record<string, number> = Object.fromEntries((data.rates || []).map((r: any) => [r.karat, r.rate]));
        if (serverRates["24K"]) setPureGoldRate(serverRates["24K"]);
        if (typeof serverRates["SILVER"] === "number") setSilverRate(serverRates["SILVER"]);
        setRates((prev) => ({ ...prev, ...serverRates }));
      } catch {}
    })();
  }, []);

  // Save to server when rates change (debounced minimal)
  useEffect(() => {
    const id = setTimeout(() => {
      const payload = { rates };
      fetch("/api/rates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [rates]);

  // When 24K changes, update other karats unless overridden
  useEffect(() => {
    setRates((prev) => {
      const next = { ...prev };
      Object.entries(KARAT_M_VALUES).forEach(([k, m]) => {
        const key = `${k}K`;
        if (key === "24K") return;
        if (!overrides[key]) next[key] = round2(pureGoldRate * m);
      });
      next["24K"] = round2(pureGoldRate * (KARAT_M_VALUES["24"] || 1));
      return next;
    });
  }, [pureGoldRate, overrides]);

  // Keep silver separately editable
  useEffect(() => {
    setRates((prev) => ({ ...prev, SILVER: silverRate }));
  }, [silverRate]);

  function setFrom24K(karatKey: string) {
    const k = karatKey.replace("K", "");
    const m = KARAT_M_VALUES[k];
    setRates((prev) => ({ ...prev, [karatKey]: round2(pureGoldRate * m) }));
    setOverrides((ov) => ({ ...ov, [karatKey]: false }));
  }

  function applyToAllFrom24K() {
    const next: Record<string, number> = { ...rates };
    Object.entries(KARAT_M_VALUES).forEach(([k, m]) => {
      const key = `${k}K`;
      next[key] = round2(pureGoldRate * m);
    });
    setRates(next);
    setOverrides({});
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-amber-500 mb-2">Gold & Silver Rates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg p-4">
            <label className="block text-sm font-bold text-orange-500 mb-2">Pure Gold 24K (₹/g)</label>
            <input type="number" value={pureGoldRate} onChange={(e) => setPureGoldRate(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:outline-none" />
            <button onClick={applyToAllFrom24K} className="mt-3 px-3 py-2 bg-amber-400 text-white rounded">Apply 24K to all</button>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Silver (₹/g)</label>
            <input type="number" value={silverRate} onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gray-500 focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {Object.keys(KARAT_M_VALUES).map((k) => {
            const key = `${k}K`;
            if (key === "24K") return null; // 24K handled above
            return (
              <div key={key} className="rounded-lg border border-gray-800 p-4 bg-[#0b0e12] overflow-hidden">
                <label className="block text-sm font-medium text-gray-300 mb-2">{key}</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">₹</span>
                  <input
                    type="number"
                    value={rates[key] || 0}
                    onChange={(e) => {
                      setRates({ ...rates, [key]: parseFloat(e.target.value) || 0 });
                      setOverrides({ ...overrides, [key]: true });
                    }}
                    className="flex-1 min-w-0 px-3 py-2 border rounded bg-[#0b0e12] border-gray-700 text-gray-100"
                  />
                  <button onClick={() => setFrom24K(key)} className="shrink-0 px-2 py-2 text-sm rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">Set</button>
                </div>
              </div>
            );
          })}
          <div className="rounded-lg border border-gray-800 p-4 bg-[#0b0e12]">
            <label className="block text-sm font-medium text-gray-300 mb-2">SILVER</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">₹</span>
              <input type="number" value={rates["SILVER"] || 0} onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)} className="flex-1 px-3 py-2 border rounded bg-[#0b0e12] border-gray-700 text-gray-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Removed explicit melting table and calculator per requirements */}
    </div>
  );
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}



