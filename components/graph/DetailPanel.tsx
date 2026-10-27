"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { type NodeData } from "../../lib/graphBuilder";
import { Furigana } from "../Furigana";
import { LegoBlock } from "../lego/LegoBlock";
import { formatLevel } from "../../lib/level";
import { db } from "../../lib/db";
import { scheduleNewItem, type StudyCard } from "../../lib/srs";

interface DetailPanelProps {
  node: NodeData | null;
  onClose?: () => void;
  onSelectNode?: (label: string) => void;
}

export function DetailPanel({ node, onClose, onSelectNode }: DetailPanelProps) {
  const [isStudying, setIsStudying] = useState<boolean>(false);
  const [learningNotice, setLearningNotice] = useState<string>("");

  useEffect(() => {
    if (!node) return;
    setLearningNotice("");
    async function checkStatus() {
      const typeKey = node?.type === "kanji" ? "k" : "w";
      const existing = await db.items.get(`${typeKey}-${node?.label}`);
      setIsStudying(!!existing);
    }
    checkStatus();
  }, [node]);

  if (!node) {
    return (
      <div className="card h-full flex flex-col items-center justify-center p-8 text-center text-muted">
        <span className="text-4xl mb-3">🕸️</span>
        <p className="text-sm font-medium">Bấm vào một nút trên đồ thị để xem chi tiết.</p>
        <p className="text-xs text-muted/80 mt-1">Gõ kanji, từ vựng hoặc kana ở ô tìm kiếm bên trên.</p>
      </div>
    );
  }

  const handleToggleStudy = async () => {
    if (!node) return;
    const typeKey = node.type === "kanji" ? "kanji" : "word";
    const itemId = `${node.type === "kanji" ? "k" : "w"}-${node.label}`;

    if (isStudying) {
      await db.items.delete(itemId);
      await db.cards.where("itemId").equals(itemId).delete();
      setIsStudying(false);
      setLearningNotice("Đã bỏ khỏi danh sách học");
    } else {
      const existingItems = await db.items.toArray();
      const existingCards = await db.cards.toArray();
      const cardMap = new Map(existingCards.map(c => [c.itemId, c.fsrsCard.due]));

      const existingForConfusion = existingItems.map(i => ({
        text: i.text,
        due: cardMap.get(i.id) ? new Date(cardMap.get(i.id)!) : new Date()
      }));

      const { item, initialCard, notice } = scheduleNewItem(
        node.label,
        typeKey,
        node.level || 5,
        existingForConfusion,
        node.type === "kanji" ? node.hanViet : node.meaning
      );

      await db.items.put(item);

      // Create skill cards
      const newCards: StudyCard[] = [
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

      if (node.type === "kanji") {
        newCards.push({
          id: `card-${itemId}-write`,
          itemId: item.id,
          skill: "write",
          fsrsCard: initialCard
        });
      }

      await db.cards.bulkPut(newCards);
      setIsStudying(true);
      setLearningNotice(notice || "✓ Đã thêm vào bộ đề ôn tập");
    }
  };

  const isKanji = node.type === "kanji";

  return (
    <div className="card h-full flex flex-col overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-ja text-3xl font-bold tracking-tight text-accent">
              {node.label}
            </h2>
            {node.hanViet && (
              <span className="text-base font-bold text-text uppercase px-2 py-0.5 rounded bg-accent-soft/30">
                {node.hanViet}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            {formatLevel(node.level || 5, false)}
          </p>
        </div>

        {/* Action Button: Học */}
        <div className="flex items-center gap-2">
          {isKanji && (
            <Link
              href={`/viet/${encodeURIComponent(node.label)}`}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-accent text-accent hover:bg-accent-soft/20 transition-colors flex items-center gap-1"
            >
              <span>✍️</span>
              <span>Tập viết</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleToggleStudy}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              isStudying
                ? "bg-green-brand/20 text-ok-ink border border-green-brand/40"
                : "bg-accent text-accent-ink hover:opacity-90 shadow-sm"
            }`}
          >
            <span>{isStudying ? "✓" : "＋"}</span>
            <span>{isStudying ? "Đang học" : "Học"}</span>
          </button>
        </div>
      </div>

      {/* Notice after adding */}
      {learningNotice && (
        <div className="text-xs rounded-lg px-3 py-2 bg-note-bg/50 border border-note-ink/30 text-note-ink">
          {learningNotice}
        </div>
      )}

      {/* Kanji Details */}
      {isKanji && (
        <div className="space-y-3">
          {/* Readings */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-unk-bg/60 p-2 border border-line/60">
              <span className="text-muted block text-[10px] font-semibold uppercase">Âm On (Katakana)</span>
              <span className="font-ja font-semibold text-text text-sm">
                {node.on && node.on.length > 0 ? node.on.join(", ") : "–"}
              </span>
            </div>
            <div className="rounded-lg bg-unk-bg/60 p-2 border border-line/60">
              <span className="text-muted block text-[10px] font-semibold uppercase">Âm Kun (Hiragana)</span>
              <span className="font-ja font-semibold text-text text-sm">
                {node.kun && node.kun.length > 0 ? node.kun.join(", ") : "–"}
              </span>
            </div>
          </div>

          {/* Meaning */}
          {node.meaning && (
            <div className="text-xs">
              <span className="text-muted block text-[10px] font-semibold uppercase mb-0.5">Nghĩa</span>
              <p className="text-text font-medium leading-relaxed">{node.meaning}</p>
            </div>
          )}

          {/* LEGO Block */}
          <LegoBlock kanji={node.label} hanViet={node.hanViet} meaning={node.meaning} />
        </div>
      )}

      {/* Word Details */}
      {!isKanji && (
        <div className="space-y-3 text-xs">
          <div className="rounded-lg bg-unk-bg/60 p-3 border border-line/60 space-y-1">
            <span className="text-muted block text-[10px] font-semibold uppercase">Cách đọc & Furigana</span>
            <div className="font-ja text-lg font-bold text-text">
              <Furigana surface={node.label} reading={node.reading} />
            </div>
            {node.rank && (
              <p className="text-[11px] text-muted">
                Hạng tần suất: <span className="font-semibold text-text">#{node.rank}</span> / 25.000 từ phổ biến
              </p>
            )}
          </div>

          {node.meaning && (
            <div>
              <span className="text-muted block text-[10px] font-semibold uppercase mb-0.5">Ý nghĩa</span>
              <p className="text-text font-medium leading-relaxed">{node.meaning}</p>
            </div>
          )}

          {/* Example Sentence */}
          <div className="rounded-lg border border-line p-3 space-y-1 bg-card/40">
            <span className="text-muted block text-[10px] font-semibold uppercase">Câu ví dụ</span>
            <p className="font-ja text-sm font-semibold text-text">
              <Furigana surface={`${node.label}を勉強します。`} reading={`${node.reading || node.label}をべんきょうします。`} />
            </p>
            <p className="text-xs text-muted">Tôi đang học {node.label}.</p>
          </div>
        </div>
      )}
    </div>
  );
}
