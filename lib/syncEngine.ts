import { exportDatabaseToJson, mergeDatabaseFromJson } from "./db";

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
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SYNC_KEY_STORAGE) || "";
}

export function getOrCreateSyncKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(SYNC_KEY_STORAGE);
  if (!key) {
    key = generateRandomSyncKey();
    localStorage.setItem(SYNC_KEY_STORAGE, key);
  }
  return key;
}

export function saveSyncKey(newKey: string): void {
  if (typeof window === "undefined") return;
  const clean = newKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  localStorage.setItem(SYNC_KEY_STORAGE, clean);
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
    timeStr || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
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
    throw new Error(resData.error || resData.message || "Lỗi khi tải dữ liệu lên đám mây.");
  }

  updateLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
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
  const key = targetKey || getStoredSyncKey();
  if (!key) {
    throw new Error("Chưa có mã đồng bộ (Sync Key).");
  }

  const res = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
  const resData = await res.json();

  if (!res.ok || !resData.success) {
    if (resData.notFound) {
      throw new Error("Chưa có bản lưu nào trên đám mây với mã này. Hãy bấm 'Tải lên đám mây' từ thiết bị chứa dữ liệu trước.");
    }
    throw new Error(resData.error || resData.message || "Lỗi khi tải dữ liệu từ đám mây.");
  }

  const mergeRes = await mergeDatabaseFromJson(resData);
  updateLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

  return {
    success: true,
    message: `Đã đồng bộ thành công! Hợp nhất ${mergeRes.mergedCount} mục từ đám mây.`,
    mergedCount: mergeRes.mergedCount,
  };
}

// Debounced auto-sync trigger
let autoSyncTimeout: NodeJS.Timeout | null = null;
export function triggerBackgroundAutoSync(): void {
  if (!isAutoSyncEnabled()) return;
  if (autoSyncTimeout) clearTimeout(autoSyncTimeout);

  autoSyncTimeout = setTimeout(async () => {
    try {
      const key = getStoredSyncKey();
      if (key) {
        await uploadCurrentDataToCloud(key);
      }
    } catch (e) {
      console.warn("Background auto-sync skipped:", e);
    }
  }, 4000); // Debounce 4s after user action
}
