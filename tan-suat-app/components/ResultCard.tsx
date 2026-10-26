"use client";

import React from "react";
import type { LookupResult, Entry } from "@/lib/lookup";
import { formatInt, formatPercent } from "@/lib/format";

interface ResultCardProps {
  query: string;
  result: LookupResult | null;
  targetN: number;
  total: number | null;
  isLoading?: boolean;
  onSelectWord?: (word: string) => void;
}

function isPureKana(str: string): boolean {
  return /^[\u3040-\u309F\u30A0-\u30FF\u30FC\s]+$/.test(str);
}

function getJlptEstimate(rank: number): string {
  if (rank <= 800) return "N5 (ước tính)";
  if (rank <= 1500) return "N4 (ước tính)";
  if (rank <= 3750) return "N3 (ước tính)";
  if (rank <= 6000) return "N2 (ước tính)";
  if (rank <= 11000) return "N1 (ước tính)";
  if (rank <= 25000) return "Ngoài N1 (thông dụng nâng cao)";
  return "Rất hiếm gặp";
}

export default function ResultCard({
  query,
  result,
  targetN,
  total,
  isLoading = false,
  onSelectWord,
}: ResultCardProps) {
  if (isLoading) {
    return (
      <section className="card" aria-label="Kết quả tra cứu">
        <h2 className="text-lg font-bold text-text mb-2">Thẻ kết quả</h2>
        <div className="animate-pulse space-y-3 py-4">
          <div className="h-8 bg-line rounded-lg w-1/3"></div>
          <div className="h-16 bg-line rounded-xl"></div>
          <div className="h-12 bg-line rounded-xl"></div>
        </div>
      </section>
    );
  }

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return (
      <section className="card" aria-label="Kết quả tra cứu">
        <h2 className="text-lg font-bold text-text mb-2">Thẻ kết quả</h2>
        <p className="text-sm text-muted">
          Nhập từ vựng vào ô tra cứu để xem tần suất xuất hiện và xếp hạng thông dụng.
        </p>
      </section>
    );
  }

  // Trường hợp không tìm thấy từ trong top 25.000
  if (!result) {
    return (
      <section className="card" aria-label="Kết quả tra cứu">
        <h2 className="text-lg font-bold text-text mb-2">Thẻ kết quả</h2>
        <div className="mt-2">
          <h3 className="text-2xl font-extrabold text-text mb-3" lang="ja">
            {cleanQuery}
          </h3>

          <div className="p-3.5 rounded-xl bg-unk-bg text-unk-ink font-bold text-base mb-3">
            ⚪ Không có trong 25.000 từ thông dụng nhất – rất hiếm gặp
            <small className="block font-normal text-xs text-muted mt-1">
              Gợi ý: Thử nhập thể từ điển (nguyên mẫu) của từ (ví dụ:{" "}
              <button
                type="button"
                onClick={() => onSelectWord?.("食べる")}
                className="underline text-accent hover:opacity-80"
              >
                食べた → 食べる
              </button>
              ).
            </small>
          </div>

          <div className="p-3.5 rounded-xl bg-no-bg text-no-ink font-bold text-base">
            ❌ Không nằm trong top {formatInt(targetN)}
            <small className="block font-medium text-xs mt-0.5 opacity-90">
              Từ này nằm ngoài ngưỡng lọc top {formatInt(targetN)} từ phổ biến.
            </small>
          </div>
        </div>
      </section>
    );
  }

  const { word, reading, rank, count, others } = result;
  const inTop = rank <= targetN;
  const jlptLevel = getJlptEstimate(rank);

  // Tính phần trăm nếu có count và total
  const hasCountData = total !== null && total > 0 && count !== null && count > 0;
  const pct = hasCountData ? (count / total) * 100 : null;
  const perMillion = hasCountData ? (count * 1_000_000) / total : null;

  const showRuby = !isPureKana(word) && reading && word !== reading;

  return (
    <section className="card" aria-label="Kết quả tra cứu">
      <h2 className="text-lg font-bold text-text mb-2">Thẻ kết quả</h2>

      {/* Hiển thị từ với Furigana bằng thẻ <ruby> HTML */}
      <div className="mt-2 mb-4">
        <h3 className="text-3xl font-extrabold text-text tracking-wide leading-tight break-words">
          {showRuby ? (
            <ruby className="ruby-text" lang="ja">
              {word}
              <rt className="text-xs font-semibold text-muted block select-none">
                {reading}
              </rt>
            </ruby>
          ) : (
            <span lang="ja">{word}</span>
          )}
          {isPureKana(word) && reading && word !== reading && (
            <span className="text-sm font-semibold text-muted ml-2" lang="ja">
              ({reading})
            </span>
          )}
        </h3>
      </div>

      {/* Các ô thông số (Stats tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {hasCountData && pct !== null && perMillion !== null ? (
          <>
            <div className="bg-bg rounded-xl p-3 min-w-0">
              <span className="block text-xs text-muted mb-0.5">Lặp lại</span>
              <span className="text-lg font-bold text-text tabular-nums">
                {formatPercent(pct)}
              </span>
            </div>
            <div className="bg-bg rounded-xl p-3 min-w-0">
              <span className="block text-xs text-muted mb-0.5">Quy đổi</span>
              <span className="text-lg font-bold text-text tabular-nums">
                ≈ {formatInt(perMillion)} lần / 1M từ
              </span>
            </div>
          </>
        ) : null}

        <div className="bg-bg rounded-xl p-3 min-w-0">
          <span className="block text-xs text-muted mb-0.5">Hạng thông dụng</span>
          <span className="text-lg font-bold text-text tabular-nums">
            {formatInt(rank)}{" "}
            <span className="text-xs font-normal text-muted">/ 25.000</span>
          </span>
        </div>

        <div className="bg-bg rounded-xl p-3 min-w-0">
          <span className="block text-xs text-muted mb-0.5">Mức JLPT</span>
          <span className="text-lg font-bold text-text">{jlptLevel}</span>
        </div>

        {!hasCountData && (
          <div className="bg-bg rounded-xl p-3 min-w-0">
            <span className="block text-xs text-muted mb-0.5">Nguồn xếp hạng</span>
            <span className="text-sm font-semibold text-text">jiten.moe Global</span>
          </div>
        )}
      </div>

      {/* Thông báo Top N */}
      <div
        className={`p-3.5 rounded-xl font-bold text-base transition-colors ${
          inTop ? "bg-ok-bg text-ok-ink" : "bg-no-bg text-no-ink"
        }`}
      >
        {inTop ? (
          <>
            ✅ Có nằm trong top {formatInt(targetN)}
            <small className="block font-medium text-xs mt-0.5 opacity-90">
              Hạng {formatInt(rank)} ≤ {formatInt(targetN)}
            </small>
          </>
        ) : (
          <>
            ❌ Không nằm trong top {formatInt(targetN)}
            <small className="block font-medium text-xs mt-0.5 opacity-90">
              Hạng {formatInt(rank)} &gt; {formatInt(targetN)}
            </small>
          </>
        )}
      </div>

      {/* Hiển thị các từ khác có cùng cách đọc nếu có */}
      {others && others.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-line text-xs text-muted">
          <span className="mr-1.5 font-medium">Còn từ khác cùng cách đọc:</span>
          <div className="inline-flex flex-wrap gap-1.5 mt-1">
            {others.map((oth) => (
              <button
                key={oth.word}
                type="button"
                onClick={() => onSelectWord?.(oth.word)}
                className="px-2 py-0.5 rounded-md bg-bg hover:bg-chip-line text-text font-medium text-xs border border-line transition-colors cursor-pointer"
              >
                <span lang="ja" className="font-bold mr-1">
                  {oth.word}
                </span>
                <span className="text-muted tabular-nums">#{formatInt(oth.rank)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
