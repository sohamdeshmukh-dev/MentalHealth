"use client";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  accentClassName?: string;
  helperText?: string;
}

export default function StatsCard({
  label,
  value,
  icon,
  accentClassName = "text-teal-300",
  helperText,
}: StatsCardProps) {
  return (
    <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--panel-shadow)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">{label}</p>
        <span className="text-lg" aria-hidden>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-semibold tracking-tight ${accentClassName}`}>{value}</p>
      {helperText ? <p className="mt-2 text-xs text-[var(--subtle-text)]">{helperText}</p> : null}
    </div>
  );
}
