"use client";

export default function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 backdrop-blur-sm">
      <span className="text-[11px] font-medium text-slate-400">Calm</span>
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
        <div className="flex-1 bg-blue-400" />
        <div className="flex-1 bg-emerald-400" />
        <div className="flex-1 bg-violet-400" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-orange-400" />
        <div className="flex-1 bg-red-500" />
      </div>
      <span className="text-[11px] font-medium text-slate-400">Stressed</span>
    </div>
  );
}
