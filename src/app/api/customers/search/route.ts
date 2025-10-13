import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") || "").trim();
  if (!name) return NextResponse.json({ results: [] });
  const db = getDb();
  const rows = db
    .prepare("SELECT mobile, name, address FROM customers WHERE name LIKE ? ORDER BY name LIMIT 25")
    .all(`%${name}%`);
  return NextResponse.json({ results: rows });
}


