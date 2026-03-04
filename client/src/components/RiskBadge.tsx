import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  level?: "Low" | "Medium" | "High" | null;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  if (!level) return null;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      level === "Low" && "bg-emerald-50 text-emerald-700 border-emerald-200",
      level === "Medium" && "bg-amber-50 text-amber-700 border-amber-200",
      level === "High" && "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
      className
    )}>
      {level} Risk
    </span>
  );
}
