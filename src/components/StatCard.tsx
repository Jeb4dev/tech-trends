interface StatCardProps {
  label: string;
  value: string | number;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-5 md:p-6">
      <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">
        {typeof value === "number" ? value.toLocaleString("fi-FI") : value}
      </div>
      <div className="text-sm text-gray-400 mt-1.5">{label}</div>
    </div>
  );
}
