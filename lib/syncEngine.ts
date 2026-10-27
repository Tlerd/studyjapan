import { useState, useEffect } from "react";
import {
  exportDatabaseToJson,
  mergeDatabaseFromJson,
  registerAutoSyncCallback,
} from "./db";

export const DEFAULT_SHARED_KEY = "studyjapan_master";
const SYNC_KEY_STORAGE = "cloud_sync_key";
const AUTO_SYNC_STORAGE = "cloud_auto_sync";
const LAST_SYNC_STORAGE = "cloud_last_sync_time";

export function generateRandomSyncKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `JAP-${suffix}`;
}

export function getStoredSyncKey(): string {
  if (typeof window === "undefined") return DEFAULT_SHARED_KEY;
  return localStorage.getItem(SYNC_KEY_STORAGE) || DEFAULT_SHARED_KEY;
}

export function getOrCreateSyncKey(): string {
  if (typeof window === "undefined") return DEFAULT_SHARED_KEY;
  let key = localStorage.getItem(SYNC_KEY_STORAGE);
  if (!key) {
    key = DEFAULT_SHARED_KEY;
    localStorage.setItem(SYNC_KEY_STORAGE, key);
  }
  return key;
}

export function saveSyncKey(newKey: string): void {
  if (typeof window === "undefined") return;
  const clean = newKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  localStorage.setItem(SYNC_KEY_STORAGE, clean || DEFAULT_SHARED_KEY);
}

export function isAutoSyncEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTO_SYNC_STORAGE) !== "false";
}

export function setAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_SYNC_STORAGE, enabled ? "true" : "false");
}

export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_SYNC_STORAGE) || null;
}

export function updateLastSyncTime(timeStr?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LAST_SYNC_STORAGE,
    timeStr ||
      new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
  );
}

/**
 * Đẩy toàn bộ dữ liệu máy hiện tại lên Đám mây
 */
export async function uploadCurrentDataToCloud(
  targetKey?: string
): Promise<{ success: boolean; message: string; lastUpdated?: string }> {
  const key = targetKey || getOrCreateSyncKey();
  if (!key) {
    throw new Error("Chưa có mã đồng bộ (Sync Key).");
  }

  const jsonString = await exportDatabaseToJson();
  const parsed = JSON.parse(jsonString);
  const lastUpdated = new Date().toISOString();

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      data: parsed.data,
      lastUpdated,
    }),
  });

  const resData = await res.json();
  if (!res.ok || !resData.success) {
    throw new Error(
      resData.error || resData.message || "Lỗi khi tải dữ liệu lên đám mây."
    );
  }

  updateLastSyncTime();
  return {
    success: true,
    message: resData.message || "Đã đồng bộ lên đám mây thành công.",
    lastUpdated,
  };
}

/**
 * Tải dữ liệu từ đám mây về và hợp nhất (merge) vào cơ sở dữ liệu trên máy
 */
export async function downloadAndMergeFromCloud(
  targetKey?: string
): Promise<{ success: boolean; message: string; mergedCount: number }> {
  const key = targetKey || getOrCreateSyncKey();
  if (!key) {
    throw new Error("Chưa có mã đồng bộ (Sync Key).");
  }

  const res = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
  const resData = await res.json();

  if (!res.ok || !resData.success) {
    if (resData.notFound) {
      throw new Error(
        "Chưa có bản lưu nào trên đám mây. Đang khởi tạo bản lưu đầu tiên từ thiết bị..."
      );
    }
    throw new Error(
      resData.error || resData.message || "Lỗi khi tải dữ liệu từ đám mây."
    );
  }

  const mergeRes = await mergeDatabaseFromJson(resData);
  updateLastSyncTime();

  return {
    success: true,
    message: `Đã tự động đồng bộ thành công! (${mergeRes.mergedCount} mục)`,
    mergedCount: mergeRes.mergedCount,
  };
}

// Debounced background auto-sync trigger
let autoSyncTimeout: NodeJS.Timeout | null = null;
export function triggerBackgroundAutoSync(): void {
  if (!isAutoSyncEnabled()) return;
  if (autoSyncTimeout) clearTimeout(autoSyncTimeout);

  autoSyncTimeout = setTimeout(async () => {
    try {
      const key = getOrCreateSyncKey();
      if (key) {
        await uploadCurrentDataToCloud(key);
      }
    } catch (e) {
      console.warn("Background auto-sync skipped:", e);
    }
  }, 2500); // 2.5s debounce
}

// Register Dexie database change listener for automatic background sync
if (typeof window !== "undefined") {
  registerAutoSyncCallback(triggerBackgroundAutoSync);
}

/**
 * Hook tự động đồng bộ thời gian thực:
 * 1. Tự động kéo dữ liệu khi mở app
 * 2. Tự động kéo dữ liệu khi mở khóa điện thoại hoặc quay lại tab (focus / visibilitychange)
 * 3. Tự động thăm dò định kỳ
 */
export function useAutoSync(onSyncUpdate?: () => void) {
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLastSyncTime(getLastSyncTime());

    const performAutoPull = async () => {
      if (!isAutoSyncEnabled()) return;
      try {
        setSyncStatus("syncing");
        const res = await downloadAndMergeFromCloud();
        if (isMounted) {
          setSyncStatus("synced");
          setLastSyncTime(getLastSyncTime());
          if (res.mergedCount > 0 && onSyncUpdate) {
            onSyncUpdate();
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // If cloud has no record yet, upload current local state to initialize it!
          if (
            err.message?.includes("Chưa có bản lưu") ||
            err.message?.includes("khởi tạo")
          ) {
            uploadCurrentDataToCloud().catch(() => {});
          }
          setSyncStatus("idle");
        }
      }
    };

    // 1. Initial sync on app load
    performAutoPull();

    // 2. Sync on window focus
    const handleFocus = () => {
      performAutoPull();
    };

    // 3. Sync on mobile phone screen unlock / tab switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performAutoPull();
      }
    };

    // 4. Periodic sync every 40 seconds
    const interval = setInterval(performAutoPull, 40000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { syncStatus, lastSyncTime };
}
