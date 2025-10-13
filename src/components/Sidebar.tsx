"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, TrendingUp, Menu } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/billing", label: "Billing", icon: FileText },
  { href: "/rates", label: "Gold Rates", icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toLocaleDateString());
  }, []);

  return (
    <>
      <button
        className="md:hidden p-2 text-gray-700"
        onClick={() => setOpen(true)}
        aria-label="Open Menu"
      >
        <Menu size={22} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed z-40 md:z-0 inset-y-0 left-0 w-64 bg-[#0b0e12] text-gray-200 border-r border-gray-800 transform transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold" style={{color: 'var(--primary)'}}>Your Shop Name</h1>
          <p className="text-xs text-gray-400">Jewelry Management</p>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active ? "bg-amber-500/10 text-amber-300" : "text-gray-300 hover:bg-white/5"
                }`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 text-xs text-gray-500">
          <p suppressHydrationWarning>{today}</p>
        </div>
      </aside>
    </>
  );
}


