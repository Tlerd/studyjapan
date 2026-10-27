"use client";

import React, { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // 1. Đọc theme từ localStorage, mặc định là "light" nếu chưa có hoặc là "system"
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
      if (saved !== "light") {
        localStorage.setItem("theme", "light");
      }
    }
  }, []);

  const handleSetTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  if (!mounted) {
    return (
      <div
        className="inline-flex items-center rounded-lg border border-line bg-card p-0.5 shadow-sm shrink-0"
        aria-label="Chọn giao diện sáng tối"
      >
        <span className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-accent text-accent-ink font-bold shadow-xs">
          ☀️
        </span>
        <span className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-muted">
          🌙
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-lg border border-line bg-card p-0.5 shadow-sm shrink-0"
      role="group"
      aria-label="Chọn giao diện sáng tối"
    >
      <button
        type="button"
        onClick={() => handleSetTheme("light")}
        title="Giao diện Sáng (mặc định)"
        aria-pressed={theme === "light"}
        className={`w-7 h-7 rounded-md transition-all flex items-center justify-center text-sm ${
          theme === "light"
            ? "bg-accent text-accent-ink font-bold shadow-xs"
            : "text-muted hover:text-text hover:bg-unk-bg"
        }`}
      >
        ☀️
      </button>

      <button
        type="button"
        onClick={() => handleSetTheme("dark")}
        title="Giao diện Tối"
        aria-pressed={theme === "dark"}
        className={`w-7 h-7 rounded-md transition-all flex items-center justify-center text-sm ${
          theme === "dark"
            ? "bg-accent text-accent-ink font-bold shadow-xs"
            : "text-muted hover:text-text hover:bg-unk-bg"
        }`}
      >
        🌙
      </button>
    </div>
  );
}
