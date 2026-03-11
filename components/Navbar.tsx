"use client";

import { usePathname } from "next/navigation";
import NavigationMenu from "@/components/NavigationMenu";

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return <NavigationMenu />;
}
