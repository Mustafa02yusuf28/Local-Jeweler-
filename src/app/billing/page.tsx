import BillingClient from "@/components/BillingClient";
import BackHome from "@/components/BackHome";

export default function BillingPage() {
  return (
    <div>
      <BackHome />
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">Billing</h1>
        <p className="text-sm text-gray-400 mt-1">Create invoices with items, exchange and taxes</p>
      </header>
      <BillingClient />
    </div>
  );
}


