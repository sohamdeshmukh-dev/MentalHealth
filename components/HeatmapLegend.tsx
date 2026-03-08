"use client";

export default function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 backdrop-blur-sm">
      <span className="text-[11px] font-medium text-slate-400/90">Calm</span>
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
        <div className="flex-1 bg-[#60a5fa]" />
        <div className="flex-1 bg-[#34d399]" />
        <div className="flex-1 bg-[#a78bfa]" />
        <div className="flex-1 bg-[#fbbf24]" />
        <div className="flex-1 bg-[#fb923c]" />
        <div className="flex-1 bg-[#ef4444]" />
      </div>
      <span className="text-[11px] font-medium text-slate-400/90">Stressed</span>
    </div>
  );
}
