import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 bg-[#0f1216]/80 backdrop-blur border-b border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <Sidebar />
            <h2 className="text-lg font-semibold section-title">Jewelry Management</h2>
            <div className="text-sm text-gray-600">&nbsp;</div>
          </div>
        </header>
        <main className="p-4 md:p-6 space-y-6 relative z-0">{children}</main>
      </div>
    </div>
  );
}


