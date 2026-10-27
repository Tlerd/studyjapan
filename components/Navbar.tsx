"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { db } from "../lib/db";
import { getDueCards } from "../lib/srs";
import { type Level } from "../lib/level";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  currentLevel?: Level;
  onLevelChange?: (level: Level) => void;
}

export function Navbar({ currentLevel = 5, onLevelChange }: NavbarProps) {
  const pathname = usePathname();
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    async function loadDueCount() {
      try {
        const allCards = await db.cards.toArray();
        const allItems = await db.items.toArray();
        const itemMap = new Map(allItems.map((i) => [i.id, i.level]));

        const cardsWithLevel = allCards.map((c) => ({
          ...c,
          level: itemMap.get(c.itemId) || 5,
        }));

        const due = getDueCards(cardsWithLevel);
        setDueCount(due.length);
      } catch {
        // Fallback for SSR or empty db
        setDueCount(0);
      }
    }
    loadDueCount();
    const interval = setInterval(loadDueCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: "/", label: "🕸️ Mạng nhện" },
    { href: "/cum", label: "💬 Cụm & Tình huống" },
    { href: "/on", label: "🔔 Bộ đề hôm nay", badge: dueCount },
    { href: "/luyen", label: "🎯 Luyện tập" },
    { href: "/bo", label: "🧱 Mảnh LEGO" },
    { href: `/cap/n${currentLevel}`, label: `📊 Cấp N${currentLevel}` },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-card/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight shrink-0">
          <span className="text-xl">🕸️</span>
          <span className="hidden sm:inline bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent">
            Kanji Mạng Nhện
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-accent-soft text-accent font-semibold"
                    : "text-muted hover:text-text hover:bg-unk-bg"
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-500 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
