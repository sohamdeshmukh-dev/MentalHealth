"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import NavigationItem from "@/components/NavigationItem";
import { useTheme } from "@/hooks/useTheme";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/journal", label: "Journal", icon: "📝" },
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/ai-therapist", label: "AI Therapist", icon: "🧠" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const MENU_SIZE = 306;
const CENTER = MENU_SIZE / 2;
const ITEM_RADIUS = 104;
const START_ANGLE = -90;

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function positionFor(index: number, total: number) {
  const angle = ((START_ANGLE + (360 / total) * index) * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(angle) * ITEM_RADIUS,
    y: CENTER + Math.sin(angle) * ITEM_RADIUS,
  };
}

export default function NavigationMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [supportsHover, setSupportsHover] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setSupportsHover(query.matches);
    update();

    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const itemsWithPosition = useMemo(
    () => NAV_ITEMS.map((item, index) => ({ ...item, ...positionFor(index, NAV_ITEMS.length) })),
    []
  );

  const activeItem = NAV_ITEMS.find((item) => isActiveRoute(pathname, item.href)) ?? NAV_ITEMS[0];
  const centerItem = NAV_ITEMS.find((item) => item.href === hoveredHref) ?? activeItem;

  return (
    <nav className="pointer-events-none fixed left-3 top-3 z-[9200] sm:left-5 sm:top-5">
      <AnimatePresence>
        {!supportsHover && isOpen ? (
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            className="pointer-events-auto fixed inset-0 bg-transparent"
            onClick={() => {
              setIsOpen(false);
              setHoveredHref(null);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>

      <div
        className="relative h-[330px] w-[330px] sm:h-[350px] sm:w-[350px]"
        onMouseEnter={() => {
          if (supportsHover) {
            setIsOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (supportsHover) {
            setIsOpen(false);
            setHoveredHref(null);
          }
        }}
      >
        <div className="pointer-events-auto absolute left-2 top-2 z-30">
          <motion.button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="rounded-full border border-white/15 bg-black p-3.5 text-white transition-all duration-200 ease-out hover:scale-[1.05] hover:brightness-125 hover:shadow-[0_0_18px_rgba(45,212,191,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
            onClick={() => {
              setIsOpen((current) => !current);
              setHoveredHref(null);
            }}
            whileTap={{ scale: 0.96 }}
          >
            <span className="block text-xs font-semibold tracking-[0.12em]">MENU</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              className="pointer-events-auto absolute left-5 top-5 h-[min(78vw,306px)] w-[min(78vw,306px)] origin-top-left sm:h-[306px] sm:w-[306px]"
              initial={{ opacity: 0, scale: 0.84 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.84 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
                  boxShadow:
                    theme === "dark"
                      ? "0 0 24px rgba(0,0,0,0.55)"
                      : "0 0 24px rgba(148,163,184,0.32)",
                }}
              />

              {itemsWithPosition.map((item) => (
                <NavigationItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  x={item.x}
                  y={item.y}
                  isActive={isActiveRoute(pathname, item.href)}
                  onHoverStart={() => setHoveredHref(item.href)}
                  onHoverEnd={() => setHoveredHref((current) => (current === item.href ? null : current))}
                  onSelect={() => {
                    router.push(item.href);
                    if (!supportsHover) {
                      setIsOpen(false);
                    }
                  }}
                />
              ))}

              <motion.div
                key={centerItem.href}
                className="pointer-events-none absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/45 bg-gray-500 text-center shadow-[0_0_18px_rgba(148,163,184,0.45)]"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <span className="text-[22px] leading-none">{centerItem.icon}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                  {centerItem.label}
                </span>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </nav>
  );
}
