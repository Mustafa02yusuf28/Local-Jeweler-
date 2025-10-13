import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT karat, rate FROM rates").all();
  return NextResponse.json({ rates: rows });
}

export async function PUT(req: Request) {
  // Basic same-origin CSRF guard
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const rates: Record<string, number> = (body && typeof body === 'object' ? (body as any).rates : {}) || {};
  for (const [k, v] of Object.entries(rates)) {
    if (typeof k !== 'string' || typeof v !== 'number' || !isFinite(v)) {
      return NextResponse.json({ error: "invalid rates payload" }, { status: 400 });
    }
  }
  const db = getDb();
  const upsert = db.prepare("INSERT INTO rates(karat, rate) VALUES(?, ?) ON CONFLICT(karat) DO UPDATE SET rate=excluded.rate");
  const tx = db.transaction((entries: [string, number][]) => {
    for (const [k, v] of entries) upsert.run(k, v);
  });
  tx(Object.entries(rates));
  return NextResponse.json({ ok: true });
}


