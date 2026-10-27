"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "../../../components/Navbar";
import { Furigana } from "../../../components/Furigana";
import kanjiData from "../../../public/kanji.json";
import wordsData from "../../../public/words.json";
import { type Level } from "../../../lib/level";
import { db } from "../../../lib/db";

interface PageProps {
  params: Promise<{ level: string }>;
}

export default function LevelOverviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawLvl = resolvedParams.level.toLowerCase().replace("n", "");
  const levelNum = (parseInt(rawLvl, 10) || 5) as Level;

  const [activeTab, setActiveTab] = useState<"kanji" | "words">("kanji");
  const [studiedKanjiCount, setStudiedKanjiCount] = useState<number>(0);
  const [studiedWordsCount, setStudiedWordsCount] = useState<number>(0);

  const kanjiDb = kanjiData as Record<string, any>;
  const wordsDb = wordsData as Record<string, any>;

  // Filter items belonging to this level
  const kanjiList = Object.entries(kanjiDb)
    .filter(([_, k]) => k.jlpt === levelNum)
    .map(([char, k]) => ({
      char,
      hanViet: k.hanViet || "",
      on: k.on || [],
      kun: k.kun || [],
      meaning: k.meaning || "",
      strokes: k.strokes || 1,
    }));

  const wordsList = Object.entries(wordsDb)
    .filter(([_, w]) => w.jlpt === levelNum)
    .slice(0, 150) // top 150 for performance
    .map(([word, w]) => ({
      word,
      reading: w.reading,
      meaning: w.meaning,
      rank: w.rank,
    }));

  useEffect(() => {
    async function loadStats() {
      try {
        const items = await db.items.toArray();
        const studiedK = items.filter((i) => i.type === "kanji" && i.level === levelNum);
        const studiedW = items.filter((i) => i.type === "word" && i.level === levelNum);
        setStudiedKanjiCount(studiedK.length);
        setStudiedWordsCount(studiedW.length);
      } catch {
        // Fallback
      }
    }
    loadStats();
  }, [levelNum]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar currentLevel={levelNum} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Level Header with Progress */}
        <div className="card space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Kho học Cấp độ N{levelNum}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent">
                  Cấp ước tính
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted mt-1">
                Các mục mới riêng của cấp N{levelNum}. Mạng nhện và câu ví dụ sẽ tự động tích lũy các cấp thấp hơn.
              </p>
            </div>

            {/* Quick Level Switcher */}
            <div className="flex items-center gap-1 bg-unk-bg p-1 rounded-xl">
              {[5, 4, 3, 2, 1].map((lvl) => (
                <Link
                  key={lvl}
                  href={`/cap/n${lvl}`}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    levelNum === lvl
                      ? "bg-accent text-accent-ink shadow-sm"
                      : "text-muted hover:text-text"
                  }`}
                >
                  N{lvl}
                </Link>
              ))}
            </div>
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-line p-3 bg-card/60">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-text">Tiến độ Kanji N{levelNum}</span>
                <span className="text-accent font-bold">
                  {studiedKanjiCount} / {kanjiList.length} chữ
                </span>
              </div>
              <div className="w-full h-2.5 bg-bar-track rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      kanjiList.length > 0 ? (studiedKanjiCount / kanjiList.length) * 100 : 0
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-line p-3 bg-card/60">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-text">Tiến độ Từ vựng N{levelNum}</span>
                <span className="text-accent font-bold">
                  {studiedWordsCount} từ đã nạp
                </span>
              </div>
              <div className="w-full h-2.5 bg-bar-track rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-brand transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (studiedWordsCount / 100) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Kanji vs Words */}
        <div className="flex items-center gap-3 border-b border-line pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("kanji")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === "kanji"
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-muted hover:text-text hover:bg-unk-bg"
            }`}
          >
            Kanji N{levelNum} ({kanjiList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("words")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === "words"
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-muted hover:text-text hover:bg-unk-bg"
            }`}
          >
            Từ vựng N{levelNum} tiêu biểu ({wordsList.length})
          </button>
        </div>

        {/* Tab 1: Kanji Grid */}
        {activeTab === "kanji" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {kanjiList.map((k) => (
              <div
                key={k.char}
                className="card p-3 flex flex-col items-center justify-between text-center hover:border-accent hover:shadow-md transition-all group"
              >
                <Link href={`/?q=${encodeURIComponent(k.char)}`} className="w-full">
                  <span className="font-ja text-3xl font-bold text-accent group-hover:scale-110 transition-transform block">
                    {k.char}
                  </span>
                  <span className="block text-xs font-bold text-text uppercase mt-1 truncate">
                    {k.hanViet}
                  </span>
                  <span className="block text-[10px] text-muted truncate mt-0.5">
                    {k.meaning}
                  </span>
                </Link>

                <div className="w-full mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[10px]">
                  <span className="text-muted">{k.strokes} nét</span>
                  <Link
                    href={`/viet/${encodeURIComponent(k.char)}`}
                    className="text-accent hover:underline font-semibold"
                  >
                    ✍️ Viết
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Words List */}
        {activeTab === "words" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {wordsList.map((w) => (
              <Link
                key={w.word}
                href={`/?q=${encodeURIComponent(w.word)}`}
                className="card p-3 flex flex-col justify-between hover:border-accent hover:shadow-sm transition-all group"
              >
                <div>
                  <div className="font-ja text-lg font-bold text-text group-hover:text-accent">
                    <Furigana surface={w.word} reading={w.reading} />
                  </div>
                  {w.meaning && (
                    <p className="text-xs text-muted truncate mt-1">{w.meaning}</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[10px] text-muted">
                  <span>Hạng #{w.rank}</span>
                  <span className="text-accent font-semibold">Xem mạng nhện ›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
