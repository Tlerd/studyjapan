"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Navbar } from "../../../components/Navbar";
import { LegoBlock } from "../../../components/lego/LegoBlock";
import { assembleHint } from "../../../lib/components";
import kanjiData from "../../../public/kanji.json";
import { db } from "../../../lib/db";
import { reviewCard, Rating, type ReviewRating, type StudyCard } from "../../../lib/srs";

interface PageProps {
  params: Promise<{ kanji: string }>;
}

export default function KanjiWritingPracticePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawKanji = decodeURIComponent(resolvedParams.kanji);

  const [mode, setMode] = useState<"trace" | "memory">("trace");
  const [showHint, setShowHint] = useState<boolean>(false);
  const [svgContent, setSvgContent] = useState<string>("");
  const [ratingNotice, setRatingNotice] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokesHistory, setStrokesHistory] = useState<ImageData[]>([]);

  const kanjiDb = kanjiData as Record<string, any>;
  const kMeta = kanjiDb[rawKanji] || {
    hanViet: "HỌC",
    meaning: "Học tập",
    strokes: 8,
    jlpt: 5,
    on: [],
    kun: []
  };

  // Load SVG from public/kanjivg/{code}.svg
  useEffect(() => {
    const code = "0" + rawKanji.charCodeAt(0).toString(16);
    fetch(`/kanjivg/${code}.svg`)
      .then((res) => {
        if (res.ok) return res.text();
        throw new Error("SVG not found");
      })
      .then((text) => setSvgContent(text))
      .catch(() => setSvgContent(""));
  }, [rawKanji]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#2563eb"; // Accent blue ink
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save snapshot for undo
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokesHistory((prev) => [...prev, snapshot]);

    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleUndo = () => {
    if (strokesHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prevSnapshot = strokesHistory[strokesHistory.length - 1];
    ctx.putImageData(prevSnapshot, 0, 0);
    setStrokesHistory((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokesHistory([]);
  };

  // Text to speech (Web Speech API)
  const handleSpeak = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(rawKanji);
      u.lang = "ja-JP";
      window.speechSynthesis.speak(u);
    }
  };

  // Self assessment submission
  const handleSelfGrade = async (rating: ReviewRating) => {
    try {
      const cardId = `card-k-${rawKanji}-write`;
      const card = await db.cards.get(cardId);
      if (card) {
        const { updatedCard, todayAgain } = reviewCard(card.fsrsCard, rating);
        await db.cards.update(card.id, {
          fsrsCard: updatedCard,
          todayAgain,
          lastRating: rating
        });
      }
      const labels = ["", "Again", "Hard", "Good", "Easy"];
      setRatingNotice(`✓ Đã ghi nhận đánh giá: ${labels[rating]}`);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted flex items-center gap-1.5">
          <Link href="/" className="hover:text-accent">
            🕸️ Mạng nhện
          </Link>
          <span>›</span>
          <span className="text-text font-bold font-ja">{rawKanji}</span>
          <span>›</span>
          <span>✍️ Luyện viết</span>
        </nav>

        {/* Top Header Card */}
        <div className="card flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <span className="font-ja text-5xl font-extrabold text-accent bg-accent-soft/20 w-16 h-16 flex items-center justify-center rounded-2xl">
              {rawKanji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold uppercase">{kMeta.hanViet}</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-unk-bg text-muted">
                  N{kMeta.jlpt} · {kMeta.strokes} nét
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">{kMeta.meaning}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpeak}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-card hover:border-accent transition-colors flex items-center gap-1"
            >
              <span>🔊</span>
              <span>Đọc to</span>
            </button>

            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg border border-line bg-card p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode("trace")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === "trace" ? "bg-accent text-accent-ink" : "text-muted hover:text-text"
                }`}
              >
                Tô theo mẫu
              </button>
              <button
                type="button"
                onClick={() => setMode("memory")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === "memory" ? "bg-accent text-accent-ink" : "text-muted hover:text-text"
                }`}
              >
                Viết từ trí nhớ
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Canvas & Template */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Drawing Board */}
          <div className="card p-5 space-y-4 flex flex-col items-center">
            {/* Canvas Container with Template Overlay */}
            <div className="relative w-[320px] h-[320px] bg-card border-2 border-line rounded-2xl overflow-hidden shadow-inner touch-none">
              {/* Background Kanji Guide Grid */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Cross hair dashed lines */}
                <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-line/70" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-line/70" />
              </div>

              {/* Faint Template SVG (Hidden in Memory mode) */}
              {mode === "trace" && svgContent && (
                <div
                  className="absolute inset-0 p-4 opacity-25 pointer-events-none flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_path]:stroke-current text-slate-900 dark:text-slate-100"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              )}

              {/* Drawing Canvas */}
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute inset-0 z-10 cursor-crosshair"
              />
            </div>

            {/* Canvas Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-card hover:border-accent text-text transition-colors"
              >
                ↩ Hoàn tác nét
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line bg-card hover:border-accent text-text transition-colors"
              >
                🗑 Xóa bảng
              </button>
              {mode === "memory" && (
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  💡 {showHint ? "Ẩn gợi ý" : "Gợi ý lắp mảnh"}
                </button>
              )}
            </div>

            {showHint && mode === "memory" && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center w-full">
                {assembleHint(rawKanji)}
              </p>
            )}

            {/* Self Rating Bar */}
            <div className="w-full pt-4 border-t border-line space-y-2 text-center">
              <span className="text-xs text-muted block font-semibold uppercase">
                Tự chấm điểm sau khi viết
              </span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelfGrade(Rating.Again)}
                  className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-no-ink text-xs font-bold border border-red-500/30"
                >
                  Again (Sai)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfGrade(Rating.Hard)}
                  className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-yellow-700 text-xs font-bold border border-amber-500/30"
                >
                  Hard (Khó)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfGrade(Rating.Good)}
                  className="py-1.5 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-accent text-xs font-bold border border-blue-500/30"
                >
                  Good (Tốt)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfGrade(Rating.Easy)}
                  className="py-1.5 px-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-ok-ink text-xs font-bold border border-green-500/30"
                >
                  Easy (Dễ)
                </button>
              </div>

              {ratingNotice && (
                <p className="text-xs font-semibold text-green-600 pt-1">{ratingNotice}</p>
              )}
            </div>
          </div>

          {/* LEGO Assembly Breakdown */}
          <div className="space-y-4">
            <LegoBlock kanji={rawKanji} hanViet={kMeta.hanViet} meaning={kMeta.meaning} />

            <div className="card p-4 space-y-2 text-xs">
              <h3 className="font-bold text-sm text-text">Nguyên tắc nhớ nét chữ</h3>
              <p className="text-muted leading-relaxed">
                Khi bộ não đã ghi nhớ vị trí các mảnh LEGO (ví dụ: mảnh Nước bên trái, mảnh Trắng bên phải), bạn sẽ không bao giờ quên nét hoặc bị lẫn lộn giữa các chữ tương tự nhau.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
