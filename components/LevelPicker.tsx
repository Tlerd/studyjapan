"use client";

import React from "react";
import { type Level } from "../lib/level";

interface LevelPickerProps {
  currentLevel: Level;
  onChange: (level: Level) => void;
  showHigherLevel?: boolean;
  onToggleHigherLevel?: (show: boolean) => void;
}

export const LEVELS: Level[] = [5, 4, 3, 2, 1];

export function LevelPicker({
  currentLevel,
  onChange,
  showHigherLevel,
  onToggleHigherLevel
}: LevelPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-muted font-medium">Cấp độ (ước tính):</span>
      <div className="inline-flex rounded-lg border border-line bg-card p-0.5 shadow-sm">
        {LEVELS.map((lvl) => {
          const isActive = currentLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => onChange(lvl)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                isActive
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-text hover:bg-unk-bg"
              }`}
            >
              N{lvl}
            </button>
          );
        })}
      </div>

      {onToggleHigherLevel && (
        <label className="flex items-center gap-1.5 ml-2 text-xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!showHigherLevel}
            onChange={(e) => onToggleHigherLevel(e.target.checked)}
            className="rounded border-line text-accent focus:ring-accent"
          />
          <span>Hiện từ cấp cao hơn (mờ)</span>
        </label>
      )}
    </div>
  );
}
