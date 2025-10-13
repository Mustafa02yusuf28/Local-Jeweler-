"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Users, FileText, TrendingUp } from "lucide-react";

export default function Home() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sections = [
    { href: "/dashboard", title: "Dashboard", description: "Overview and quick stats", icon: LayoutDashboard, gradient: "from-violet-500/10 to-purple-500/10", hoverGradient: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-400", borderColor: "border-violet-500/20" },
    { href: "/customers", title: "Customers", description: "Search and view history", icon: Users, gradient: "from-blue-500/10 to-cyan-500/10", hoverGradient: "from-blue-500/20 to-cyan-500/20", iconColor: "text-blue-400", borderColor: "border-blue-500/20" },
    { href: "/billing", title: "Billing", description: "Create invoices", icon: FileText, gradient: "from-emerald-500/10 to-green-500/10", hoverGradient: "from-emerald-500/20 to-green-500/20", iconColor: "text-emerald-400", borderColor: "border-emerald-500/20" },
    { href: "/rates", title: "Gold Rates", description: "Manage karat rates", icon: TrendingUp, gradient: "from-amber-500/10 to-orange-500/10", hoverGradient: "from-amber-500/20 to-orange-500/20", iconColor: "text-amber-400", borderColor: "border-amber-500/20" },
  ];

  const [activeCustomers, setActiveCustomers] = useState<string>("—");
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>("—");
  const [pendingInvoices, setPendingInvoices] = useState<string>("—");

  useEffect(() => {
    (async () => {
      try {
        const statsRes = await fetch("/api/stats", { cache: "no-store" });
        if (statsRes.ok) {
          const s = await statsRes.json();
          setActiveCustomers(String(s.totalCustomers ?? "—"));
          setPendingInvoices(String(s.totalInvoices ?? "—"));
        }
      } catch {}
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const repRes = await fetch(`/api/reports/monthly?year=${y}&month=${m}`, { cache: "no-store" });
        if (repRes.ok) {
          const r = await repRes.json();
          const net = r?.kpis?.net ?? 0;
          setMonthlyRevenue(`₹${Number(net).toFixed(2)}`);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #25344F 0%, #1a2332 50%, #2a3a4f 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(214, 184, 147, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(99, 32, 36, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(103, 120, 145, 0.05) 0%, transparent 50%)'
        }} />
      </div>

      <div className="relative p-6 md:p-12 max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <div className="inline-block mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: 'rgba(214, 184, 147, 0.1)', borderColor: 'rgba(214, 184, 147, 0.2)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(135deg, #D6B893 0%, #C4A478 100%)', boxShadow: '0 0 10px rgba(214, 184, 147, 0.5)' }}></div>
              <span className="text-xs font-medium" style={{ color: '#D6B893' }}>WELCOME</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#D6B893] via-[#E8D4B8] to-[#D6B893] bg-clip-text text-transparent mb-4 tracking-tight">Your Shop Name</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">Choose a section to get started with your business management</p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-px w-12" style={{ backgroundImage: 'linear-gradient(to right, transparent, rgba(214, 184, 147, 0.5))' }}></div>
            <div className="h-1 w-1 rounded-full" style={{ background: '#D6B893' }}></div>
            <div className="h-px w-12" style={{ backgroundImage: 'linear-gradient(to left, transparent, rgba(214, 184, 147, 0.5))' }}></div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sections.map((section, index) => {
            const Icon = section.icon as any;
            const isHovered = hoveredIndex === index;
            return (
              <a key={section.href} href={section.href} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} className="group relative block">
                <div className={`relative h-48 p-6 rounded-2xl border backdrop-blur-sm transition-all duration-500 ease-out ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}`} style={{ background: 'rgba(103, 120, 145, 0.15)', borderColor: 'rgba(214, 184, 147, 0.15)' }}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${isHovered ? section.hoverGradient : section.gradient} transition-all duration-500`}></div>
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-gradient-to-br ${section.gradient} blur-xl transition-opacity duration-500 -z-10`}></div>
                  <div className="relative h-full flex flex-col justify-between z-10">
                    <div>
                      <div className={`inline-flex p-3 rounded-xl transition-transform duration-500 ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(214, 184, 147, 0.2)' }}>
                        <Icon className={`w-6 h-6 ${section.iconColor}`} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors">{section.title}</h3>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{section.description}</p>
                      <div className={`flex items-center gap-2 text-xs font-medium ${section.iconColor} transition-all duration-300 ${isHovered ? 'translate-x-2 opacity-100' : 'translate-x-0 opacity-0'}`}>
                        <span>Open</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundImage: 'linear-gradient(to top right, transparent, rgba(255,255,255,0.05), transparent)' }}></div>
                </div>
              </a>
            );
          })}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(103, 120, 145, 0.12)', border: '1px solid rgba(214, 184, 147, 0.15)' }}>
              <div className="text-xs text-amber-300 uppercase tracking-wider mb-2">Active Customers</div>
              <div className="text-3xl font-bold text-amber-300">{activeCustomers}</div>
            </div>
            <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(103, 120, 145, 0.12)', border: '1px solid rgba(214, 184, 147, 0.15)' }}>
              <div className="text-xs text-amber-300 uppercase tracking-wider mb-2">Monthly Revenue</div>
              <div className="text-3xl font-bold text-amber-300">{monthlyRevenue}</div>
            </div>
            <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(103, 120, 145, 0.12)', border: '1px solid rgba(214, 184, 147, 0.15)' }}>
              <div className="text-xs text-amber-300 uppercase tracking-wider mb-2">Total Invoices</div>
              <div className="text-3xl font-bold text-amber-300">{pendingInvoices}</div>
            </div>
            <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: 'rgba(99, 32, 36, 0.15)', border: '1px solid rgba(214, 184, 147, 0.15)' }}>
              <div className="text-xs text-amber-300 uppercase tracking-wider mb-4">Quick Actions</div>
              <div className="flex flex-col gap-2">
                <a href="/billing" className="px-3 py-2 rounded-lg" style={{ background: 'rgba(214, 184, 147, 0.1)', border: '1px solid rgba(214, 184, 147, 0.2)', color: '#D6B893' }}>+ Create New Invoice</a>
                <a href="/customers" className="px-3 py-2 rounded-lg" style={{ background: 'rgba(214, 184, 147, 0.1)', border: '1px solid rgba(214, 184, 147, 0.2)', color: '#D6B893' }}>+ Add New Customer</a>
                <a href="/dashboard" className="px-3 py-2 rounded-lg" style={{ background: 'rgba(214, 184, 147, 0.1)', border: '1px solid rgba(214, 184, 147, 0.2)', color: '#D6B893' }}>📊 View Today&apos;s Summary</a>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
