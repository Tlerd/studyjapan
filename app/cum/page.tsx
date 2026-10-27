"use client";

import React, { useState } from "react";
import { Navbar } from "../../components/Navbar";
import { Furigana } from "../../components/Furigana";
import { db } from "../../lib/db";
import { scheduleNewItem, type StudyCard } from "../../lib/srs";
import ekiPack from "../../data/packs/eki.json";
import morningPack from "../../data/packs/morning.json";
import restaurantPack from "../../data/packs/restaurant.json";

const PACKS = [ekiPack, morningPack, restaurantPack];

export default function ChunksAndSituationsPage() {
  const [learnedPacks, setLearnedPacks] = useState<Record<string, boolean>>({});
  const [packNotice, setPackNotice] = useState<Record<string, string>>({});

  const handleLearnPack = async (pack: typeof ekiPack) => {
    try {
      const existingItems = await db.items.toArray();
      const existingCards = await db.cards.toArray();
      const cardMap = new Map(existingCards.map((c) => [c.itemId, c.fsrsCard.due]));
      const existingForConfusion = existingItems.map((i) => ({
        text: i.text,
        due: cardMap.get(i.id) ? new Date(cardMap.get(i.id)!) : new Date(),
      }));

      for (const item of pack.items) {
        const { item: studyItem, initialCard } = scheduleNewItem(
          item.text,
          "chunk",
          5,
          existingForConfusion,
          item.vi
        );
        await db.items.put(studyItem);

        const cards: StudyCard[] = [
          {
            id: `card-${studyItem.id}-recog`,
            itemId: studyItem.id,
            skill: "recognize",
            fsrsCard: initialCard,
          },
          {
            id: `card-${studyItem.id}-particle`,
            itemId: studyItem.id,
            skill: "particle",
            fsrsCard: initialCard,
          },
        ];
        await db.cards.bulkPut(cards);
      }

      setLearnedPacks((prev) => ({ ...prev, [pack.id]: true }));
      setPackNotice((prev) => ({
        ...prev,
        [pack.id]: `✓ Đã nạp thành công ${pack.items.length} cụm vào bộ đề ôn`,
      }));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Title */}
        <div className="card space-y-2 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <h1 className="text-2xl font-bold tracking-tight">
              Học theo Cụm & Tình huống
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Nguyên tắc 2: Đơn vị luyện là cụm và câu (vd: <span className="font-ja font-semibold text-text">電車に乗る</span> dạy cùng lúc 電車, 乗る và trợ từ に).
            Trợ từ được gạch chân để bạn chú ý ngữ cảnh và cấu trúc câu.
          </p>
        </div>

        {/* Packs list */}
        <div className="space-y-6">
          {PACKS.map((pack) => {
            const isLearned = learnedPacks[pack.id];
            const notice = packNotice[pack.id];

            return (
              <div key={pack.id} className="card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-accent">{pack.title}</h2>
                    <p className="text-xs text-muted">
                      {pack.kind === "story" ? "Chuỗi câu chuyện theo trình tự thời gian" : "Gói cụm tình huống liên quan"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLearnPack(pack)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      isLearned
                        ? "bg-green-brand/20 text-ok-ink border border-green-brand/40"
                        : "bg-accent text-accent-ink hover:opacity-90 shadow-sm"
                    }`}
                  >
                    {isLearned ? "✓ Đã nạp cả gói" : "＋ Học cả gói"}
                  </button>
                </div>

                {notice && (
                  <div className="text-xs text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
                    {notice}
                  </div>
                )}

                {/* Steps / Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pack.items.map((item, idx) => {
                    // Detect particles: に, を, が, へ, で
                    const parts = item.text.split(/([に乗をがへで])/);

                    return (
                      <div
                        key={item.text + idx}
                        className="rounded-xl border border-line bg-card/60 p-3 space-y-1 hover:border-accent/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted bg-unk-bg w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-ja text-base font-bold text-text">
                            {parts.map((p, pIdx) => {
                              const isParticle = ["に", "を", "が", "へ", "で"].includes(p);
                              return (
                                <span
                                  key={pIdx}
                                  className={isParticle ? "underline decoration-accent decoration-2 underline-offset-4 font-extrabold" : ""}
                                  title={isParticle ? `Trợ từ: ${p}` : undefined}
                                >
                                  {p}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted pl-7">{item.vi}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
