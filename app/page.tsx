"use client";

import React, { useState, useEffect, useMemo, useTransition, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as wanakana from "wanakana";
import { Navbar } from "../components/Navbar";
import { LevelPicker } from "../components/LevelPicker";
import { SpiderGraph } from "../components/graph/SpiderGraph";
import { DetailPanel } from "../components/graph/DetailPanel";
import { buildGraph, type GraphResult, type NodeData } from "../lib/graphBuilder";
import { type Level } from "../lib/level";
import kanjiData from "../public/kanji.json";
import wordsData from "../data/words.json";

function SpiderGraphContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const qParam = searchParams.get("q");
  const levelParam = searchParams.get("level");

  const initialWord = qParam?.trim() || "学";
  const [query, setQuery] = useState<string>(initialWord);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialWord);
  const [currentLevel, setCurrentLevel] = useState<Level>(() => {
    if (levelParam) {
      const parsed = parseInt(levelParam, 10);
      if (parsed >= 1 && parsed <= 5) return parsed as Level;
    }
    const kanjiDb = kanjiData as Record<string, any>;
    const wordsDb = wordsData as Record<string, any>;
    const itemLevel = kanjiDb[initialWord]?.jlpt || wordsDb[initialWord]?.jlpt;
    if (itemLevel && itemLevel >= 1 && itemLevel <= 5) {
      return itemLevel as Level;
    }
    return 5;
  });
  const [showHigherLevel, setShowHigherLevel] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([initialWord]);
  const [, startTransition] = useTransition();

  const lastSearchParamQ = useRef<string | null>(qParam);

  // Sync state whenever URL query params change (e.g. user clicked a Kanji link /?q=... or back/forward)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== lastSearchParamQ.current) {
      lastSearchParamQ.current = q;
      const target = q ? q.trim() : "学";
      setQuery(target);
      setDebouncedQuery(target);
      setBreadcrumbs((prev) => {
        if (prev.includes(target)) {
          return prev.slice(0, prev.indexOf(target) + 1);
        }
        return [...prev, target];
      });

      const kanjiDb = kanjiData as Record<string, any>;
      const wordsDb = wordsData as Record<string, any>;
      const itemLevel = kanjiDb[target]?.jlpt || wordsDb[target]?.jlpt;
      if (itemLevel && itemLevel >= 1 && itemLevel <= 5) {
        if (itemLevel < currentLevel) {
          setCurrentLevel(itemLevel as Level);
        }
      }
    }

    const lvl = searchParams.get("level");
    if (lvl) {
      const parsed = parseInt(lvl, 10);
      if (parsed >= 1 && parsed <= 5) {
        setCurrentLevel(parsed as Level);
      }
    }
  }, [searchParams, currentLevel]);

  // Debounce query 150ms
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(query);
      });
      // Synchronize URL search params when user types without adding history push entries
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const trimmed = query.trim();
        if (trimmed) {
          if (url.searchParams.get("q") !== trimmed) {
            url.searchParams.set("q", trimmed);
            window.history.replaceState(null, "", url.pathname + url.search);
          }
        } else {
          if (url.searchParams.has("q")) {
            url.searchParams.delete("q");
            window.history.replaceState(null, "", url.pathname + url.search);
          }
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Convert romaji to kana on the fly as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[a-zA-Z\s\-]+$/.test(val)) {
      setQuery(wanakana.toHiragana(val));
    } else {
      setQuery(val);
    }
  };

  // Build Graph
  const graphResult = useMemo<GraphResult | null>(() => {
    const q = debouncedQuery.trim();
    if (!q) return null;
    return buildGraph(q, {
      chosenLevel: currentLevel,
      showHigherLevel
    });
  }, [debouncedQuery, currentLevel, showHigherLevel]);

  // Set default selected node to center node
  useEffect(() => {
    if (graphResult?.centerNode) {
      setSelectedNode(graphResult.centerNode);
    }
  }, [graphResult]);

  // Navigate to new center node
  const handleCenterChange = (newCenter: string) => {
    lastSearchParamQ.current = newCenter;
    setQuery(newCenter);
    setDebouncedQuery(newCenter);
    setBreadcrumbs((prev) => {
      if (prev.includes(newCenter)) {
        return prev.slice(0, prev.indexOf(newCenter) + 1);
      }
      return [...prev, newCenter];
    });

    const kanjiDb = kanjiData as Record<string, any>;
    const wordsDb = wordsData as Record<string, any>;
    const itemLevel = kanjiDb[newCenter]?.jlpt || wordsDb[newCenter]?.jlpt;
    if (itemLevel && itemLevel >= 1 && itemLevel <= 5) {
      if (itemLevel < currentLevel) {
        setCurrentLevel(itemLevel as Level);
      }
    }

    router.push(`/?q=${encodeURIComponent(newCenter)}`, { scroll: false });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar currentLevel={currentLevel} onLevelChange={setCurrentLevel} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Top Control Bar: Search input & Level picker */}
        <section className="card flex flex-col md:flex-row items-center justify-between gap-3 p-3 sm:p-4">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Gõ Kanji, từ vựng, kana hoặc romaji (vd: 日, nihon, gakusei)..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-line bg-card focus:outline-none focus:ring-2 focus:ring-accent font-ja"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  lastSearchParamQ.current = "";
                  router.push("/", { scroll: false });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-text"
              >
                ✕
              </button>
            )}
          </div>

          {/* Level Picker */}
          <LevelPicker
            currentLevel={currentLevel}
            onChange={setCurrentLevel}
            showHigherLevel={showHigherLevel}
            onToggleHigherLevel={setShowHigherLevel}
          />
        </section>

        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 1 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted overflow-x-auto px-1">
            <span className="font-semibold text-text">Đường dẫn:</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb + idx}>
                <button
                  type="button"
                  onClick={() => handleCenterChange(crumb)}
                  className={`font-ja hover:text-accent ${
                    crumb === query ? "font-bold text-accent" : ""
                  }`}
                >
                  {crumb}
                </button>
                {idx < breadcrumbs.length - 1 && <span>›</span>}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* 2-Column Responsive Workspace: Graph + Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[560px]">
          {/* Graph View (Left 7-8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <SpiderGraph
              graphData={graphResult}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(n) => setSelectedNode(n)}
              onCenterChange={handleCenterChange}
            />
            <p className="text-[11px] text-muted text-center mt-2">
              💡 Bạn có thể kéo thả di chuyển các khối tự do trên màn hình. Bấm đúp vào bất kỳ nút nào để chọn làm tâm điểm mới.
            </p>
          </div>

          {/* Detail Panel (Right 4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 min-h-[400px]">
            <DetailPanel
              node={selectedNode}
              onSelectNode={handleCenterChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SpiderGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg text-text">
          <div className="text-center space-y-2">
            <span className="text-4xl animate-spin inline-block">🕸️</span>
            <p className="text-sm text-muted">Đang tải Mạng nhện...</p>
          </div>
        </div>
      }
    >
      <SpiderGraphContent />
    </Suspense>
  );
}
