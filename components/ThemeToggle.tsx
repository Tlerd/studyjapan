"use client";

import React, { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    // 1. Read initial theme from localStorage
    const saved = localStorage.getItem("theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      setTheme("system");
      document.documentElement.removeAttribute("data-theme");
    }

    // 2. Listen to system preference changes when in system mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = localStorage.getItem("theme");
      if (!current || current === "system") {
        document.documentElement.removeAttribute("data-theme");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleSetTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    if (newTheme === "system") {
      localStorage.removeItem("theme");
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem("theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-lg border border-line bg-card p-0.5 text-xs shadow-sm shrink-0"
      role="group"
      aria-label="Chọn giao diện sáng tối"
    >
      <button
        type="button"
        onClick={() => handleSetTheme("light")}
        title="Giao diện sáng"
        aria-pressed={theme === "light"}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
          theme === "light"
            ? "bg-accent text-accent-ink font-bold shadow-sm"
            : "text-muted hover:text-text hover:bg-unk-bg"
        }`}
      >
        <span className="text-sm leading-none">☀️</span>
        <span className="hidden md:inline text-[11px]">Sáng</span>
      </button>

      <button
        type="button"
        onClick={() => handleSetTheme("dark")}
        title="Giao diện tối"
        aria-pressed={theme === "dark"}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
          theme === "dark"
            ? "bg-accent text-accent-ink font-bold shadow-sm"
            : "text-muted hover:text-text hover:bg-unk-bg"
        }`}
      >
        <span className="text-sm leading-none">🌙</span>
        <span className="hidden md:inline text-[11px]">Tối</span>
      </button>

      <button
        type="button"
        onClick={() => handleSetTheme("system")}
        title="Theo hệ thống"
        aria-pressed={theme === "system"}
        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
          theme === "system"
            ? "bg-accent text-accent-ink font-bold shadow-sm"
            : "text-muted hover:text-text hover:bg-unk-bg"
        }`}
      >
        <span className="text-sm leading-none">💻</span>
        <span className="hidden md:inline text-[11px]">Tự động</span>
      </button>
    </div>
  );
}
