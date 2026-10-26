"use client";

import React from "react";
import type { LookupResult, Entry } from "@/lib/lookup";
import { formatInt } from "@/lib/format";

interface RankLadderProps {
  currentQuery: string;
  currentResult: LookupResult | null;
  targetN: number;
  onTargetNChange: (n: number) => void;
  recentEntries: Entry[];
  onSelectWord: (word: string) => void;
}

const MAX_RANK = 25000;

function logPos(rank: number): number {
  if (rank <= 1) return 0;
  if (rank >= MAX_RANK) return 1;
  return Math.log10(rank) / Math.log10(MAX_RANK);
}

const TICKS = [1, 10, 100, 1000, 10000, 25000];

const JLPT_LEVELS = [
  { level: "N5", rank: 800 },
  { level: "N4", rank: 1500 },
  { level: "N3", rank: 3750 },
  { level: "N2", rank: 6000 },
  { level: "N1", rank: 11000 },
];

export default function RankLadder({
  currentQuery,
  currentResult,
  targetN,
  onTargetNChange,
  recentEntries,
  onSelectWord,
}: RankLadderProps) {
  const topGreenPercent = logPos(targetN) * 100;
  const isUnknown = Boolean(currentQuery.trim() && !currentResult);

  return (
    <section className="card flex flex-col" aria-labelledby="t-ladder">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
        <h2 id="t-ladder" className="text-lg font-bold text-text">
          Bảng hạng
        </h2>
        <span className="text-xs text-muted">
          Thang logarit (1 → 25.000)
        </span>
      </div>

      <p className="text-xs text-muted mb-3">
        Từ càng thông dụng càng ở trên đỉnh. Các vạch chia tăng theo cấp số nhân (gấp 10 lần).
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-brand"></span>
          Top N (1 → {formatInt(targetN)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-brand"></span>
          N → {formatInt(MAX_RANK)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-brand"></span>
          Ngoài 25k
        </span>
      </div>

      {/* Slider */}
      <div className="bg-bg rounded-xl p-3 mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="n-slider" className="text-sm font-bold text-text">
            Ngưỡng Top N:{" "}
            <span className="text-accent">{formatInt(targetN)}</span>
          </label>
          <span className="text-xs text-muted">Kéo để đổi</span>
        </div>

        <input
          id="n-slider"
          type="range"
          min={500}
          max={MAX_RANK}
          step={500}
          value={targetN}
          onChange={(e) => onTargetNChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg accent-accent cursor-pointer"
        />

        {/* Nút bấm nhanh các mốc JLPT */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="text-xs text-muted self-center mr-1">Đặt nhanh:</span>
          {JLPT_LEVELS.slice(2).map((item) => (
            <button
              key={item.level}
              type="button"
              onClick={() => onTargetNChange(item.rank)}
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                targetN === item.rank
                  ? "bg-accent text-accent-ink border-accent font-bold"
                  : "bg-chip-bg text-text border-chip-line hover:border-accent"
              }`}
            >
              {item.level} ({formatInt(item.rank)})
            </button>
          ))}
          <button
            type="button"
            onClick={() => onTargetNChange(2500)}
            className={`text-xs px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
              targetN === 2500
                ? "bg-accent text-accent-ink border-accent font-bold"
                : "bg-chip-bg text-text border-chip-line hover:border-accent"
            }`}
          >
            Mặc định (2.500)
          </button>
        </div>
      </div>

      {/* Vùng thang đo (Track) */}
      <div className="relative h-[560px] sm:h-[620px] my-2 select-none">
        {/* Vạch chia số (Ticks) bên trái */}
        {TICKS.map((tick) => {
          const topPct = logPos(tick) * 100;
          return (
            <div
              key={tick}
              className="absolute left-0 text-[11px] font-mono text-muted transform -translate-y-1/2 flex items-center gap-1"
              style={{ top: `${topPct}%` }}
            >
              <span>{formatInt(tick)}</span>
              <span className="w-2 h-[1px] bg-line inline-block"></span>
            </div>
          );
        })}

        {/* Trục chính ở giữa */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-3.5 rounded-t-full overflow-hidden bg-yellow-brand shadow-inner">
          {/* Vùng Top N màu xanh */}
          <div
            className="absolute left-0 right-0 top-0 bg-green-brand transition-all duration-150"
            style={{ height: `${topGreenPercent}%` }}
          />
        </div>

        {/* Các đường mốc JLPT (nét đứt) */}
        {JLPT_LEVELS.map((jlpt) => {
          const topPct = logPos(jlpt.rank) * 100;
          return (
            <div
              key={jlpt.level}
              className="absolute left-14 right-2 pointer-events-none flex items-center transform -translate-y-1/2 opacity-75"
              style={{ top: `${topPct}%` }}
            >
              <div className="flex-1 border-b border-dashed border-muted"></div>
              <span className="text-[10px] uppercase font-semibold text-muted bg-card px-1 ml-1 rounded">
                {jlpt.level} (ước tính ~{formatInt(jlpt.rank)})
              </span>
            </div>
          );
        })}

        {/* Chấm của các từ tra gần nhất (Recent words) */}
        {recentEntries.map((item, idx) => {
          // Bỏ qua nếu là từ hiện tại đang xem (đã có chấm to riêng)
          if (currentResult && currentResult.word === item.word) return null;
          const topPct = logPos(item.rank) * 100;
          const isLeft = idx % 2 === 0;

          return (
            <div
              key={`recent-${item.word}-${idx}`}
              className="absolute left-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 group"
              style={{ top: `${topPct}%` }}
            >
              <button
                type="button"
                onClick={() => onSelectWord(item.word)}
                className={`absolute top-0 w-2.5 h-2.5 rounded-full border border-card shadow-sm transition-transform hover:scale-125 cursor-pointer ${
                  item.rank <= targetN ? "bg-green-brand" : "bg-yellow-brand"
                }`}
                style={{ transform: "translate(-50%, -50%)" }}
                title={`${item.word} (#${formatInt(item.rank)})`}
              />
              <span
                onClick={() => onSelectWord(item.word)}
                className={`absolute top-0 transform -translate-y-1/2 text-[11px] whitespace-nowrap px-1.5 py-0.5 rounded bg-card border border-line text-muted hover:text-text cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${
                  isLeft
                    ? "right-3 text-right"
                    : "left-3 text-left"
                }`}
              >
                <span lang="ja" className="font-semibold">
                  {item.word}
                </span>{" "}
                · #{formatInt(item.rank)}
              </span>
            </div>
          );
        })}

        {/* Chấm nổi bật của từ đang tra (Active Hit) */}
        {currentResult && (
          <div
            className="absolute left-1/2 transform -translate-y-1/2 -translate-x-1/2 z-30"
            style={{ top: `${logPos(currentResult.rank) * 100}%` }}
          >
            {/* Chấm tròn to */}
            <div
              className="w-4 h-4 rounded-full bg-accent ring-4 ring-card shadow-md animate-bounce"
              style={{ transform: "translate(-50%, -50%)" }}
            />
            {/* Nhãn gắn với chấm */}
            <div
              className="absolute top-0 left-4 transform -translate-y-1/2 bg-card border-2 border-accent text-accent px-2 py-0.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-md flex items-center gap-1.5"
            >
              <span lang="ja" className="text-sm">
                {currentResult.word}
              </span>
              <span>#{formatInt(currentResult.rank)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Đuôi danh sách: Ngoài top 25.000 */}
      <div
        className={`flex flex-col items-center pt-2 pb-1 border-t transition-colors ${
          isUnknown
            ? "border-accent bg-accent-soft rounded-b-xl"
            : "border-line"
        }`}
      >
        <span
          className={`w-3.5 h-5 rounded-b-md ${
            isUnknown ? "bg-accent" : "bg-gray-brand"
          }`}
        ></span>
        <span
          className={`text-xs text-center mt-1.5 px-2 ${
            isUnknown ? "font-bold text-accent" : "text-muted"
          }`}
        >
          {isUnknown ? (
            <>
              ⚪ <span lang="ja">{currentQuery}</span>: không có hạng, nằm ngoài 25.000 từ
            </>
          ) : (
            "⚪ Ngoài danh sách: hạng trên 25.000 hoặc rất hiếm gặp"
          )}
        </span>
      </div>
    </section>
  );
}
