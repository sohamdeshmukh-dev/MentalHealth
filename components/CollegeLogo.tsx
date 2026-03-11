"use client";

import { useState } from "react";
import { findCollegeByName, getCollegeLogoUrl } from "@/lib/collegeList";

interface CollegeLogoProps {
  collegeName: string;
  size?: number;
  className?: string;
}

export default function CollegeLogo({ collegeName, size = 28, className = "" }: CollegeLogoProps) {
  const [failed, setFailed] = useState(false);
  const entry = findCollegeByName(collegeName);

  if (!entry || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-white/[0.06] text-sm ${className}`}
        style={{ width: size, height: size }}
      >
        🎓
      </div>
    );
  }

  // Always fetch at 256px (max supported) for crisp rendering at any display size
  const fetchSize = 256;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={getCollegeLogoUrl(entry.domain, fetchSize)}
        alt={collegeName}
        width={fetchSize}
        height={fetchSize}
        style={{
          width: size,
          height: size,
          imageRendering: "auto",
        }}
        className="object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
