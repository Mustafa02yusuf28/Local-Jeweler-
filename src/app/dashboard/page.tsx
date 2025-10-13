import BackHome from "@/components/BackHome";
import { getDb } from "@/server/db";
import MonthlyReport from "@/components/MonthlyReport";

export default async function DashboardPage() {
  const db = getDb();
  const totalCustomers = (db.prepare("SELECT COUNT(*) as c FROM customers").get().c as number) || 0;
  const totalInvoices = (db.prepare("SELECT COUNT(*) as c FROM invoices").get().c as number) || 0;
  const lastInvoiceNoRow = db.prepare("SELECT MAX(invoice_no) as maxNo FROM invoices").get();
  const lastInvoiceNo = (lastInvoiceNoRow?.maxNo as number) || 0;

  return (
    <div className="min-h-screen">
      <BackHome />
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview and quick stats</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="relative h-32 p-6 rounded-2xl border bg-gray-900/50 backdrop-blur-sm border-violet-500/20 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
          <div className="relative h-full flex flex-col justify-between z-10">
            <h3 className="text-sm text-gray-400">Total Customers</h3>
            <p className="text-4xl font-bold text-violet-300">{totalCustomers}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative h-32 p-6 rounded-2xl border bg-gray-900/50 backdrop-blur-sm border-blue-500/20 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
          <div className="relative h-full flex flex-col justify-between z-10">
            <h3 className="text-sm text-gray-400">Next Invoice</h3>
            <p className="text-4xl font-bold text-blue-300">{lastInvoiceNo + 1}</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative h-32 p-6 rounded-2xl border bg-gray-900/50 backdrop-blur-sm border-emerald-500/20 overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10" />
          <div className="relative h-full flex flex-col justify-between z-10">
            <h3 className="text-sm text-gray-400">Total Invoices</h3>
            <p className="text-4xl font-bold text-emerald-300">{totalInvoices}</p>
          </div>
        </div>

        {/* Card 4 removed: Estimates */}
      </div>

      <MonthlyReport />
    </div>
  );
}


