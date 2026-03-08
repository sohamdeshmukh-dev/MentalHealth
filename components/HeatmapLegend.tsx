"use client";

export default function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-2">
      <span className="text-[11px] text-slate-500">Calm</span>
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full">
        <div className="flex-1 bg-blue-500" />
        <div className="flex-1 bg-teal-400" />
        <div className="flex-1 bg-green-400" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-orange-400" />
        <div className="flex-1 bg-red-500" />
      </div>
      <span className="text-[11px] text-slate-500">Stressed</span>
    </div>
  );
}
