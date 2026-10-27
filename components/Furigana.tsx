"use client";

import React from "react";
import { furigana, SPECIAL_READINGS } from "../lib/furigana";

interface FuriganaProps {
  surface: string;
  reading?: string;
  hideRuby?: boolean;
  className?: string;
}

export function Furigana({
  surface,
  reading,
  hideRuby = false,
  className = ""
}: FuriganaProps) {
  if (!reading || hideRuby) {
    return <span className={className}>{surface}</span>;
  }

  const segments = furigana(surface, reading);
  const isSpecial = SPECIAL_READINGS.has(surface);

  return (
    <span className={`inline-flex items-baseline gap-0.5 ${className}`}>
      {segments.map((seg, idx) => {
        if (!seg.ruby) {
          return <span key={idx}>{seg.text}</span>;
        }
        return (
          <ruby key={idx} className="leading-tight">
            <span>{seg.text}</span>
            <rt className="text-[0.55em] text-muted select-none">{seg.ruby}</rt>
          </ruby>
        );
      })}
      {isSpecial && (
        <span
          title="Cách đọc đặc biệt (phủ cả từ)"
          className="ml-1 text-[10px] text-amber-500 font-bold select-none"
        >
          ⚠
        </span>
      )}
    </span>
  );
}
