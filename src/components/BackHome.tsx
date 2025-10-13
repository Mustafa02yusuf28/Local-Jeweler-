"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function BackHome() {
  return (
    <div className="mb-4">
      <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 rounded bg-purple-500/10 text-white-300 hover:bg-purple-500/20 mt-2 ml-2">
        <Home size={16} />
        <span>Back</span>
      </Link>
    </div>
  );
}


