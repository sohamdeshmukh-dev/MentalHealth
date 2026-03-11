"use client";

interface StatsCardProps {
  value: number;
  label: string;
  color: "teal" | "indigo" | "purple";
  icon: string;
  isLoading?: boolean;
}

const colorMap = {
  teal: {
    text: "text-teal-400",
    glow: "shadow-teal-500/10",
    border: "hover:border-teal-500/20",
    bg: "hover:bg-teal-500/[0.03]",
  },
  indigo: {
    text: "text-indigo-400",
    glow: "shadow-indigo-500/10",
    border: "hover:border-indigo-500/20",
    bg: "hover:bg-indigo-500/[0.03]",
  },
  purple: {
    text: "text-purple-400",
    glow: "shadow-purple-500/10",
    border: "hover:border-purple-500/20",
    bg: "hover:bg-purple-500/[0.03]",
  },
};

export default function StatsCard({
  value,
  label,
  color,
  icon,
  isLoading,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center backdrop-blur-sm transition-all duration-300 ${colors.border} ${colors.bg} ${colors.glow} hover:shadow-lg`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-12 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
        </div>
      ) : (
        <>
          <div
            className={`text-2xl font-bold ${colors.text} transition-transform duration-300 group-hover:scale-110`}
          >
            {value}
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {label} {icon}
          </div>
        </>
      )}
    </div>
  );
}
