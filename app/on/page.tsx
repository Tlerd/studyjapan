"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "../../components/Navbar";
import { SyncModal } from "../../components/SyncModal";
import { db, exportDatabaseToJson, importDatabaseFromJson } from "../../lib/db";
import { getDueCards, type StudyCard } from "../../lib/srs";
import { saveSyncKey, downloadAndMergeFromCloud } from "../../lib/syncEngine";

function DailyReviewDeckContent() {
  const searchParams = useSearchParams();
  const [dueCards, setDueCards] = useState<Array<StudyCard & { level: number; text?: string }>>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backupMsg, setBackupMsg] = useState<string>("");
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [autoSyncAlert, setAutoSyncAlert] = useState<string>("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allCards = await db.cards.toArray();
      const allItems = await db.items.toArray();
      setTotalItems(allItems.length);

      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      const cardsWithMeta = allCards.map((c) => {
        const item = itemMap.get(c.itemId);
        return {
          ...c,
          level: item?.level || 5,
          text: item?.text || c.itemId,
        };
      });

      const due = getDueCards(cardsWithMeta);
      setDueCards(due);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto connect / sync if QR code parameter is present (?sync_key=XXX&auto=1)
    const syncKeyParam = searchParams.get("sync_key");
    const autoParam = searchParams.get("auto");

    if (syncKeyParam) {
      saveSyncKey(syncKeyParam);
      if (autoParam === "1") {
        downloadAndMergeFromCloud(syncKeyParam)
          .then((res) => {
            setAutoSyncAlert(`🎉 Đã liên kết và đồng bộ thành công dữ liệu với mã ${syncKeyParam}! (${res.mergedCount} mục)`);
            loadData();
          })
          .catch((err) => {
            setAutoSyncAlert(`⚠️ Đã lưu mã đồng bộ ${syncKeyParam}, nhưng chưa tải được dữ liệu: ${err.message}`);
          });
      }
    }
  }, [searchParams]);

  const handleExport = async () => {
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kanji-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg("✓ Đã xuất file sao lưu JSON thành công!");
    } catch {
      setBackupMsg("❌ Lỗi khi xuất dữ liệu.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importDatabaseFromJson(text);
      setBackupMsg("✓ Đã phục hồi dữ liệu từ file JSON thành công! Đang tải lại...");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setBackupMsg("❌ File sao lưu không hợp lệ.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Auto Sync Banner Alert if navigated from QR code */}
        {autoSyncAlert && (
          <div className="p-4 rounded-xl border border-green bg-ok-bg text-ok-ink text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
            <span>{autoSyncAlert}</span>
            <button
              type="button"
              onClick={() => setAutoSyncAlert("")}
              className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/10"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Deck Overview Card */}
        <div className="card text-center p-8 space-y-4 relative overflow-hidden">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-soft text-accent text-3xl mb-2">
            🔔
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bộ đề ôn tập Hôm nay
          </h1>

          <p className="text-sm text-muted max-w-md mx-auto">
            Thuật toán FSRS tính toán chu kỳ giãn cách lý tưởng cho từng kỹ năng.
            Các thẻ sai sẽ quay lại ngay trong phiên hôm nay.
          </p>

          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl font-black text-accent">
                {isLoading ? "..." : dueCards.length}
              </span>
              <span className="text-xs text-muted font-medium uppercase mt-1 block">
                Thẻ đến hạn hôm nay
              </span>
            </div>
            <div className="h-10 w-px bg-line" />
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl font-black text-text">
                {isLoading ? "..." : totalItems}
              </span>
              <span className="text-xs text-muted font-medium uppercase mt-1 block">
                Mục trong kho học
              </span>
            </div>
          </div>

          <div>
            {dueCards.length > 0 ? (
              <Link
                href="/luyen"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-accent text-accent-ink text-base font-bold hover:opacity-90 shadow-lg shadow-accent/20 transition-all scale-100 hover:scale-105"
              >
                <span>🚀 Bắt đầu ôn tập ngay</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {dueCards.length} thẻ
                </span>
              </Link>
            ) : (
              <div className="space-y-2">
                <span className="inline-block px-4 py-2 rounded-xl bg-green-brand/20 text-ok-ink font-semibold text-sm">
                  🎉 Hoan hô! Bạn đã hoàn thành hết các thẻ đến hạn hôm nay.
                </span>
                <p className="text-xs text-muted">
                  Bạn có thể tìm kiếm từ mới trên <Link href="/" className="text-accent underline font-semibold">Mạng nhện</Link> hoặc vào <Link href="/cum" className="text-accent underline font-semibold">Cụm & Tình huống</Link> để nạp thêm thẻ mới.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Due Cards Preview */}
        {dueCards.length > 0 && (
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-bold text-muted uppercase tracking-wider">
              Danh sách thẻ đến hạn ({dueCards.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {dueCards.slice(0, 24).map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-line p-2 text-center bg-card/60"
                >
                  <span className="font-ja text-lg font-bold text-text block">
                    {c.text}
                  </span>
                  <span className="text-[10px] text-muted capitalize block">
                    {c.skill === "recognize" ? "Nhận ra" : c.skill === "recall" ? "Nhớ ra" : c.skill === "write" ? "Viết ra" : "Trợ từ"} · N{c.level}
                  </span>
                </div>
              ))}
            </div>
            {dueCards.length > 24 && (
              <p className="text-xs text-center text-muted italic">
                ...và {dueCards.length - 24} thẻ khác
              </p>
            )}
          </div>
        )}

        {/* Backup and Cloud Sync Section */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted uppercase tracking-wider">
              Đồng bộ & Sao lưu Dữ liệu
            </h2>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="text-accent font-bold text-xs hover:underline flex items-center gap-1"
            >
              <span>☁️</span>
              <span>Mở bảng Đồng bộ Đám mây</span>
            </button>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Dữ liệu học được lưu siêu tốc cục bộ trên thiết bị và có thể tự động đồng bộ thời gian thực giữa <strong>Máy tính và Điện thoại</strong> qua Đám mây (Mã PIN hoặc quét mã QR).
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-accent text-accent-ink hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>☁️</span>
              <span>Đồng bộ Đám mây (Mã / QR)</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-line bg-card hover:border-accent transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>Xuất JSON</span>
            </button>

            <label className="px-4 py-2 text-xs font-semibold rounded-lg border border-line bg-card hover:border-accent transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
              <span>📂</span>
              <span>Nhập JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          {backupMsg && (
            <p className="text-xs text-accent font-semibold pt-1">{backupMsg}</p>
          )}
        </div>
      </main>

      {/* Cloud Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncCompleted={loadData}
      />
    </div>
  );
}

export default function DailyReviewDeckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-muted">Đang tải dữ liệu...</div>}>
      <DailyReviewDeckContent />
    </Suspense>
  );
}
