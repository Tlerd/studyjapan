import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseFirestore } from "./firebase";
import {
  exportDatabaseToJson,
  mergeDatabaseFromJson,
  registerAutoSyncCallback,
  isAutoSyncSuppressed,
} from "./db";

export const DEFAULT_SHARED_KEY = "studyjapan_master";
const SYNC_KEY_STORAGE = "cloud_sync_key";
const AUTO_SYNC_STORAGE = "cloud_auto_sync";
const LAST_SYNC_STORAGE = "cloud_last_sync_time";
const DEVICE_ID_STORAGE = "cloud_device_id";

export function sanitizeKey(key: string): string {
  return (
    (key || DEFAULT_SHARED_KEY)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || DEFAULT_SHARED_KEY
  );
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_STORAGE);
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(DEVICE_ID_STORAGE, id);
  }
  return id;
}

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
  const clean = newKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || DEFAULT_SHARED_KEY;
  localStorage.setItem(SYNC_KEY_STORAGE, clean);
  window.dispatchEvent(new CustomEvent("studyjapan:key-changed", { detail: clean }));
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
 * Đẩy toàn bộ dữ liệu máy hiện tại lên Firebase Firestore
 */
export async function uploadCurrentDataToCloud(
  targetKey?: string
): Promise<{ success: boolean; message: string; lastUpdated?: string }> {
  const rawKey = targetKey || getOrCreateSyncKey();
  const key = sanitizeKey(rawKey);

  const jsonString = await exportDatabaseToJson();
  const parsed = JSON.parse(jsonString);
  const lastUpdated = new Date().toISOString();
  const deviceId = getOrCreateDeviceId();

  try {
    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, "sync_channels", key);
    await setDoc(docRef, {
      key,
      lastUpdated,
      deviceId,
      data: parsed.data,
      version: 2,
    });

    updateLastSyncTime();
    return {
      success: true,
      message: "Đã đồng bộ lên Firebase thành công.",
      lastUpdated,
    };
  } catch (err: any) {
    // Fallback: try Next.js /api/sync endpoint
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          data: parsed.data,
          lastUpdated,
          deviceId,
        }),
      });
      if (res.ok) {
        updateLastSyncTime();
        return {
          success: true,
          message: "Đã đồng bộ lên đám mây thành công.",
          lastUpdated,
        };
      }
    } catch {}
    throw new Error(err.message || "Lỗi khi tải dữ liệu lên Firebase.");
  }
}

/**
 * Tải dữ liệu từ Firebase Firestore về và hợp nhất (merge) vào IndexedDB
 */
export async function downloadAndMergeFromCloud(
  targetKey?: string
): Promise<{ success: boolean; message: string; mergedCount: number }> {
  const rawKey = targetKey || getOrCreateSyncKey();
  const key = sanitizeKey(rawKey);

  try {
    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, "sync_channels", key);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error(
        "Chưa có bản lưu nào trên đám mây. Đang khởi tạo bản lưu đầu tiên từ thiết bị..."
      );
    }

    const payload = snap.data();
    const mergeRes = await mergeDatabaseFromJson(payload as any);
    updateLastSyncTime();

    return {
      success: true,
      message: `Đã tự động đồng bộ thành công! (${mergeRes.mergedCount} mục)`,
      mergedCount: mergeRes.mergedCount,
    };
  } catch (err: any) {
    if (err.message?.includes("Chưa có bản lưu")) {
      throw err;
    }
    // Fallback: try Next.js /api/sync endpoint
    try {
      const res = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
      const resData = await res.json();
      if (res.ok && resData.success) {
        const mergeRes = await mergeDatabaseFromJson(resData);
        updateLastSyncTime();
        return {
          success: true,
          message: `Đã tự động đồng bộ thành công! (${mergeRes.mergedCount} mục)`,
          mergedCount: mergeRes.mergedCount,
        };
      }
    } catch {}
    throw new Error(err.message || "Lỗi khi tải dữ liệu từ đám mây.");
  }
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
 * Hook tự động đồng bộ thời gian thực qua Firebase:
 * 1. Tự động lắng nghe thay đổi thời gian thực qua Firestore onSnapshot (dưới 0.5s)
 * 2. Tự động kéo dữ liệu khi mở app
 * 3. Tự động kéo dữ liệu khi mở khóa điện thoại hoặc quay lại tab (focus / visibilitychange)
 */
export function useAutoSync(onSyncUpdate?: () => void) {
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeSyncKey, setActiveSyncKey] = useState<string>(() =>
    sanitizeKey(getOrCreateSyncKey())
  );

  useEffect(() => {
    const handleKeyChange = (e: any) => {
      setActiveSyncKey(sanitizeKey(e.detail || getOrCreateSyncKey()));
    };
    window.addEventListener("studyjapan:key-changed", handleKeyChange);
    return () => {
      window.removeEventListener("studyjapan:key-changed", handleKeyChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLastSyncTime(getLastSyncTime());
    const myDeviceId = getOrCreateDeviceId();
    const key = activeSyncKey;

    const performAutoPull = async () => {
      if (!isAutoSyncEnabled()) return;
      try {
        setSyncStatus("syncing");
        const res = await downloadAndMergeFromCloud(key);
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
            uploadCurrentDataToCloud(key).catch(() => {});
          }
          setSyncStatus("idle");
        }
      }
    };

    // 1. Initial sync on app load or key change
    performAutoPull();

    // 2. Real-time WebSocket sync via Firebase Firestore onSnapshot!
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const firestore = getFirebaseFirestore();
      const docRef = doc(firestore, "sync_channels", key);

      unsubscribeFirestore = onSnapshot(
        docRef,
        { includeMetadataChanges: false },
        async (docSnap) => {
          if (!docSnap.exists() || !isAutoSyncEnabled()) return;
          const remoteData = docSnap.data();

          // Ignore own changes from this device to prevent echo
          if (remoteData?.deviceId && remoteData.deviceId === myDeviceId) {
            return;
          }
          if (isAutoSyncSuppressed()) return;

          try {
            if (isMounted) setSyncStatus("syncing");
            const mergeRes = await mergeDatabaseFromJson(remoteData as any);
            updateLastSyncTime();
            if (isMounted) {
              setSyncStatus("synced");
              setLastSyncTime(getLastSyncTime());
              if (onSyncUpdate) {
                onSyncUpdate();
              }
            }
          } catch (e) {
            console.warn("Realtime sync merge error:", e);
            if (isMounted) setSyncStatus("idle");
          }
        },
        (error) => {
          console.warn("Firestore onSnapshot error:", error);
        }
      );
    } catch (e) {
      console.warn("Could not attach firestore listener:", e);
    }

    // 3. Sync on window focus
    const handleFocus = () => {
      performAutoPull();
    };

    // 4. Sync on mobile phone screen unlock / tab switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performAutoPull();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeSyncKey, onSyncUpdate]);

  return { syncStatus, lastSyncTime };
}
