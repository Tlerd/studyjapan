"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useFreqData } from "@/lib/useFreqData";
import { type LookupResult, type Entry } from "@/lib/lookup";
import SearchBox from "@/components/SearchBox";
import ResultCard from "@/components/ResultCard";
import RankLadder from "@/components/RankLadder";

const STORAGE_KEY_RECENT = "ts_recent_words_v1";
const STORAGE_KEY_N = "ts_target_n_v1";
const DEFAULT_N = 2500;
const DEFAULT_QUERY = "温泉";

export default function HomePage() {
  const { index, data, isLoading } = useFreqData();

  const [query, setQuery] = useState<string>(DEFAULT_QUERY);
  const [targetN, setTargetN] = useState<number>(DEFAULT_N);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);

  // Đọc cấu hình từ localStorage khi khởi động
  useEffect(() => {
    try {
      const savedN = localStorage.getItem(STORAGE_KEY_N);
      if (savedN) {
        const parsedN = Number.parseInt(savedN, 10);
        if (!Number.isNaN(parsedN) && parsedN >= 500 && parsedN <= 25000) {
          setTargetN(parsedN);
        }
      }

      const savedRecent = localStorage.getItem(STORAGE_KEY_RECENT);
      if (savedRecent) {
        const parsedList = JSON.parse(savedRecent);
        if (Array.isArray(parsedList)) {
          setRecentEntries(parsedList.slice(0, 10));
        }
      }
    } catch (e) {
      console.warn("Không thể đọc localStorage:", e);
    }
  }, []);

  // Thực hiện tra cứu từ
  const performLookup = useCallback(
    (q: string) => {
      const cleanQ = q.trim();
      setQuery(cleanQ);

      if (!cleanQ || !index) {
        setResult(null);
        return;
      }

      const found = index.lookup(cleanQ);
      setResult(found);

      if (found) {
        setRecentEntries((prev) => {
          const filtered = prev.filter((item) => item.word !== found.word);
          const next = [
            {
              word: found.word,
              reading: found.reading,
              rank: found.rank,
              count: found.count,
            },
            ...filtered,
          ].slice(0, 10);

          try {
            localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(next));
          } catch (e) {
            console.warn("Không thể lưu recentWords vào localStorage:", e);
          }

          return next;
        });
      }
    },
    [index]
  );

  // Khi dữ liệu tải xong lần đầu, tự động tra từ mặc định
  useEffect(() => {
    if (index && query) {
      performLookup(query);
    }
  }, [index, performLookup]);

  // Xử lý thay đổi Slider N
  const handleTargetNChange = (n: number) => {
    setTargetN(n);
    try {
      localStorage.setItem(STORAGE_KEY_N, n.toString());
    } catch (e) {
      console.warn("Không thể lưu N vào localStorage:", e);
    }
  };

  return (
    <div className="max-w-[1040px] mx-auto px-4 py-5 sm:py-8">
      {/* Header */}
      <header className="mb-6">
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-note-bg text-note-ink mb-2">
          Kho từ điển top 25.000 từ tiếng Nhật
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-text leading-tight mb-2">
          Từ này lặp lại bao nhiêu?
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-[62ch]">
          Tra xem một từ tiếng Nhật nằm ở thứ hạng nào và có thuộc nhóm từ thường gặp nhất không.
        </p>
      </header>

      {/* Main Grid: 2 Khối */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Cột trái: Ô tra cứu & Khối A (Thẻ kết quả) */}
        <div className="flex flex-col gap-4 min-w-0">
          <SearchBox
            initialValue={query}
            onSearch={performLookup}
            isLoading={isLoading}
          />

          <ResultCard
            query={query}
            result={result}
            targetN={targetN}
            total={data?.total ?? null}
            isLoading={isLoading}
            onSelectWord={performLookup}
          />
        </div>

        {/* Cột phải: Khối B (Bảng hạng có thanh trượt) */}
        <div className="min-w-0">
          <RankLadder
            currentQuery={query}
            currentResult={result}
            targetN={targetN}
            onTargetNChange={handleTargetNChange}
            recentEntries={recentEntries}
            onSelectWord={performLookup}
          />
        </div>
      </main>

      {/* Footer ghi rõ nguồn & bản quyền */}
      <footer className="mt-10 pt-6 border-t border-line text-center text-xs text-muted space-y-1">
        <p>
          Dữ liệu tần suất:{" "}
          <a
            href="https://jiten.moe"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent font-medium"
          >
            jiten.moe Global
          </a>{" "}
          (giấy phép{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent font-medium"
          >
            CC BY-SA 4.0
          </a>
          ).
        </p>
        <p>Mốc phân hạng JLPT (N5 → N1) mang tính chất ước tính dựa trên thống kê cộng đồng.</p>
      </footer>
    </div>
  );
}
