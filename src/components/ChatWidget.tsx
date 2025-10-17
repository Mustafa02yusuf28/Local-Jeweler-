"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function ChatWidget() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! Ask me things like: 'What is today's 18K rate?' or 'Summarise May 2025', or 'Generate a bill: 2 rings each 2g 18K, MC 15%, HM 100'." },
  ]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [hasBill, setHasBill] = useState(false);
  const [needCustomer, setNeedCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custMobile, setCustMobile] = useState("");

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    setHasBill(false);
    setNeedCustomer(false);
    try {
      const payload: any = { text };
      try {
        const ctx = sessionStorage.getItem("prefillBill");
        if (ctx) payload.billContext = JSON.parse(ctx);
      } catch {}
      if (custName || custMobile) payload.text = `customer: ${custName} ${custMobile}, ` + payload.text;
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      const answer: string = data?.text || "";
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
      if (data?.pendingRates) {
        (window as any).__pendingRates = data.pendingRates;
      }
      if (data?.bills && Array.isArray(data.bills)) {
        (window as any).__splitBills = data.bills;
      }
      if (data?.bill) {

        const nextBill = { ...(data.bill || {}), customerName: custName || (data.bill?.customerName || ""), customerMobile: custMobile || (data.bill?.customerMobile || "") };
        const hasCustomer = Boolean((nextBill as any).customerName) && Boolean((nextBill as any).customerMobile);
        const need = Boolean(data.needCustomer) && !hasCustomer;
        if (need) setNeedCustomer(true);
        sessionStorage.setItem("prefillBill", JSON.stringify(nextBill));
        setHasBill(true);
        // Auto-open Billing in a new tab if we have full customer info
        if (!need && hasCustomer) {
          try { window.open("/billing?prefill=1", "_blank"); } catch {}
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that." }]);
    } finally {
      setBusy(false);
    }
  }

  const canOpenBilling = hasBill && (!needCustomer || (custName.trim() && custMobile.trim()));

  return (
    <div className="card p-6 mt-6">
      <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--primary)' }}>Assistant</h2>
      <div className="max-h-64 overflow-auto space-y-3 bg-[#0b0e12] border border-gray-800 rounded p-3">
        {messages.map((m, idx) => (
          <div key={idx} className={`text-sm ${m.role === 'user' ? 'text-gray-200' : 'text-gray-300'}`}>
            <span className="font-semibold mr-2" style={{ color: m.role === 'user' ? '#D6B893' : '#9ca3af' }}>{m.role === 'user' ? 'You' : 'Assistant'}:</span>
            <span>{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {needCustomer && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="px-3 py-2 border rounded bg-[#0b0e12] border-gray-700 text-gray-100" placeholder="Customer Name" value={custName} onChange={(e) => setCustName(e.target.value)} />
          <input className="px-3 py-2 border rounded bg-[#0b0e12] border-gray-700 text-gray-100" placeholder="Mobile" value={custMobile} onChange={(e) => setCustMobile(e.target.value)} />
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 px-3 py-2 border rounded bg-[#0b0e12] border-gray-700 text-gray-100"
          placeholder="Ask about rates, reports, or generate a bill..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button onClick={send} disabled={busy} className="px-4 py-2 btn-primary rounded">{busy ? 'Thinking…' : 'Ask'}</button>
        <a href={canOpenBilling ? "/billing?prefill=1" : undefined} aria-disabled={!canOpenBilling} className="px-4 py-2 rounded" style={{ background: 'rgba(214, 184, 147, 0.1)', border: '1px solid rgba(214, 184, 147, 0.2)', color: canOpenBilling ? '#D6B893' : '#7f6f5c', pointerEvents: canOpenBilling ? 'auto' : 'none' }}>Open Billing</a>
      </div>
    </div>
  );
}


