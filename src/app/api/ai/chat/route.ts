import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
const SYSTEM_INSTRUCTION = `You are a helpful assistant for a small jewelry shop's local billing app. Always assume the domain is gold/silver jewelry billing.
- When the user asks for rates, refer to provided 'Rates: ...' context.
- When asked to summarise months, use provided compact KPIs; do not ask for more data.
- When generating bills, acknowledge parsed items and mention missing customer details if any.
- Be concise and avoid unrelated interpretations (e.g., do not interpret 'gold' as 'Google').
- Respond in plain text. Do not output code blocks or tool call snippets.`;

function sameOriginOk(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  return !origin || !host || origin.endsWith(host);
}

function parseMonth(text: string): { year: number; month: number } | null {
  const now = new Date();
  const m = /\b(\d{4})[-\/](\d{1,2})\b/.exec(text);
  if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) };
  if (/\b(this\s+month|current\s+month)\b/i.test(text)) return { year: now.getFullYear(), month: now.getMonth() + 1 };
  const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const mn = monthNames.findIndex(n => text.toLowerCase().includes(n));
  if (mn >= 0) return { year: now.getFullYear(), month: mn + 1 };
  return null;
}

function normalizeText(raw: string): string {
  // Common user typos/voice confusions relevant to jewelry context
  let t = raw;
  // "google" -> "gold" when used near rate queries
  t = t.replace(/\brate\b[^\n]{0,20}\bgoogle\b/gi, (m) => m.replace(/google/gi, 'gold'));
  t = t.replace(/\bgoogle\b[^\n]{0,20}\brate\b/gi, (m) => m.replace(/google/gi, 'gold'));
  return t;
}

function cleanDescription(desc: string): string {
  const lower = desc.toLowerCase();
  // Cut off at common customer phrases
  const cutKeys = [" for ", " customer", " mobile", ",", ":", "- "];
  let idx = -1;
  for (const k of cutKeys) {
    const i = lower.indexOf(k);
    if (i !== -1) idx = idx === -1 ? i : Math.min(idx, i);
  }
  const base = (idx !== -1 ? desc.slice(0, idx) : desc).trim();
  // Keep only 1-3 words max for description; default to first word
  const words = base.split(/\s+/).filter(Boolean);
  return (words.slice(0, 3).join(' ') || 'Item').trim();
}

function cleanCustomerName(name: string): string {
  let n = name.replace(/^"|"$/g, '').trim();
  n = n.replace(/\band\s+mobile(?:\s+number)?[\s:,-]*\d+[\d\s-]*/gi, '').trim();
  n = n.replace(/\bmobile(?:\s+number)?[\s:,-]*\d+[\d\s-]*/gi, '').trim();
  // collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

function cleanMobile(mobile: string): string {
  const digits = (mobile || '').replace(/\D+/g, '');
  return digits;
}

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const text = normalizeText((body?.text || "").trim());
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const webQuery = /\b(web|online|google)\b/i.test(text);

  // If user explicitly wants bill, still produce a draft locally (keeps UX snappy) but also allow Gemini to refine wording
  if (/\b(generate|create)\b/i.test(text) && /\b(bill|invoice)\b/i.test(text)) {
    // Customer extraction: supports "customer: Name 987..." or "for Name ... mobile number 987..."
    const customerMatch = /customer\s*:\s*([^\n,]+?)\s+(\d{8,15})/i.exec(text) || (() => {
      const name = /\bfor\s+([A-Za-z][A-Za-z\s'.-]{1,60})\b/i.exec(text)?.[1]?.trim();
      const mobile = /\bmobile(?:\s+number)?\s*[:\-]?\s*(\d{8,15})\b/i.exec(text)?.[1]?.trim();
      return name && mobile ? { 1: name, 2: mobile } as any : null;
    })();
    const custName = cleanCustomerName((customerMatch as any)?.[1]?.trim() || "");
    const custMobile = cleanMobile((customerMatch as any)?.[2]?.trim() || "");

    // Items: prefer alternative form first to avoid misreading "22K" as quantity
    const altItemRegex = /(\d{2})\s*(?:karat|k)\b\s*(\d+(?:\.\d+)?)\s*g(?:m|ram)?\s*([a-zA-Z ]+)/ig;
    const itemRegex = /(\d+)\s*x\s*([a-zA-Z ]+)\s*(each\s*)?(\d+(?:\.\d+)?)\s*g(?:m|ram)?\s*(\d{2}K|SILVER)?/ig;
    const mcPct = /(?:making|mc)\s*(\d+(?:\.\d+)?)\s*%/i.exec(text)?.[1];
    const hmAmt = /(?:hallmark|hm)\s*(\d+(?:\.\d+)?)/i.exec(text)?.[1];
    const useToday = /@?(today|rate\s*today)/i.test(text);
    const rateNum = /@(\d+(?:\.\d+)?)\s*\/?g?/i.exec(text)?.[1];
    const items: any[] = [];
    const oldRegex = /(old|exchange)\s*:?\s*([a-zA-Z ]+)?\s*(\d+(?:\.\d+)?)\s*g(?:m|ram)?\s*@\s*(\d+(?:\.\d+)?)/ig;
    const miscRegex = /(misc|service|charge)\s*:?\s*([a-zA-Z ]+)?\s*(\d+(?:\.\d+)?)/ig;
    const oldItems: any[] = [];
    const miscItems: any[] = [];
    let am: RegExpExecArray | null;
    while ((am = altItemRegex.exec(text)) !== null) {
      const kar = `${am[1]}K`.toUpperCase();
      const wt = parseFloat(am[2]);
      const desc = cleanDescription((am[3] || 'Item').trim());
      items.push({ description: desc, weightGm: wt, karat: kar });
    }
    if (!items.length) {
      let m: RegExpExecArray | null;
      // Only accept quantity form if explicitly uses "x" (e.g., "2x ring") to avoid 22K confusion
      while ((m = itemRegex.exec(text)) !== null) {
        const qty = parseInt(m[1]);
        const desc = cleanDescription((m[2] || '').trim());
        const wt = parseFloat(m[4]);
        const karat = (m[5] || '18K').toUpperCase();
        for (let i = 0; i < (isFinite(qty) ? qty : 1); i++) {
          items.push({ description: desc, weightGm: wt, karat });
        }
      }
    }
    let om: RegExpExecArray | null;
    while ((om = oldRegex.exec(text)) !== null) {
      const desc = (om[2] || 'Old Item').trim();
      const wt = parseFloat(om[3]);
      const rate = parseFloat(om[4]);
      oldItems.push({ description: desc, weightGm: wt, wastageGm: 0, ratePerGm: rate });
    }
    let mm: RegExpExecArray | null;
    while ((mm = miscRegex.exec(text)) !== null) {
      const desc = (mm[2] || 'Misc').trim();
      const amt = parseFloat(mm[3]);
      miscItems.push({ description: desc, amount: amt });
    }
    if (!items.length) return NextResponse.json({ text: "Couldn't parse items. Try: '2 rings each 2g 18K @today, MC 15%, HM 100'" });

    const db = getDb();
    const rateMap = new Map<string, number>();
    {
      const rows = db.prepare("SELECT karat, rate FROM rates").all() as any[];
      rows.forEach(r => rateMap.set(r.karat.toUpperCase(), Number(r.rate || 0)));
    }
    const resolvedRate = (k: string) => {
      if (rateNum) return Number(rateNum);
      // Default to today's configured rate for the karat if available
      return rateMap.get(k) || 0;
    };

    const bill = {
      customerName: custName,
      customerMobile: custMobile,
      customerAddress: "",
      cgstPct: 1.5,
      sgstPct: 1.5,
      newItems: items.map((it) => ({
        id: crypto.randomUUID(),
        description: it.description,
        karat: (it.karat === 'SILVER' ? 'SILVER' : (it.karat as any)),
        grossWeightGm: it.weightGm,
        stoneWeightGm: 0,
        wastageValue: 0,
        wastageUnit: "%",
        stoneCost: 0,
        ratePerGm: resolvedRate(it.karat),
        makingChargeMode: mcPct ? 'PERCENT' : 'FIXED',
        makingChargeValue: mcPct ? Number(mcPct) : 0,
        hallmarkCost: hmAmt ? Number(hmAmt) : 0,
      })),
      oldItems: oldItems.map((o) => ({ id: crypto.randomUUID(), description: o.description, weightGm: o.weightGm, wastageGm: o.wastageGm || 0, ratePerGm: o.ratePerGm })),
      miscItems: miscItems.map((m) => ({ id: crypto.randomUUID(), description: m.description, amount: m.amount })),
    } as any;

    const needCustomer = !(custName && custMobile && custMobile.length >= 8);
    const msg = needCustomer ? "Draft bill prepared. Please provide customer name and mobile, then Open Billing." : "Draft bill prepared. Click Open Billing to review.";
    // Continue below to allow Gemini to also summarize if desired; include bill in response
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    if (apiKey) {
      try {
        const context = `Rates: ${Array.from(rateMap.entries()).map(([k,v]) => `${k}=${v}`).join(', ')}`;
        const prompt = `${text}\n\nDraft bill items parsed: ${bill.newItems.length} new, ${bill.oldItems.length} old, ${bill.miscItems.length} misc. ${needCustomer ? 'Customer missing.' : 'Customer provided.'}\n${context}\nRespond concisely.`;
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          let textOut = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(" ") || msg;
          // Strip accidental tool/code blocks
          textOut = textOut.replace(/```[\s\S]*?```/g, '').replace(/\s*tool_code[\s\S]*$/i, '').trim();
          return NextResponse.json({ text: textOut, bill, needCustomer });
        }
      } catch {}
    }
    return NextResponse.json({ text: msg, bill, needCustomer });
  }

  // Direct rate update intent: "Set 22K to 6100", "update silver=150"
  const rateSet = /(set|update)\s+(?:rate\s+for\s+)?((?:\d{2})\s*(?:karat|k)|\d{2}K|SILVER)\s*(?:to|=)\s*(\d+(?:\.\d+)?)/i.exec(text);
  if (rateSet) {
    const kRaw = (rateSet[2] || '').toUpperCase().replace(/\s*(KARAT|K)\b/, 'K');
    const karat = kRaw === 'SILVER' ? 'SILVER' : (/^\d{2}K$/.test(kRaw) ? kRaw : (kRaw.match(/\d{2}/)?.[0] + 'K'));
    const value = Number(rateSet[3]);
    if (karat && isFinite(value)) {
      const db = getDb();
      const upsert = db.prepare("INSERT INTO rates(karat, rate) VALUES(?, ?) ON CONFLICT(karat) DO UPDATE SET rate=excluded.rate");
      upsert.run(karat, value);
      return NextResponse.json({ text: `Updated rate: ${karat} = ₹${value.toFixed(2)}/g` });
    }
  }

  // Attach compact DB context for Gemini on all other queries
  const db = getDb();
  const rateRows = db.prepare("SELECT karat, rate FROM rates").all() as any[];
  const rateSummary = rateRows.map(r => `${r.karat}=${Number(r.rate||0).toFixed(2)}`).join(', ');

  if (/\b(summary|summarise|monthly|report|reports)\b/i.test(text)) {
    const ym = parseMonth(text) || (() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; })();
    const db = getDb();
    const invoices: any[] = db
      .prepare("SELECT id, total, cgst, sgst, date_iso FROM invoices WHERE strftime('%Y-%m', date_iso)=?")
      .all(`${ym.year}-${String(ym.month).padStart(2,'0')}`);
    const invoiceIds = invoices.map(i => i.id);
    let gross = 0; let oldExchange = 0;
    if (invoiceIds.length) {
      const q = invoiceIds.map(() => "?").join(",");
      const sumLine = db.prepare(`SELECT SUM(line_total) as s FROM invoice_items WHERE invoice_id IN (${q})`).get(...invoiceIds) as any;
      const sumMisc = db.prepare(`SELECT SUM(amount) as s FROM misc_items WHERE invoice_id IN (${q})`).get(...invoiceIds) as any;
      gross = (sumLine?.s || 0) + (sumMisc?.s || 0);
      const sumOld = db.prepare(`SELECT SUM(total) as s FROM old_items WHERE invoice_id IN (${q})`).get(...invoiceIds) as any;
      oldExchange = sumOld?.s || 0;
    }
    const totalCGST = invoices.reduce((s, r) => s + (r.cgst || 0), 0);
    const totalSGST = invoices.reduce((s, r) => s + (r.sgst || 0), 0);
    const net = gross + totalCGST + totalSGST - oldExchange;
    const textOut = `Summary for ${ym.year}-${String(ym.month).padStart(2,'0')} — Invoices: ${invoices.length}; Gross: ₹${gross.toFixed(2)}; Old Exchange: ₹${oldExchange.toFixed(2)}; Tax: ₹${(totalCGST+totalSGST).toFixed(2)}; Net: ₹${net.toFixed(2)}`;
    // Provide both: a local summary and a Gemini view over the same data
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    if (apiKey) {
      try {
        const compact = { ym, invoiceCount: invoices.length, gross, oldExchange, tax: totalCGST+totalSGST, net };
        const prompt = `${text}\nRates: ${rateSummary}\nData: ${JSON.stringify(compact)}\nSummarize in 3 bullets.`;
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          let llm = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(" ") || textOut;
          llm = llm.replace(/```[\s\S]*?```/g, '').replace(/\s*tool_code[\s\S]*$/i, '').trim();
          return NextResponse.json({ text: llm });
        }
      } catch {}
    }
    return NextResponse.json({ text: textOut });
  }

  // 3b) Compare this month vs last month (local)
  if (/\bcompare\b/i.test(text) && /\bmonth\b/i.test(text)) {
    const db = getDb();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;

    function kpis(year: number, month: number) {
      const ym = `${year}-${String(month).padStart(2,'0')}`;
      const invoices: any[] = db
        .prepare("SELECT id, total, cgst, sgst FROM invoices WHERE strftime('%Y-%m', date_iso)=?")
        .all(ym);
      const ids = invoices.map(i => i.id);
      let gross = 0; let oldX = 0;
      if (ids.length) {
        const q = ids.map(() => "?").join(",");
        const sumLine = db.prepare(`SELECT SUM(line_total) as s FROM invoice_items WHERE invoice_id IN (${q})`).get(...ids) as any;
        const sumMisc = db.prepare(`SELECT SUM(amount) as s FROM misc_items WHERE invoice_id IN (${q})`).get(...ids) as any;
        gross = (sumLine?.s || 0) + (sumMisc?.s || 0);
        const sumOld = db.prepare(`SELECT SUM(total) as s FROM old_items WHERE invoice_id IN (${q})`).get(...ids) as any;
        oldX = sumOld?.s || 0;
      }
      const tax = invoices.reduce((s, r) => s + (r.cgst || 0) + (r.sgst || 0), 0);
      const net = gross + tax - oldX;
      return { count: invoices.length, gross, tax, net };
    }

    const cur = kpis(y, m);
    const prev = kpis(prevY, prevM);
    const delta = (a: number, b: number) => a - b;
    const pct = (a: number, b: number) => (b === 0 ? 100 : ((a - b) / b) * 100);

    const bullets = [
      `Invoices: ${cur.count} vs ${prev.count} (${delta(cur.count, prev.count) >= 0 ? '+' : ''}${delta(cur.count, prev.count)})`,
      `Net: ₹${cur.net.toFixed(2)} vs ₹${prev.net.toFixed(2)} (${pct(cur.net, prev.net) >= 0 ? '+' : ''}${pct(cur.net, prev.net).toFixed(1)}%)`,
      `Gross & Tax: ₹${cur.gross.toFixed(2)} + ₹${cur.tax.toFixed(2)} (prev ₹${prev.gross.toFixed(2)} + ₹${prev.tax.toFixed(2)})`,
    ];

    const textOut = `Comparison (${y}-${String(m).padStart(2,'0')} vs ${prevY}-${String(prevM).padStart(2,'0')}):\n- ${bullets[0]}\n- ${bullets[1]}\n- ${bullets[2]}`;
    return NextResponse.json({ text: textOut });
  }

  // Purchases by name (fast local) BEFORE LLM
  const custQ_early = /find\s+all\s+([a-zA-Z][a-zA-Z\s'.-]{1,60})\s+purchases\s+above\s+(\d+(?:\.\d+)?)\s*(?:this\s+year|(\d{4}))?/i.exec(text);
  if (custQ_early) {
    const name = custQ_early[1].trim();
    const minAmt = Number(custQ_early[2]);
    const y = custQ_early[3] ? Number(custQ_early[3]) : new Date().getFullYear();
    const db = getDb();
    const rows: any[] = db.prepare(
      "SELECT i.id, i.invoice_no as invoiceNo, i.date_iso as dateISO, i.total, i.snapshot, c.mobile, c.name FROM invoices i JOIN customers c ON c.mobile=i.customer_mobile WHERE LOWER(c.name) LIKE ? AND i.total > ? AND strftime('%Y', i.date_iso)=? ORDER BY i.date_iso DESC"
    ).all(`%${name.toLowerCase()}%`, minAmt, String(y));
    if (!rows.length) return NextResponse.json({ text: `No purchases found for ${name} above ₹${minAmt.toFixed(2)} in ${y}.` });
    const items = rows.slice(0, 5).map((r) => ({
      invoiceNo: r.invoiceNo,
      dateISO: r.dateISO,
      total: r.total,
      link: r.snapshot ? `/invoice?data=${encodeURIComponent(Buffer.from(String(r.snapshot), 'utf8').toString('base64'))}` : undefined,
    }));
    const lines = items.map((i: any) => `#${i.invoiceNo ?? '-'} on ${new Date(i.dateISO).toLocaleDateString()} — ₹${Number(i.total||0).toFixed(2)}${i.link ? ` (open: ${i.link})` : ''}`);
    const note = rows.length > items.length ? `Showing ${items.length} of ${rows.length}.` : '';
    return NextResponse.json({ text: `Found ${rows.length} purchases for ${name} above ₹${minAmt.toFixed(2)} in ${y}:\n- ${lines.join('\n- ')}\n${note}`.trim() });
  }

  // Purchases by mobile (fast local) BEFORE LLM
  const mobileQ_early = /find\s+all\s+purchases\s+by\s+(?:mobile|number|phone)\s*[:\-]?\s*(\d[\d\s-]{6,})/i.exec(text)
    || /purchases\s+for\s+mobile\s*[:\-]?\s*(\d[\d\s-]{6,})/i.exec(text)
    || /by\s+mobile\s*(\d[\d\s-]{6,})/i.exec(text);
  if (mobileQ_early) {
    const mobileDigits = (mobileQ_early[1] || '').replace(/\D+/g, '');
    const db = getDb();
    const customer = db.prepare("SELECT name, mobile FROM customers WHERE mobile=?").get(mobileDigits) as any;
    const rows: any[] = db
      .prepare("SELECT invoice_no as invoiceNo, date_iso as dateISO, total, snapshot FROM invoices WHERE customer_mobile=? ORDER BY date_iso DESC")
      .all(mobileDigits);
    if (!rows.length) return NextResponse.json({ text: `No purchases found for ${mobileDigits}.` });
    const items = rows.slice(0, 10).map((r) => ({
      invoiceNo: r.invoiceNo,
      dateISO: r.dateISO,
      total: r.total,
      link: `/invoice?id=${encodeURIComponent(r.id)}`,
    }));
    const lines = items.map((i: any) => `#${i.invoiceNo ?? '-'} on ${new Date(i.dateISO).toLocaleDateString()} — ₹${Number(i.total||0).toFixed(2)} (open: ${i.link})`);
    const header = customer?.name ? `Purchases for ${customer.name} (${mobileDigits}):` : `Purchases for ${mobileDigits}:`;
    return NextResponse.json({ text: `${header}\n- ${lines.join('\n- ')}` });
  }

  // 3) Generate bill (rule-based quick parse)
  if (/\b(generate|create)\b/i.test(text) && /\b(bill|invoice)\b/i.test(text)) {
    const itemRegex = /(\d+)\s*x?\s*([a-zA-Z ]+)\s*(each\s*)?(\d+(?:\.\d+)?)\s*g(?:m|ram)?\s*(\d{2}K|SILVER)?/ig;
    const mcPct = /(?:making|mc)\s*(\d+(?:\.\d+)?)\s*%/i.exec(text)?.[1];
    const hmAmt = /(?:hallmark|hm)\s*(\d+(?:\.\d+)?)/i.exec(text)?.[1];
    const useToday = /@?(today|rate\s*today)/i.test(text);
    const rateNum = /@(\d+(?:\.\d+)?)\s*\/?g?/i.exec(text)?.[1];
    const items: any[] = [];
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(text)) !== null) {
      const qty = parseInt(m[1]);
      const desc = (m[2] || '').trim();
      const wt = parseFloat(m[4]);
      const karat = (m[5] || '18K').toUpperCase();
      for (let i = 0; i < (isFinite(qty) ? qty : 1); i++) {
        items.push({ description: desc, weightGm: wt, karat });
      }
    }
    if (!items.length) return NextResponse.json({ text: "Couldn't parse items. Try: '2 rings each 2g 18K @today, MC 15%, HM 100'" });

    const db = getDb();
    const rateMap = new Map<string, number>();
    if (useToday) {
      const rows = db.prepare("SELECT karat, rate FROM rates").all() as any[];
      rows.forEach(r => rateMap.set(r.karat.toUpperCase(), Number(r.rate || 0)));
    }
    const resolvedRate = (k: string) => {
      if (rateNum) return Number(rateNum);
      if (useToday) return rateMap.get(k) || 0;
      return 0;
    };

    const bill = {
      customerName: "",
      customerMobile: "",
      customerAddress: "",
      cgstPct: 1.5,
      sgstPct: 1.5,
      newItems: items.map((it) => ({
        id: crypto.randomUUID(),
        description: it.description,
        karat: (it.karat === 'SILVER' ? 'SILVER' : (it.karat as any)),
        grossWeightGm: it.weightGm,
        stoneWeightGm: 0,
        wastageValue: 0,
        wastageUnit: "%",
        stoneCost: 0,
        ratePerGm: resolvedRate(it.karat),
        makingChargeMode: mcPct ? 'PERCENT' : 'FIXED',
        makingChargeValue: mcPct ? Number(mcPct) : 0,
        hallmarkCost: hmAmt ? Number(hmAmt) : 0,
      })),
      oldItems: [],
      miscItems: [],
    } as any;

    return NextResponse.json({ text: "Draft bill prepared. Click Open Billing to review.", bill });
  }

  // Fallback: optional Gemini (2.5 flash pro or configured model)
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (apiKey) {
    try {
      const context = webQuery ? '' : `Rates: ${rateSummary}`;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: context ? `${text}\n\n${context}` : text }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
          safetySettings: []
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        let textOut = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(" ") || "";
        textOut = textOut.replace(/```[\s\S]*?```/g, '').replace(/\s*tool_code[\s\S]*$/i, '').trim();
        if (textOut) return NextResponse.json({ text: textOut });
      }
    } catch {}
  }

  // Customer purchases query: "Find all <name> purchases above <amount> this year|YYYY"
  const custQ = /find\s+all\s+([a-zA-Z][a-zA-Z\s'.-]{1,60})\s+purchases\s+above\s+(\d+(?:\.\d+)?)\s*(?:this\s+year|(\d{4}))?/i.exec(text);
  if (custQ) {
    const name = custQ[1].trim();
    const minAmt = Number(custQ[2]);
    const y = custQ[3] ? Number(custQ[3]) : new Date().getFullYear();
    const db = getDb();
    const rows: any[] = db.prepare(
      "SELECT i.id, i.invoice_no as invoiceNo, i.date_iso as dateISO, i.total, i.snapshot, c.mobile, c.name FROM invoices i JOIN customers c ON c.mobile=i.customer_mobile WHERE LOWER(c.name) LIKE ? AND i.total > ? AND strftime('%Y', i.date_iso)=? ORDER BY i.date_iso DESC"
    ).all(`%${name.toLowerCase()}%`, minAmt, String(y));
    if (!rows.length) return NextResponse.json({ text: `No purchases found for ${name} above ₹${minAmt.toFixed(2)} in ${y}.` });
    const items = rows.slice(0, 5).map((r) => ({
      invoiceNo: r.invoiceNo,
      dateISO: r.dateISO,
      total: r.total,
      link: `/invoice?id=${encodeURIComponent(r.id)}`,
    }));
    const lines = items.map((i: any) => `#${i.invoiceNo ?? '-'} on ${new Date(i.dateISO).toLocaleDateString()} — ₹${Number(i.total||0).toFixed(2)} (open: ${i.link})`);
    const note = rows.length > items.length ? `Showing ${items.length} of ${rows.length}.` : '';
    return NextResponse.json({ text: `Found ${rows.length} purchases for ${name} above ₹${minAmt.toFixed(2)} in ${y}:\n- ${lines.join('\n- ')}\n${note}`.trim() });
  }

  // Purchases by mobile: "find all purchases by mobile 2131231231" or variants
  const mobileQ = /find\s+all\s+purchases\s+by\s+(?:mobile|number|phone)\s*[:\-]?\s*(\d[\d\s-]{6,})/i.exec(text)
    || /purchases\s+for\s+mobile\s*[:\-]?\s*(\d[\d\s-]{6,})/i.exec(text)
    || /by\s+mobile\s*(\d[\d\s-]{6,})/i.exec(text);
  if (mobileQ) {
    const mobileDigits = (mobileQ[1] || '').replace(/\D+/g, '');
    const db = getDb();
    const customer = db.prepare("SELECT name, mobile FROM customers WHERE mobile=?").get(mobileDigits) as any;
    const rows: any[] = db
      .prepare("SELECT invoice_no as invoiceNo, date_iso as dateISO, total, snapshot FROM invoices WHERE customer_mobile=? ORDER BY date_iso DESC")
      .all(mobileDigits);
    if (!rows.length) return NextResponse.json({ text: `No purchases found for ${mobileDigits}.` });
    const items = rows.slice(0, 10).map((r) => ({
      invoiceNo: r.invoiceNo,
      dateISO: r.dateISO,
      total: r.total,
      link: r.snapshot ? `/invoice?data=${encodeURIComponent(Buffer.from(String(r.snapshot), 'utf8').toString('base64'))}` : undefined,
    }));
    const lines = items.map((i: any) => `#${i.invoiceNo ?? '-'} on ${new Date(i.dateISO).toLocaleDateString()} — ₹${Number(i.total||0).toFixed(2)}${i.link ? ` (open: ${i.link})` : ''}`);
    const header = customer?.name ? `Purchases for ${customer.name} (${mobileDigits}):` : `Purchases for ${mobileDigits}:`;
    return NextResponse.json({ text: `${header}\n- ${lines.join('\n- ')}` });
  }

  // Default fallback message
  return NextResponse.json({ text: "I can help with rates, monthly summaries, or generate a draft bill from a prompt." });
}


