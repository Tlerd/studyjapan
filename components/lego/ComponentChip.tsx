"use client";

import React from "react";
import Link from "next/link";

interface ComponentChipProps {
  part: string;
  vi: string;
  pos?: string;
  variantOf?: string | null;
  onClick?: () => void;
  className?: string;
}

const posLabelMap: Record<string, string> = {
  left: "trái",
  right: "phải",
  top: "trên",
  bottom: "dưới",
  surround: "bao quanh",
  inside: "trong",
  whole: "nguyên"
};

export function ComponentChip({
  part,
  vi,
  pos,
  onClick,
  className = ""
}: ComponentChipProps) {
  const content = (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-card hover:border-accent hover:bg-accent-soft/20 text-xs transition-all shadow-sm ${className}`}
    >
      <span className="font-ja font-bold text-sm text-accent">{part}</span>
      <span className="font-medium text-text">{vi}</span>
      {pos && (
        <span className="text-[10px] text-muted bg-unk-bg px-1.5 py-0.5 rounded">
          {posLabelMap[pos] || pos}
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="focus:outline-none">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/bo/${encodeURIComponent(part)}`} className="focus:outline-none">
      {content}
    </Link>
  );
}
