"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import componentsVi from "../../data/components-vi.json";

export default function LegoPartsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return componentsVi;
    return componentsVi.filter(
      (c) =>
        c.part.includes(q) ||
        c.vi.toLowerCase().includes(q) ||
        (c.hanViet && c.hanViet.toLowerCase().includes(q))
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧱</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Bảng Mảnh LEGO Kanji (Bộ thủ & Cấu thành)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Kanji không phải một chữ phức tạp vẽ liền một mạch, mà là tập hợp các mảnh LEGO lắp ghép lại.
            Nắm chắc ~250 mảnh này, bạn sẽ nhận diện và ghi nhớ hơn 2.000 Kanji một cách tự nhiên.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mảnh theo hình dạng, tên tiếng Việt, Hán Việt..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-line bg-card focus:outline-none focus:ring-2 focus:ring-accent font-ja"
            />
          </div>
        </div>

        {/* Grid of Parts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((item) => (
            <Link
              key={item.part}
              href={`/bo/${encodeURIComponent(item.part)}`}
              className="card hover:border-accent hover:shadow-md transition-all p-3 flex flex-col items-center text-center group"
            >
              <span className="font-ja text-3xl font-bold text-accent group-hover:scale-110 transition-transform">
                {item.part}
              </span>
              <span className="text-sm font-semibold text-text mt-1">
                {item.vi}
              </span>
              {item.hanViet && (
                <span className="text-[11px] text-muted">
                  {item.hanViet}
                </span>
              )}
              <span className="mt-2 text-[10px] text-muted bg-unk-bg px-2 py-0.5 rounded-full">
                {item.kanjiCount} chữ chứa mảnh
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
