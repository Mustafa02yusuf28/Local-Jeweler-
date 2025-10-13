import RatesClient from "@/components/RatesClient";
import BackHome from "@/components/BackHome";

export default function RatesPage() {
  return (
    <div>
      <BackHome />
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">Gold Rates</h1>
        <p className="text-sm text-gray-400 mt-1">Set 24K and per-karat rates; auto-calc from base</p>
      </header>
      <RatesClient />
    </div>
  );
}


