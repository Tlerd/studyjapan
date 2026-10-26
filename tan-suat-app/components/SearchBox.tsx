"use client";

import React, { useState } from "react";

interface SearchBoxProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const SAMPLE_CHIPS = ["の", "食べる", "温泉", "おくじょう", "上着", "猫"];

export default function SearchBox({
  initialValue = "",
  onSearch,
  isLoading = false,
}: SearchBoxProps) {
  const [inputVal, setInputVal] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const handleChipClick = (word: string) => {
    setInputVal(word);
    onSearch(word);
  };

  return (
    <section className="card" aria-labelledby="t-search">
      <h2 id="t-search" className="text-lg font-bold text-text mb-1.5">
        Tra một từ
      </h2>
      <p className="text-sm text-muted mb-3.5">
        Gõ chữ Nhật (<span lang="ja">温泉</span>) hoặc cách đọc (
        <span lang="ja">おんせん</span>) rồi bấm Tra cứu.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label className="sr-only" htmlFor="word-input">
          Từ cần tra
        </label>
        <input
          id="word-input"
          name="word"
          lang="ja"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ví dụ: 温泉 hoặc おんせん"
          className="flex-1 min-w-0 text-base px-3.5 min-h-[48px] rounded-xl border border-line bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="font-bold text-sm min-h-[48px] px-4 rounded-xl bg-accent text-accent-ink hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {isLoading ? "Đang tải..." : "Tra cứu"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 items-center mt-3">
        <span className="text-xs text-muted mr-0.5">Thử nhanh:</span>
        {SAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            lang="ja"
            onClick={() => handleChipClick(chip)}
            className="text-sm min-h-[34px] px-3 rounded-full border border-chip-line bg-chip-bg text-text hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
    </section>
  );
}
