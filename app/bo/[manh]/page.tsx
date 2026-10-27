"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "../../../components/Navbar";
import componentsVi from "../../../data/components-vi.json";
import kanjiData from "../../../public/kanji.json";
import { db } from "../../../lib/db";
import { scheduleNewItem, type StudyCard } from "../../../lib/srs";

interface PageProps {
  params: Promise<{ manh: string }>;
}

export default function SingleLegoPartPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawPart = decodeURIComponent(resolvedParams.manh);

  const [isStudying, setIsStudying] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");

  const partMeta = componentsVi.find((c) => c.part === rawPart) || {
    part: rawPart,
    vi: `Mảnh ${rawPart}`,
    hanViet: null,
    variantOf: null,
    hint: `Mảnh cấu thành ${rawPart}`,
    kanjiCount: 0,
    reviewed: false
  };

  // Find all kanji containing this part
  const kanjiDb = kanjiData as Record<string, any>;
  const containingKanji = Object.entries(kanjiDb).filter(([_, k]) =>
    k.components?.some((c: any) => c.part === rawPart)
  );

  // Group by level N5..N1
  const byLevel: Record<number, Array<{ char: string; hanViet: string; meaning: string }>> = {
    5: [],
    4: [],
    3: [],
    2: [],
    1: []
  };

  for (const [char, meta] of containingKanji) {
    const lvl = meta.jlpt || 5;
    if (byLevel[lvl]) {
      byLevel[lvl].push({
        char,
        hanViet: meta.hanViet || "",
        meaning: meta.meaning || ""
      });
    }
  }

  useEffect(() => {
    async function checkStatus() {
      const existing = await db.items.get(`c-${rawPart}`);
      setIsStudying(!!existing);
    }
    checkStatus();
  }, [rawPart]);

  const handleStudyPart = async () => {
    const itemId = `c-${rawPart}`;
    if (isStudying) {
      await db.items.delete(itemId);
      await db.cards.where("itemId").equals(itemId).delete();
      setIsStudying(false);
      setNotice("Đã bỏ khỏi danh sách ôn tập");
    } else {
      const { item, initialCard } = scheduleNewItem(rawPart, "component", 5);
      await db.items.put(item);
      const cards: StudyCard[] = [
        {
          id: `card-${itemId}-recog`,
          itemId: item.id,
          skill: "recognize",
          fsrsCard: initialCard
        },
        {
          id: `card-${itemId}-recall`,
          itemId: item.id,
          skill: "recall",
          fsrsCard: initialCard
        }
      ];
      await db.cards.bulkPut(cards);
      setIsStudying(true);
      setNotice("✓ Đã thêm mảnh này vào bộ đề hôm nay");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted flex items-center gap-1.5">
          <Link href="/bo" className="hover:text-accent">
            🧱 Bảng mảnh LEGO
          </Link>
          <span>›</span>
          <span className="text-text font-bold font-ja">{rawPart}</span>
        </nav>

        {/* Part Detail Card */}
        <div className="card flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
          <div className="flex items-center gap-5">
            <span className="font-ja text-6xl font-bold text-accent bg-accent-soft/20 p-4 rounded-2xl border border-accent/20">
              {rawPart}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{partMeta.vi}</h1>
                {partMeta.hanViet && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-unk-bg text-muted">
                    {partMeta.hanViet}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">{partMeta.hint}</p>
              {partMeta.variantOf && (
                <p className="text-xs text-accent">
                  Biến thể của: <span className="font-ja font-bold">{partMeta.variantOf}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleStudyPart}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
                isStudying
                  ? "bg-green-brand/20 text-ok-ink border border-green-brand/40"
                  : "bg-accent text-accent-ink hover:opacity-90"
              }`}
            >
              {isStudying ? "✓ Đang học mảnh này" : "＋ Học mảnh này"}
            </button>
            {notice && <span className="text-[11px] text-green-600">{notice}</span>}
          </div>
        </div>

        {/* Kanji containing this part grouped by Level */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold tracking-tight">
            Các Kanji chứa mảnh [{rawPart}] ({containingKanji.length} chữ)
          </h2>

          {[5, 4, 3, 2, 1].map((lvl) => {
            const list = byLevel[lvl];
            if (!list || list.length === 0) return null;

            return (
              <div key={lvl} className="card space-y-3 p-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="font-semibold text-sm text-accent flex items-center gap-2">
                    <span>Cấp N{lvl}</span>
                    <span className="text-xs text-muted font-normal">(cấp ước tính)</span>
                  </h3>
                  <span className="text-xs text-muted">{list.length} chữ</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {list.map((k) => (
                    <Link
                      key={k.char}
                      href={`/?q=${encodeURIComponent(k.char)}`}
                      className="p-2 rounded-lg border border-line hover:border-accent hover:bg-accent-soft/10 text-center transition-all group"
                    >
                      <span className="font-ja text-2xl font-bold text-text group-hover:text-accent">
                        {k.char}
                      </span>
                      <span className="block text-[11px] font-bold text-muted uppercase truncate">
                        {k.hanViet}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
