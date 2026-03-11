"use client";

import { motion } from "framer-motion";

interface NavigationItemProps {
  icon: string;
  label: string;
  x: number;
  y: number;
  isActive: boolean;
  onSelect: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export default function NavigationItem({
  icon,
  label,
  x,
  y,
  isActive,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: NavigationItemProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHoverStart}
      onFocus={onHoverStart}
      onMouseLeave={onHoverEnd}
      onBlur={onHoverEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 bg-transparent px-2 py-1 text-center transition-all duration-200 ease-out cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        isActive
          ? "text-white drop-shadow-[0_0_11px_rgba(45,212,191,0.55)]"
          : "text-slate-300/90 hover:text-white hover:brightness-125 hover:drop-shadow-[0_0_12px_rgba(45,212,191,0.45)]"
      }`}
      style={{ left: `${x}px`, top: `${y}px` }}
      whileHover={{ scale: 1.1, y: -4 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <span className="text-[24px] leading-none">{icon}</span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{label}</span>
    </motion.button>
  );
}
