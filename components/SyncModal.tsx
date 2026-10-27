"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  DEFAULT_SHARED_KEY,
  getOrCreateSyncKey,
  saveSyncKey,
  generateRandomSyncKey,
  uploadCurrentDataToCloud,
  downloadAndMergeFromCloud,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  getLastSyncTime,
} from "../lib/syncEngine";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted?: () => void;
}

export function SyncModal({ isOpen, onClose, onSyncCompleted }: SyncModalProps) {
  const [syncKey, setSyncKey] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = getOrCreateSyncKey();
      setSyncKey(current);
      setInputKey(current);
      setAutoSync(isAutoSyncEnabled());
      setLastSync(getLastSyncTime());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://tan-suat-app.vercel.app";
  const syncUrl = `${currentOrigin}/on?sync_key=${encodeURIComponent(syncKey)}&auto=1`;

  const handleUpload = async () => {
    setLoading(true);
    setStatusMessage({ type: "info", text: "Đang tải toàn bộ dữ liệu lên Firebase..." });
    try {
      const res = await uploadCurrentDataToCloud(syncKey);
      setStatusMessage({ type: "success", text: res.message });
      setLastSync(getLastSyncTime());
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Không thể tải lên Firebase." });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setStatusMessage({ type: "info", text: "Đang tải và hợp nhất dữ liệu từ Firebase..." });
    try {
      const res = await downloadAndMergeFromCloud(syncKey);
      setStatusMessage({ type: "success", text: res.message });
      setLastSync(getLastSyncTime());
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Không thể tải về từ Firebase." });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomKey = async () => {
    const clean = inputKey.trim().toUpperCase();
    if (!clean) return;
    saveSyncKey(clean);
    setSyncKey(clean);
    setIsEditingKey(false);
    setStatusMessage({ type: "info", text: `Đã đổi sang kênh: ${clean}. Đang hợp nhất dữ liệu...` });
    try {
      const res = await downloadAndMergeFromCloud(clean);
      setStatusMessage({ type: "success", text: `Đã kết nối kênh ${clean}: ${res.message}` });
      setLastSync(getLastSyncTime());
      if (onSyncCompleted) onSyncCompleted();
    } catch {
      setStatusMessage({ type: "info", text: `Đã chuyển sang kênh: ${clean}` });
    }
  };

  const handleSetDefaultKey = async () => {
    saveSyncKey(DEFAULT_SHARED_KEY);
    setSyncKey(DEFAULT_SHARED_KEY);
    setInputKey(DEFAULT_SHARED_KEY);
    setIsEditingKey(false);
    setStatusMessage({ type: "info", text: "Đang chuyển sang kênh chung (studyjapan_master)..." });
    try {
      const res = await downloadAndMergeFromCloud(DEFAULT_SHARED_KEY);
      setStatusMessage({ type: "success", text: `Đã kết nối kênh chung: ${res.message}` });
      setLastSync(getLastSyncTime());
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Lỗi khi tải dữ liệu." });
    }
  };

  const handleGenerateNewKey = () => {
    const newK = generateRandomSyncKey();
    setInputKey(newK);
    saveSyncKey(newK);
    setSyncKey(newK);
    setIsEditingKey(false);
    setStatusMessage({ type: "info", text: `Đã tạo mã kênh mới: ${newK}` });
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    setAutoSyncEnabled(enabled);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex min-h-full items-start sm:items-center justify-center animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg my-auto sm:my-6 rounded-2xl border border-line bg-card shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-text">Đồng bộ Máy tính & Điện thoại</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  🔥 Firebase Realtime
                </span>
              </div>
              <p className="text-xs text-muted">Tự động đồng bộ thời gian thực hai chiều</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-unk-bg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sync Key Display / Edit */}
        <div className="p-3.5 rounded-xl border border-line bg-unk-bg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text">Kênh Đồng bộ (Sync Key):</span>
            {!isEditingKey ? (
              <button
                type="button"
                onClick={() => setIsEditingKey(true)}
                className="text-accent hover:underline font-medium text-[11px]"
              >
                ✏️ Đổi kênh khác
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerateNewKey}
                className="text-accent hover:underline font-medium text-[11px]"
              >
                🎲 Tạo ngẫu nhiên
              </button>
            )}
          </div>

          {!isEditingKey ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 bg-card p-2 rounded-lg border border-line">
                <span className="font-mono text-sm sm:text-base font-bold tracking-widest text-accent truncate">
                  {syncKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 px-2.5 py-1 rounded bg-accent-soft text-accent text-xs font-semibold hover:opacity-80 transition-all flex items-center gap-1"
                >
                  {copied ? "✓ Đã chép link" : "📋 Sao chép link"}
                </button>
              </div>

              {syncKey.toLowerCase() !== DEFAULT_SHARED_KEY.toLowerCase() && (
                <button
                  type="button"
                  onClick={handleSetDefaultKey}
                  className="w-full py-1 text-center text-xs text-accent hover:underline bg-accent/5 rounded-lg border border-accent/20 transition-colors"
                >
                  🔗 Dùng chung kênh mặc định ({DEFAULT_SHARED_KEY})
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                placeholder="Nhập mã (vd: JAP-K9KD hoặc tên bạn)"
                className="flex-1 p-2 rounded-lg border border-line bg-card font-mono text-sm uppercase"
              />
              <button
                type="button"
                onClick={handleSaveCustomKey}
                className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink font-bold text-xs"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputKey(syncKey);
                  setIsEditingKey(false);
                }}
                className="px-2 py-1.5 rounded-lg border border-line text-xs"
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        {/* QR Code Section for Phone Scan */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-line bg-card">
          <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs shrink-0">
            <QRCodeSVG value={syncUrl} size={110} level="M" />
          </div>
          <div className="space-y-1.5 text-center sm:text-left text-xs">
            <p className="font-bold text-text text-sm">📱 Quét mã bằng Điện thoại</p>
            <p className="text-muted leading-relaxed">
              Mở camera trên điện thoại (hoặc Zalo / trình duyệt) để quét mã QR này. Điện thoại sẽ tự động mở trang web và liên kết ngay với máy tính.
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-accent underline text-xs font-medium block pt-1"
            >
              {copied ? "Đã sao chép link đồng bộ!" : "Hoặc bấm vào đây để sao chép link"}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="p-3 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:opacity-90 transition-all flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
          >
            <span className="text-base">⬆️</span>
            <span>Tải lên Firebase</span>
            <span className="text-[10px] font-normal opacity-90">(Đẩy dữ liệu máy này lên)</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="p-3 rounded-xl border-2 border-accent text-accent font-bold text-xs hover:bg-accent-soft transition-all flex flex-col items-center justify-center gap-1 shadow-xs disabled:opacity-50"
          >
            <span className="text-base">⬇️</span>
            <span>Tải về Thiết bị</span>
            <span className="text-[10px] font-normal opacity-90">(Gộp dữ liệu từ Firebase)</span>
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium ${
              statusMessage.type === "success"
                ? "bg-ok-bg text-ok-ink border border-green"
                : statusMessage.type === "error"
                ? "bg-no-bg text-no-ink border border-red-400"
                : "bg-accent-soft text-accent border border-accent/30"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Auto Sync Toggle & Last Synced Info */}
        <div className="pt-2 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => handleToggleAutoSync(e.target.checked)}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <span>Tự động đồng bộ ngầm khi có thay đổi</span>
          </label>

          {lastSync && (
            <span className="text-[11px] font-mono text-muted">
              Đồng bộ gần nhất: {lastSync}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
