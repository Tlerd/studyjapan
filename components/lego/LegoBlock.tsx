"use client";

import React, { useState, useEffect } from "react";
import { components, assembleHint, type ComponentInfo } from "../../lib/components";
import { ComponentChip } from "./ComponentChip";

interface LegoBlockProps {
  kanji: string;
  hanViet?: string;
  meaning?: string;
}

export function LegoBlock({ kanji, hanViet, meaning }: LegoBlockProps) {
  const [comps, setComps] = useState<ComponentInfo[]>([]);
  const [hint, setHint] = useState<string>("");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    const list = components(kanji);
    setComps(list);
    setHint(assembleHint(kanji));

    // Load custom mnemonic from localStorage or generate default
    const saved = localStorage.getItem(`mnemonic-${kanji}`);
    if (saved) {
      setMnemonic(saved);
    } else {
      if (kanji === "泊") {
        setMnemonic(
          "Đi trọ qua đêm ở khách sạn, vừa bật vòi nước (氵) ra thì thấy nước đục ngầu trắng xóa (白)."
        );
      } else if (kanji === "学") {
        setMnemonic(
          "Dưới mái nhà (冖), đứa trẻ (子) chăm chỉ học hành để tỏa sáng ba tia lửa trí tuệ (⺍)."
        );
      } else {
        const partsText = list.map((c) => `${c.part} (${c.vi})`).join(" + ");
        setMnemonic(`Kết hợp ${partsText} để tạo nên nghĩa: ${meaning || hanViet || kanji}.`);
      }
    }
  }, [kanji, hanViet, meaning]);

  const handleSaveMnemonic = (text: string) => {
    setMnemonic(text);
    localStorage.setItem(`mnemonic-${kanji}`, text);
    setIsEditing(false);
  };

  if (comps.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-card/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
          <span>🧱</span>
          <span>Mảnh LEGO cấu thành ({comps.length} mảnh)</span>
        </h4>
        <span className="text-[11px] text-muted italic">Não chỉ cần lắp mảnh</span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {comps.map((c, idx) => (
          <React.Fragment key={c.part + idx}>
            <ComponentChip part={c.part} vi={c.vi} pos={c.pos} />
            {idx < comps.length - 1 && <span className="text-muted text-xs font-bold">+</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Assembly Hint */}
      <div className="rounded-lg bg-unk-bg/70 px-3 py-2 text-xs text-text border border-line/60">
        <span className="font-semibold text-accent">✍️ Khi viết: </span>
        <span className="font-medium">&quot;{hint}&quot;</span>
      </div>

      {/* 3-Second Visual Mnemonic */}
      <div className="rounded-lg bg-note-bg/40 border border-note-ink/20 p-3 text-xs space-y-1">
        <div className="flex items-center justify-between text-note-ink font-semibold">
          <span className="flex items-center gap-1">
            <span>🖼️</span>
            <span>Hình ảnh 3 giây (tự tham chiếu)</span>
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10px] underline hover:text-text cursor-pointer"
          >
            {isEditing ? "Hủy" : "Sửa chuyện của bạn"}
          </button>
        </div>

        {isEditing ? (
          <div className="pt-1 space-y-2">
            <textarea
              defaultValue={mnemonic}
              id={`edit-mnemonic-${kanji}`}
              className="w-full text-xs p-2 rounded border border-line bg-card text-text focus:outline-none focus:ring-1 focus:ring-accent"
              rows={2}
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(`edit-mnemonic-${kanji}`) as HTMLTextAreaElement;
                if (el) handleSaveMnemonic(el.value);
              }}
              className="px-2.5 py-1 text-xs rounded bg-accent text-accent-ink font-semibold"
            >
              Lưu chuyện
            </button>
          </div>
        ) : (
          <p className="text-muted italic leading-relaxed">{mnemonic}</p>
        )}
      </div>
    </div>
  );
}
