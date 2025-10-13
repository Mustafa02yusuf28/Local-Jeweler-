import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 200)));
  const db = getDb();
  const rows = db.prepare("SELECT mobile, name, address FROM customers ORDER BY name COLLATE NOCASE LIMIT ?").all(limit);
  return NextResponse.json({ customers: rows });
}


