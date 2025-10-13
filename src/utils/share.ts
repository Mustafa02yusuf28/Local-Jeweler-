import type { BillInput } from "@/types/billing";

// Basic UTF-8 safe base64 helpers for client-side use
export function encodeBillToParam(bill: BillInput): string {
  const json = JSON.stringify(bill);
  // encode to base64 safely
  const b64 = typeof window !== "undefined"
    ? window.btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf8").toString("base64");
  return b64;
}

export function decodeBillFromParam(param: string): BillInput | null {
  try {
    const json = typeof window !== "undefined"
      ? decodeURIComponent(escape(window.atob(param)))
      : Buffer.from(param, "base64").toString("utf8");
    return JSON.parse(json) as BillInput;
  } catch {
    return null;
  }
}


