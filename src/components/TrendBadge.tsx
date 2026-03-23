import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendBadgeProps {
  delta: number;
  showValue?: boolean;
}

export default function TrendBadge({ delta, showValue = true }: TrendBadgeProps) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="w-3 h-3" />
        {showValue && <span>0</span>}
      </span>
    );
  }

  const isUp = delta > 0;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 text-xs font-medium " +
        (isUp ? "text-green-400" : "text-red-400")
      }
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {showValue && <span>{isUp ? "+" : ""}{delta}</span>}
    </span>
  );
}
