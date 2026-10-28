"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "../../components/Navbar";
import {
  db,
  computeImageHash,
  computeTextHash,
  pushScannedItemToMainDeck,
  createScannedCards,
  type ScanSource,
  type ScannedItem,
  type ExerciseItem,
  type ChatMessage,
  type CustomSkill,
  type ScannedCard,
} from "../../lib/db";
import {
  DEFAULT_SYSTEM_INSTRUCTIONS,
  BUILTIN_SKILLS,
  extractInvokedSkills,
  type SkillItem,
} from "../../lib/scanDefaults";
import {
  generateScanQuizBatch,
  type ScanQuizQuestion,
} from "../../lib/scanQuiz";
import { reviewCard, Rating, type ReviewRating } from "../../lib/srs";
import { triggerBackgroundAutoSync } from "../../lib/syncEngine";

type SidebarTab = "scan" | "exercises" | "words" | "grammar" | "review";

interface ScannedWordMeta {
  surface: string;
  reading?: string;
  hanViet?: string;
  meaning?: string;
  level?: number;
  contextSentence?: string;
}

interface ScannedGrammarMeta {
  pattern: string;
  formation?: string;
  meaning?: string;
  explanation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  level?: number;
}

interface MentionState {
  active: boolean;
  trigger: "@" | "/" | null;
  query: string;
  startIndex: number;
  selectedIndex: number;
  targetField: "scanText" | "chatText" | null;
}

/**
 * Thu nhỏ ảnh trên trình duyệt (tối đa 1600px, JPEG 0.85) để gửi API nhanh và nhẹ
 */
async function compressImageDataUrl(dataUrl: string, maxDim = 1600): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ base64: compressedUrl, mimeType: "image/jpeg" });
      } else {
        resolve({ base64: dataUrl, mimeType: "image/jpeg" });
      }
    };
    img.onerror = () => resolve({ base64: dataUrl, mimeType: "image/jpeg" });
    img.src = dataUrl;
  });
}

function renderChatMessageContent(content: string) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Check for bullet line with colon: e.g. "o 会議（かいぎ）: Cuộc họp" or "• 会議: Cuộc họp" or "1. 会議: Cuộc họp"
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0 && colonIdx < 120) {
          const leftPart = trimmed.substring(0, colonIdx).trim();
          const rightPart = trimmed.substring(colonIdx + 1).trim();

          const bulletMatch = leftPart.match(/^([•\-\*o]|\d+[\.\)])\s*(.*)$/);
          const bullet = bulletMatch ? bulletMatch[1] : null;
          const jpPart = bulletMatch ? bulletMatch[2] : leftPart;

          return (
            <div key={idx} className="flex items-start gap-1.5 leading-relaxed text-xs sm:text-sm py-0.5">
              <span className="text-accent font-bold select-none shrink-0 text-sm">
                {bullet || "•"}
              </span>
              <div className="flex-1">
                <strong className="font-ja text-text font-bold text-[13px] sm:text-sm">{jpPart}</strong>
                <span className="text-muted mx-1">:</span>
                <span className="text-text">{rightPart}</span>
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function renderBilingualContent(scanResult: {
  rawText?: string;
  translatedText?: string;
  words?: Array<{ surface: string; reading?: string; hanViet?: string; meaning?: string; contextSentence?: string }>;
  grammar?: Array<{ pattern: string; formation?: string; meaning?: string; explanation?: string }>;
}) {
  const transText = (scanResult.translatedText || "").trim();

  // 1. If translatedText already has formatted line-by-line with ":"
  const lines = transText.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasLineByLine = lines.length > 1 && lines.some((l) => l.includes(":") && l.indexOf(":") < 80);

  if (hasLineByLine) {
    return (
      <div className="space-y-1.5 bg-unk-bg/40 p-3 sm:p-4 rounded-xl border border-line divide-y divide-line/40">
        {lines.map((line, idx) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0 && colonIdx < 100) {
            const leftPart = line.substring(0, colonIdx).trim();
            const rightPart = line.substring(colonIdx + 1).trim();
            const bulletMatch = leftPart.match(/^([•\-\*o]|\d+[\.\)])\s*(.*)$/);
            const bullet = bulletMatch ? bulletMatch[1] : "•";
            const jpPart = bulletMatch ? bulletMatch[2] : leftPart;

            return (
              <div key={idx} className="flex items-start gap-2 pt-1.5 first:pt-0 text-xs sm:text-sm leading-relaxed">
                <span className="text-accent font-bold select-none shrink-0 text-sm">{bullet}</span>
                <div className="flex-1">
                  <strong className="font-ja text-text font-bold text-[13px] sm:text-sm">{jpPart}</strong>
                  <span className="text-muted mx-1.5">:</span>
                  <span className="text-text">{rightPart}</span>
                </div>
              </div>
            );
          }
          return (
            <p key={idx} className="text-xs sm:text-sm text-text pt-1.5 first:pt-0 font-medium leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  }

  // 2. If translatedText is a continuous block, but we have extracted words/grammar
  if (scanResult.words && scanResult.words.length > 0) {
    return (
      <div className="space-y-1.5 bg-unk-bg/40 p-3 sm:p-4 rounded-xl border border-line divide-y divide-line/40">
        {scanResult.words.map((w, idx) => (
          <div key={idx} className="flex items-start gap-2 pt-1.5 first:pt-0 text-xs sm:text-sm leading-relaxed">
            <span className="text-accent font-bold select-none shrink-0 text-sm">•</span>
            <div className="flex-1">
              <strong className="font-ja text-text font-bold text-[13px] sm:text-sm">
                {w.surface}
                {w.reading && w.reading !== w.surface && (
                  <span className="text-xs font-normal text-muted ml-1">（{w.reading}）</span>
                )}
                {w.hanViet && (
                  <span className="text-[10px] font-mono text-purple-600 bg-purple-500/10 px-1 py-0.2 rounded ml-1.5">
                    {w.hanViet}
                  </span>
                )}
              </strong>
              <span className="text-muted mx-1.5">:</span>
              <span className="text-text font-medium">{w.meaning || "Chưa có nghĩa"}</span>
              {w.contextSentence && (
                <span className="block text-[11px] text-muted font-ja italic mt-0.5">
                  Ví dụ: {w.contextSentence}
                </span>
              )}
            </div>
          </div>
        ))}

        {scanResult.grammar && scanResult.grammar.length > 0 && (
          <div className="pt-2 space-y-1.5">
            <span className="text-[11px] font-bold text-accent uppercase block">Cấu trúc ngữ pháp:</span>
            {scanResult.grammar.map((g, idx) => (
              <div key={`g-${idx}`} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed">
                <span className="text-blue-500 font-bold select-none shrink-0 text-sm">📐</span>
                <div className="flex-1">
                  <strong className="font-ja text-text font-bold text-[13px] sm:text-sm">{g.pattern}</strong>
                  {g.formation && <span className="text-xs text-muted ml-1 font-mono">[{g.formation}]</span>}
                  <span className="text-muted mx-1.5">:</span>
                  <span className="text-text font-medium">{g.meaning}</span>
                  {g.explanation && <span className="block text-[11px] text-muted mt-0.5">{g.explanation}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Fallback: raw translation text
  return (
    <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap bg-unk-bg/50 p-3 rounded-xl border border-line">
      {transText || "Chưa có bản dịch."}
    </p>
  );
}

export default function ScanAndReviewPage() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("scan");
  const [transViewMode, setTransViewMode] = useState<"bilingual" | "raw" | "vi">("bilingual");

  // AI Configuration State
  const [selectedModel, setSelectedModel] = useState<string>("Gemini 3.8 Flash");
  const [selectedEffort, setSelectedEffort] = useState<"low" | "medium" | "high">("medium");
  const [systemInstructions, setSystemInstructions] = useState<string>(DEFAULT_SYSTEM_INSTRUCTIONS);
  const [showInstructionModal, setShowInstructionModal] = useState<boolean>(false);

  // Unified Skills Management State
  const [allSkills, setAllSkills] = useState<SkillItem[]>([]);
  const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);
  const [isAddingNewSkill, setIsAddingNewSkill] = useState<boolean>(false);
  const [newSkillTitle, setNewSkillTitle] = useState<string>("");
  const [newSkillSlug, setNewSkillSlug] = useState<string>("");
  const [newSkillIcon, setNewSkillIcon] = useState<string>("✨");
  const [newSkillPrompt, setNewSkillPrompt] = useState<string>("");

  // Mention State for @ and /
  const [mentionState, setMentionState] = useState<MentionState>({
    active: false,
    trigger: null,
    query: "",
    startIndex: 0,
    selectedIndex: 0,
    targetField: null,
  });

  // Scan & Input State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHashCurrent, setImageHashCurrent] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanTitle, setScanTitle] = useState<string>("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [existingScanMatch, setExistingScanMatch] = useState<ScanSource | null>(null);
  const [isDuplicateSaveBlocked, setIsDuplicateSaveBlocked] = useState<boolean>(false);

  // Result & Active Scan State
  const [currentScanResult, setCurrentScanResult] = useState<{
    id: string;
    rawText: string;
    translatedText: string;
    exercises: ExerciseItem[];
    words: ScannedWordMeta[];
    grammar: ScannedGrammarMeta[];
    isAlreadySaved?: boolean;
  } | null>(null);
  const [selectedWordsToSave, setSelectedWordsToSave] = useState<Set<string>>(new Set());
  const [selectedGrammarToSave, setSelectedGrammarToSave] = useState<Set<string>>(new Set());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);

  // Vault & Database State
  const [allScanSources, setAllScanSources] = useState<ScanSource[]>([]);
  const [allScannedItems, setAllScannedItems] = useState<ScannedItem[]>([]);
  const [allScannedCards, setAllScannedCards] = useState<ScannedCard[]>([]);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionNotice, setActionNotice] = useState<string>("");

  // Review Quiz State
  const [quizQuestions, setQuizQuestions] = useState<ScanQuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [quizIsAnswered, setQuizIsAnswered] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [reviewScope, setReviewScope] = useState<"all" | "words" | "grammar">("all");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Load Initial Data from Dexie
  const loadDatabaseData = useCallback(async () => {
    try {
      const sources = await db.scanSources.reverse().toArray();
      const items = await db.scannedItems.reverse().toArray();
      const cards = await db.scannedCards.toArray();
      const settings = await db.aiSettings.get("gemini-config");

      // Load skills from DB, seed if empty
      let skills = await db.customSkills.toArray();
      const initialized = localStorage.getItem("skills_initialized_v2");
      if (skills.length === 0 && !initialized) {
        await db.customSkills.bulkAdd(
          BUILTIN_SKILLS.map((s) => ({
            id: s.id,
            slug: s.slug,
            icon: s.icon,
            title: s.title,
            prompt: s.prompt,
            isDefault: true,
          }))
        );
        localStorage.setItem("skills_initialized_v2", "true");
        skills = await db.customSkills.toArray();
      }

      setAllSkills(
        skills.map((s) => ({
          id: s.id,
          slug: s.slug || s.id,
          icon: s.icon || "✨",
          title: s.title,
          prompt: s.prompt,
          isDefault: s.isDefault,
        }))
      );

      setAllScanSources(sources);
      setAllScannedItems(items);
      setAllScannedCards(cards);

      if (settings) {
        if (settings.instructions) setSystemInstructions(settings.instructions);
        if (settings.defaultModel) setSelectedModel(settings.defaultModel);
        if (settings.defaultEffort) setSelectedEffort(settings.defaultEffort);
      }
    } catch (err) {
      console.warn("Lỗi đọc dữ liệu từ IndexedDB:", err);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();

    const handleDataUpdate = () => {
      loadDatabaseData();
    };

    window.addEventListener("studyjapan:data-updated", handleDataUpdate);
    return () => {
      window.removeEventListener("studyjapan:data-updated", handleDataUpdate);
    };
  }, [loadDatabaseData]);

  // Save Settings Changes to DB
  const saveAiSettings = async (
    inst = systemInstructions,
    model = selectedModel,
    effort = selectedEffort
  ) => {
    await db.aiSettings.put({
      key: "gemini-config",
      instructions: inst,
      defaultModel: model,
      defaultEffort: effort,
      activeSkills: allSkills.map((s) => s.id),
    });
  };

  // Handle Image File Selection with Proactive Duplicate Discard
  const handleImageFile = useCallback(async (file: File) => {
    setDuplicateWarning(null);
    setExistingScanMatch(null);
    setIsDuplicateSaveBlocked(false);
    setCurrentScanResult(null);
    setSaveSuccessMsg("");

    const buffer = await file.arrayBuffer();

    // Layer 1 Duplicate Check (SHA-256) BEFORE keeping the image
    try {
      const hash = await computeImageHash(buffer);
      const existing = await db.scanSources.where("imageHash").equals(hash).first();
      if (existing) {
        setImagePreview(null);
        setImageHashCurrent("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setDuplicateWarning(
          `⚠️ Ảnh trùng lặp! Ảnh này đã từng quét trong "${existing.title}" (${new Date(existing.createdAt).toLocaleDateString("vi-VN")}). ` +
          `Hệ thống tự động loại bỏ để không lưu trùng.`
        );
        setExistingScanMatch(existing);
        return;
      }
      setImageHashCurrent(hash);
    } catch {
      setImageHashCurrent("");
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Listen to Global Paste (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== "scan") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab, handleImageFile]);

  // Load an existing saved scan session into view
  const handleOpenSavedScan = async (source: ScanSource) => {
    const items = await db.scannedItems.toArray();
    const sourceWords = items
      .filter((i) => i.kind === "word" && i.sourceIds.includes(source.id))
      .map((w) => ({
        surface: w.surface,
        reading: w.reading,
        hanViet: w.hanViet,
        meaning: w.meaning,
        level: w.level,
        contextSentence: w.examples?.[0]?.ja || "",
      }));

    const sourceGrammar = items
      .filter((i) => i.kind === "grammar" && i.sourceIds.includes(source.id))
      .map((g) => ({
        pattern: g.surface,
        formation: g.formation,
        meaning: g.meaning,
        explanation: g.explanation,
        level: g.level,
        exampleSentence: g.examples?.[0]?.ja || "",
        exampleTranslation: g.examples?.[0]?.vi || "",
      }));

    setCurrentScanResult({
      id: source.id,
      rawText: source.rawText,
      translatedText: source.translatedText,
      exercises: source.exercises || [],
      words: sourceWords,
      grammar: sourceGrammar,
      isAlreadySaved: true,
    });
    setChatMessages(
      source.chatMessages?.length
        ? source.chatMessages
        : [
            {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: `Đã mở lại bản lưu "${source.title}". Bạn có thể xem lại lời giải hoặc hỏi tiếp tại đây.`,
              timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            },
          ]
    );
    setActiveTab("scan");
  };

  // Mention Detection Logic for @ and /
  const checkMentionTrigger = (
    value: string,
    cursorPos: number,
    field: "scanText" | "chatText"
  ) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = /(?:^|\s)([@/])([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]*)$/.exec(
      textBeforeCursor
    );

    if (match) {
      const trigger = match[1] as "@" | "/";
      const query = match[2] || "";
      const startIndex = cursorPos - query.length - 1;
      setMentionState((prev) => {
        // If trigger, query, and startIndex are unchanged, keep the existing selectedIndex!
        if (
          prev.active &&
          prev.trigger === trigger &&
          prev.query === query &&
          prev.startIndex === startIndex &&
          prev.targetField === field
        ) {
          return prev;
        }
        return {
          active: true,
          trigger,
          query,
          startIndex,
          selectedIndex: 0,
          targetField: field,
        };
      });
    } else {
      setMentionState((prev) => (prev.active ? { ...prev, active: false } : prev));
    }
  };

  const getFilteredMentionSkills = () => {
    if (!mentionState.active) return [];
    const q = mentionState.query.toLowerCase();
    return allSkills.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  };

  const insertSkillMention = (skill: SkillItem) => {
    if (!mentionState.targetField || !skill) return;

    const tag = mentionState.trigger === "/" ? `/${skill.slug} ` : `@${skill.title} `;

    if (mentionState.targetField === "scanText") {
      const before = textInput.slice(0, mentionState.startIndex);
      const after = textInput.slice(mentionState.startIndex + mentionState.query.length + 1);
      const nextVal = before + tag + after;
      setTextInput(nextVal);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = before.length + tag.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    } else {
      const before = chatInput.slice(0, mentionState.startIndex);
      const after = chatInput.slice(mentionState.startIndex + mentionState.query.length + 1);
      const nextVal = before + tag + after;
      setChatInput(nextVal);
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          const newPos = before.length + tag.length;
          chatInputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }

    setMentionState({
      active: false,
      trigger: null,
      query: "",
      startIndex: 0,
      selectedIndex: 0,
      targetField: null,
    });
  };

  const handleMentionKeyDown = (
    e: React.KeyboardEvent,
    filtered: SkillItem[]
  ) => {
    if (!mentionState.active || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setMentionState((prev) => ({
        ...prev,
        selectedIndex: (prev.selectedIndex + 1) % filtered.length,
      }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setMentionState((prev) => ({
        ...prev,
        selectedIndex: (prev.selectedIndex - 1 + filtered.length) % filtered.length,
      }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      const targetSkill = filtered[mentionState.selectedIndex] || filtered[0];
      if (targetSkill) {
        insertSkillMention(targetSkill);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setMentionState((prev) => ({ ...prev, active: false }));
    }
  };

  // Skills Management (Add, Delete, Restore)
  const handleDeleteSkill = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa kỹ năng này?")) return;
    await db.customSkills.delete(id);
    setAllSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateSkill = async () => {
    if (!newSkillTitle.trim() || !newSkillPrompt.trim()) return;
    const slug = (newSkillSlug.trim() || newSkillTitle.trim().toLowerCase().replace(/\s+/g, "-")).replace(/[^a-z0-9-]/gi, "");
    const newSkill: CustomSkill = {
      id: `skill-${Date.now()}`,
      slug,
      icon: newSkillIcon || "✨",
      title: newSkillTitle.trim(),
      prompt: newSkillPrompt.trim(),
      isDefault: false,
    };
    await db.customSkills.put(newSkill);
    setAllSkills((prev) => [...prev, { ...newSkill, slug }]);
    setNewSkillTitle("");
    setNewSkillSlug("");
    setNewSkillPrompt("");
    setIsAddingNewSkill(false);
  };

  const handleRestoreDefaultSkills = async () => {
    if (!confirm("Khôi phục lại danh sách 5 kỹ năng mặc định?")) return;
    await db.customSkills.clear();
    await db.customSkills.bulkAdd(
      BUILTIN_SKILLS.map((s) => ({
        id: s.id,
        slug: s.slug,
        icon: s.icon,
        title: s.title,
        prompt: s.prompt,
        isDefault: true,
      }))
    );
    loadDatabaseData();
  };

  // Execute Scan
  const handleStartScan = async () => {
    if (!imagePreview && !textInput.trim()) {
      alert("Vui lòng tải ảnh lên hoặc nhập đề bài tiếng Nhật.");
      return;
    }

    setIsScanning(true);
    setDuplicateWarning(null);
    setIsDuplicateSaveBlocked(false);
    setSaveSuccessMsg("");

    try {
      let imageBase64: string | undefined;
      let mimeType = "image/jpeg";

      if (imagePreview) {
        const compressed = await compressImageDataUrl(imagePreview);
        imageBase64 = compressed.base64;
        mimeType = compressed.mimeType;
      }

      // Check if user explicitly called any skills via @ or / in textInput
      const invokedSkills = extractInvokedSkills(textInput, allSkills);

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "scan",
          imageBase64,
          mimeType,
          textInput: textInput.trim() || undefined,
          model: selectedModel,
          effort: selectedEffort,
          skills: allSkills.map((s) => ({ id: s.id, title: s.title, prompt: s.prompt })),
          invokedSkills: invokedSkills.map((s) => ({ id: s.id, title: s.title, prompt: s.prompt })),
          instructions: systemInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Không thể phân tích dữ liệu.");
      }

      // Layer 2 Duplicate Check: Normalized text comparison
      const textHash = computeTextHash(data.rawText);
      if (textHash.length > 5) {
        const duplicateTextScan = await db.scanSources.where("textHash").equals(textHash).first();
        if (duplicateTextScan) {
          setDuplicateWarning(
            `⚠️ Nội dung văn bản này trùng với bản quét "${duplicateTextScan.title}" (${new Date(duplicateTextScan.createdAt).toLocaleDateString("vi-VN")}). ` +
            `Hệ thống khóa nút lưu để tránh lưu trùng lặp.`
          );
          setExistingScanMatch(duplicateTextScan);
          setIsDuplicateSaveBlocked(true);
        }
      }

      const scanId = `scan-${Date.now()}`;
      const resultObj = {
        id: scanId,
        rawText: data.rawText || "",
        translatedText: data.translatedText || "",
        exercises: Array.isArray(data.exercises) ? data.exercises : [],
        words: Array.isArray(data.words) ? data.words : [],
        grammar: Array.isArray(data.grammar) ? data.grammar : [],
        isAlreadySaved: false,
      };

      setCurrentScanResult(resultObj);
      setSelectedWordsToSave(new Set(resultObj.words.map((w: ScannedWordMeta) => w.surface)));
      setSelectedGrammarToSave(new Set(resultObj.grammar.map((g: ScannedGrammarMeta) => g.pattern)));

      setChatMessages([
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `Xin chào! Tôi đã đọc bài và tự động áp dụng các kỹ năng phân tích phù hợp. Bạn có thể hỏi thêm bên dưới hoặc gõ @/ để gọi kỹ năng cụ thể.`,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      alert("Lỗi khi quét: " + (err?.message || String(err)));
    } finally {
      setIsScanning(false);
    }
  };

  // Save Scan Result to Vault
  const handleSaveToVault = async () => {
    if (!currentScanResult) return;
    if (isDuplicateSaveBlocked) {
      alert("Bản quét này bị trùng nội dung với một bản đã lưu trước đó.");
      return;
    }

    try {
      const now = new Date().toISOString();
      const textHash = computeTextHash(currentScanResult.rawText);
      const title = scanTitle.trim() || `Bản quét ${new Date().toLocaleDateString("vi-VN")}`;

      const sourceRecord: ScanSource = {
        id: currentScanResult.id,
        title,
        imageHash: imageHashCurrent,
        textHash,
        rawText: currentScanResult.rawText,
        translatedText: currentScanResult.translatedText,
        exercises: currentScanResult.exercises,
        chatMessages,
        modelUsed: selectedModel,
        effortUsed: selectedEffort,
        createdAt: now,
      };
      await db.scanSources.put(sourceRecord);

      for (const w of currentScanResult.words) {
        if (!selectedWordsToSave.has(w.surface)) continue;
        const itemId = `sw-${w.surface}`;
        const existing = await db.scannedItems.get(itemId);

        const newExamples = w.contextSentence
          ? [{ ja: w.contextSentence, vi: currentScanResult.translatedText, sourceId: currentScanResult.id }]
          : [];

        if (existing) {
          const existingJaSet = new Set(existing.examples.map((e) => e.ja));
          const uniqueNewExamples = newExamples.filter((e) => !existingJaSet.has(e.ja));
          const mergedExamples = [...existing.examples, ...uniqueNewExamples];
          const mergedSources = Array.from(new Set([...existing.sourceIds, currentScanResult.id]));
          await db.scannedItems.update(itemId, {
            examples: mergedExamples,
            sourceIds: mergedSources,
          });
        } else {
          const item: ScannedItem = {
            id: itemId,
            kind: "word",
            surface: w.surface,
            reading: w.reading,
            hanViet: w.hanViet,
            meaning: w.meaning || "",
            examples: newExamples,
            level: w.level || 5,
            sourceIds: [currentScanResult.id],
            pushedToMainSRS: false,
            addedAt: now,
          };
          await db.scannedItems.put(item);
          await createScannedCards(item);
        }
      }

      for (const g of currentScanResult.grammar) {
        if (!selectedGrammarToSave.has(g.pattern)) continue;
        const itemId = `sg-${g.pattern.replace(/^[〜~]/, "").trim()}`;
        const existing = await db.scannedItems.get(itemId);

        const newExamples = g.exampleSentence
          ? [{ ja: g.exampleSentence, vi: g.exampleTranslation || "", sourceId: currentScanResult.id }]
          : [];

        if (existing) {
          const existingJaSet = new Set(existing.examples.map((e) => e.ja));
          const uniqueNewExamples = newExamples.filter((e) => !existingJaSet.has(e.ja));
          const mergedExamples = [...existing.examples, ...uniqueNewExamples];
          const mergedSources = Array.from(new Set([...existing.sourceIds, currentScanResult.id]));
          await db.scannedItems.update(itemId, {
            examples: mergedExamples,
            sourceIds: mergedSources,
          });
        } else {
          const item: ScannedItem = {
            id: itemId,
            kind: "grammar",
            surface: g.pattern,
            meaning: g.meaning || "",
            formation: g.formation || "",
            explanation: g.explanation || "",
            examples: newExamples,
            level: g.level || 5,
            sourceIds: [currentScanResult.id],
            pushedToMainSRS: false,
            addedAt: now,
          };
          await db.scannedItems.put(item);
          await createScannedCards(item);
        }
      }

      setCurrentScanResult((prev) => (prev ? { ...prev, isAlreadySaved: true } : prev));
      setImagePreview(null);
      setImageHashCurrent("");
      setSaveSuccessMsg(`✓ Đã gom văn bản, từ vựng và ngữ pháp vào Kho Ôn tập riêng!`);
      loadDatabaseData();
      triggerBackgroundAutoSync();
    } catch (err: any) {
      alert("Lỗi khi lưu dữ liệu: " + err?.message);
    }
  };

  // Follow-up Chat Submit
  const handleSendChatMessage = async (presetText?: string) => {
    const text = presetText || chatInput.trim();
    if (!text || isChatSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatSending(true);

    try {
      const invokedSkills = extractInvokedSkills(text, allSkills);

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: currentScanResult ? `Văn bản gốc: ${currentScanResult.rawText}\nDịch: ${currentScanResult.translatedText}` : undefined,
          model: selectedModel,
          effort: selectedEffort,
          skills: allSkills.map((s) => ({ id: s.id, title: s.title, prompt: s.prompt })),
          invokedSkills: invokedSkills.map((s) => ({ id: s.id, title: s.title, prompt: s.prompt })),
          instructions: systemInstructions,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "Không có phản hồi.";

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedMsgs = [...newMessages, aiMsg];
      setChatMessages(updatedMsgs);

      if (currentScanResult?.isAlreadySaved) {
        await db.scanSources.update(currentScanResult.id, { chatMessages: updatedMsgs });
      }
    } catch (err: any) {
      alert("Lỗi khi chat: " + (err?.message || String(err)));
    } finally {
      setIsChatSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // Push Single Item to Main SRS Deck
  const handlePushToMainDeck = async (item: ScannedItem) => {
    try {
      const { notice } = await pushScannedItemToMainDeck(item);
      setActionNotice(notice || `✓ Đã đẩy "${item.surface}" sang Bộ đề hôm nay!`);
      loadDatabaseData();
      triggerBackgroundAutoSync();
      setTimeout(() => setActionNotice(""), 4000);
    } catch {
      alert("Lỗi khi đẩy sang Bộ đề hôm nay.");
    }
  };

  // Batch Push List of Items to Main SRS Deck
  const handleBatchPushToMainDeck = async (items: ScannedItem[]) => {
    const unpushed = items.filter((i) => !i.pushedToMainSRS);
    if (unpushed.length === 0) {
      setActionNotice("Tất cả các mục trong danh sách này đã có trong Bộ đề hôm nay.");
      setTimeout(() => setActionNotice(""), 3000);
      return;
    }
    try {
      for (const item of unpushed) {
        await pushScannedItemToMainDeck(item);
      }
      setActionNotice(`✓ Đã đẩy ${unpushed.length} mục sang Bộ đề hôm nay!`);
      loadDatabaseData();
      triggerBackgroundAutoSync();
      setTimeout(() => setActionNotice(""), 4000);
    } catch {
      alert("Lỗi khi đẩy hàng loạt sang Bộ đề hôm nay.");
    }
  };

  // Delete Scanned Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mục này khỏi kho quét?")) return;
    await db.scannedItems.delete(id);
    await db.scannedCards.where("targetId").equals(id).delete();
    loadDatabaseData();
  };

  // Setup Quiz for Review Tab
  const handleStartQuiz = () => {
    let pool = allScannedItems;
    if (selectedSourceFilter !== "all") {
      pool = pool.filter((i) => i.sourceIds.includes(selectedSourceFilter));
    }
    if (reviewScope === "words") pool = pool.filter((i) => i.kind === "word");
    if (reviewScope === "grammar") pool = pool.filter((i) => i.kind === "grammar");

    if (pool.length === 0) {
      alert("Chưa có mục nào trong phạm vi này để ôn tập. Hãy quét ảnh và gom từ trước!");
      return;
    }

    const questions = generateScanQuizBatch(pool, 10);
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizSelectedOption(null);
    setQuizIsAnswered(false);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  const handleAnswerQuiz = (option: string) => {
    if (quizIsAnswered) return;
    const currentQ = quizQuestions[quizIndex];
    setQuizSelectedOption(option);
    setQuizIsAnswered(true);

    const isCorrect = option === currentQ.correctAnswer;
    if (isCorrect) setQuizScore((prev) => prev + 1);

    updateFsrsReview(currentQ.itemId, isCorrect ? Rating.Good : Rating.Again);
  };

  const updateFsrsReview = async (itemId: string, rating: ReviewRating) => {
    try {
      const card = await db.scannedCards.where("targetId").equals(itemId).first();
      if (card) {
        const { updatedCard, todayAgain } = reviewCard(card.fsrsCard, rating);
        await db.scannedCards.update(card.id, {
          fsrsCard: updatedCard,
          lastRating: rating,
          todayAgain,
        });
        loadDatabaseData();
      }
    } catch {
      // Ignore
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setQuizSelectedOption(null);
      setQuizIsAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  };

  // Filtered lists for Vault tabs
  const filteredWords = allScannedItems
    .filter((i) => i.kind === "word")
    .filter((i) => (selectedSourceFilter === "all" ? true : i.sourceIds.includes(selectedSourceFilter)))
    .filter((i) => (searchQuery ? i.surface.includes(searchQuery) || i.meaning.toLowerCase().includes(searchQuery.toLowerCase()) : true));

  const filteredGrammar = allScannedItems
    .filter((i) => i.kind === "grammar")
    .filter((i) => (selectedSourceFilter === "all" ? true : i.sourceIds.includes(selectedSourceFilter)))
    .filter((i) => (searchQuery ? i.surface.includes(searchQuery) || i.meaning.toLowerCase().includes(searchQuery.toLowerCase()) : true));

  const allExercises = allScanSources.flatMap((s) =>
    (s.exercises || []).map((ex) => ({ ...ex, sourceTitle: s.title, sourceDate: s.createdAt, sourceId: s.id }))
  );

  const filteredMentionSkills = getFilteredMentionSkills();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col md:flex-row gap-5">
        {/* ===================== LEFT SIDEBAR ===================== */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-3">
          <div className="card p-3 space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">
              Kho Quét Ảnh & Giải Đề
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("scan")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "scan"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-text hover:bg-unk-bg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📸</span>
                <span>Quét & Giải bài</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("exercises")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "exercises"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-text hover:bg-unk-bg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📝</span>
                <span>Bài tập đã giải</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-card/60 text-text font-bold">
                {allExercises.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("words")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "words"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-text hover:bg-unk-bg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📖</span>
                <span>Kho Từ vựng</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-card/60 text-text font-bold">
                {allScannedItems.filter((i) => i.kind === "word").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("grammar")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "grammar"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-text hover:bg-unk-bg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📐</span>
                <span>Kho Ngữ pháp</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-card/60 text-text font-bold">
                {allScannedItems.filter((i) => i.kind === "grammar").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "review"
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "text-muted hover:text-text hover:bg-unk-bg"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>Ôn tập riêng</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-bold">
                {allScannedItems.length}
              </span>
            </button>
          </div>

          {/* Quick AI Settings Card */}
          <div className="card p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-muted font-bold uppercase">
              <span>Cấu hình Gemini</span>
              <button
                type="button"
                onClick={() => setShowInstructionModal(true)}
                className="text-accent hover:underline flex items-center gap-1 font-semibold normal-case"
              >
                <span>⚙️ Chỉ dẫn</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  saveAiSettings(systemInstructions, e.target.value, selectedEffort);
                }}
                className="w-full p-1.5 rounded-lg border border-line bg-card text-text text-xs focus:ring-1 focus:ring-accent"
              >
                <option value="Gemini 3.8 Flash">Gemini 3.8 Flash (Khuyên dùng)</option>
                <option value="Gemini 2.5 Flash">Gemini 2.5 Flash (Nhanh)</option>
                <option value="Gemini 2.5 Pro">Gemini 2.5 Pro (Đọc hiểu sâu)</option>
                <option value="Gemini 2.0 Flash">Gemini 2.0 Flash</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted">Mức tư duy (Effort):</label>
              <div className="grid grid-cols-3 gap-1">
                {(["low", "medium", "high"] as const).map((eff) => (
                  <button
                    key={eff}
                    type="button"
                    onClick={() => {
                      setSelectedEffort(eff);
                      saveAiSettings(systemInstructions, selectedModel, eff);
                    }}
                    className={`py-1 rounded-md text-center font-bold capitalize transition-all ${
                      selectedEffort === eff
                        ? "bg-accent text-accent-ink shadow-xs"
                        : "border border-line hover:bg-unk-bg text-muted"
                    }`}
                  >
                    {eff === "low" ? "Low" : eff === "medium" ? "Med" : "High"}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Button to open Skills Management */}
            <div className="pt-1.5 border-t border-line/60">
              <button
                type="button"
                onClick={() => setShowSkillsModal(true)}
                className="w-full py-1.5 px-2 rounded-lg bg-unk-bg hover:bg-accent-soft/20 text-text hover:text-accent font-semibold transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Kho Kỹ năng (Skills)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent text-accent-ink font-bold">
                  {allSkills.length}
                </span>
              </button>
            </div>
          </div>

          {/* Recent Scan History in Sidebar */}
          {allScanSources.length > 0 && (
            <div className="card p-3 space-y-2 text-xs">
              <div className="text-muted font-bold uppercase text-[11px]">
                Lịch sử các lần quét ({allScanSources.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {allScanSources.slice(0, 10).map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => handleOpenSavedScan(src)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-unk-bg transition-colors flex items-center justify-between gap-2 group"
                  >
                    <span className="truncate font-medium text-text group-hover:text-accent">
                      📄 {src.title}
                    </span>
                    <span className="text-[10px] text-muted shrink-0">
                      {new Date(src.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ===================== MAIN CONTENT AREA ===================== */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">
          {actionNotice && (
            <div className="rounded-xl px-4 py-2.5 bg-green-brand/20 border border-green-brand/40 text-ok-ink text-xs font-semibold">
              {actionNotice}
            </div>
          )}

          {/* TAB 1: SCAN & SOLVE */}
          {activeTab === "scan" && (
            <div className="space-y-4">
              {/* Top Banner (Cleaned up, no chip clutter) */}
              <div className="card p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                      <span>📸</span>
                      <span>Quét ảnh, Giải bài tập & Gom Từ vựng + Ngữ pháp</span>
                    </h1>
                    <p className="text-xs text-muted mt-0.5">
                      Chụp camera, tải ảnh đề thi, hoặc nhấn <kbd className="px-1.5 py-0.5 rounded bg-unk-bg border border-line font-mono text-[10px]">Ctrl+V</kbd> để dán ảnh. AI tự động gọi các skill phù hợp.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setShowSkillsModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-accent text-accent hover:bg-accent-soft/20 transition-all flex items-center gap-1.5"
                    >
                      <span>🎯</span>
                      <span>Quản lý Skills ({allSkills.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInstructionModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-line hover:border-accent text-text transition-all flex items-center gap-1.5"
                    >
                      <span>⚙️</span>
                      <span>Chỉ dẫn</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone & Controls */}
              <div className="card p-4 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Image Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-line hover:border-accent rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-card/40 min-h-[180px]"
                  >
                    {imagePreview ? (
                      <div className="relative w-full flex flex-col items-center">
                        <img
                          src={imagePreview}
                          alt="Ảnh đã chọn"
                          className="max-h-48 rounded-xl object-contain border border-line shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImagePreview(null);
                            setImageHashCurrent("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="mt-2 text-xs text-red-500 hover:underline font-semibold"
                        >
                          ✕ Bỏ ảnh này
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-4xl">📷</span>
                        <p className="text-sm font-semibold text-text">
                          Bấm để Chụp ảnh hoặc Chọn file từ máy
                        </p>
                        <p className="text-xs text-muted">
                          Hoặc chụp màn hình rồi bấm <kbd className="px-1.5 py-0.5 rounded bg-unk-bg border border-line font-mono text-[10px]">Ctrl+V</kbd> để dán ảnh
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Text Input / Note with @ and / mention support */}
                  <div className="flex flex-col gap-1.5 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted">
                        Đoạn văn hoặc câu hỏi cần giải thêm:
                      </label>
                      <span className="text-[11px] text-accent font-medium">
                        💡 Gõ <kbd className="font-mono bg-unk-bg px-1 py-0.2 rounded border border-line">@</kbd> hoặc <kbd className="font-mono bg-unk-bg px-1 py-0.2 rounded border border-line">/</kbd> để gọi skill
                      </span>
                    </div>

                    <div className="relative flex-1">
                      <textarea
                        ref={textareaRef}
                        value={textInput}
                        onChange={(e) => {
                          setTextInput(e.target.value);
                          checkMentionTrigger(e.target.value, e.target.selectionStart || 0, "scanText");
                        }}
                        onKeyUp={(e) => {
                          if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
                            return;
                          }
                          checkMentionTrigger(textInput, (e.target as HTMLTextAreaElement).selectionStart || 0, "scanText");
                        }}
                        onKeyDown={(e) => handleMentionKeyDown(e, filteredMentionSkills)}
                        placeholder="Gõ đề bài hoặc câu tiếng Nhật... (Gõ @ hoặc / để gọi kỹ năng cụ thể, ví dụ: @Giải bài tập JLPT hoặc /giai-de)..."
                        rows={5}
                        className="w-full h-full p-3 rounded-xl border border-line bg-card text-xs focus:ring-2 focus:ring-accent font-ja"
                      />

                      {/* Mention Autocomplete Dropdown for Textarea */}
                      {mentionState.active && mentionState.targetField === "scanText" && filteredMentionSkills.length > 0 && (
                        <div className="absolute left-2 bottom-full mb-1 z-30 w-72 max-h-60 overflow-y-auto rounded-xl border border-line bg-card shadow-xl p-1 space-y-0.5">
                          <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-line/60">
                            Gọi Kỹ năng ({mentionState.trigger}):
                          </div>
                          {filteredMentionSkills.map((skill, idx) => (
                            <button
                              key={skill.id}
                              ref={(el) => {
                                if (idx === mentionState.selectedIndex && el) {
                                  el.scrollIntoView({ block: "nearest" });
                                }
                              }}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertSkillMention(skill);
                              }}
                              onClick={() => insertSkillMention(skill)}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                idx === mentionState.selectedIndex
                                  ? "bg-accent text-accent-ink font-bold"
                                  : "hover:bg-unk-bg text-text"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{skill.icon}</span>
                                <span>{skill.title}</span>
                              </span>
                              <span className={`text-[10px] font-mono ${idx === mentionState.selectedIndex ? "opacity-90" : "text-muted"}`}>
                                /{skill.slug}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duplicate Image / Text Warning Alert */}
                {duplicateWarning && (
                  <div className="rounded-xl p-3.5 bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <p className="font-medium leading-relaxed">{duplicateWarning}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {existingScanMatch && (
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenSavedScan(existingScanMatch);
                            setDuplicateWarning(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90"
                        >
                          📂 Mở bản đã lưu
                        </button>
                      )}
                      {isDuplicateSaveBlocked && (
                        <button
                          type="button"
                          onClick={() => setIsDuplicateSaveBlocked(false)}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-500/50 text-xs font-semibold hover:bg-amber-500/10"
                        >
                          Vẫn cho phép lưu
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-line">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tên nhóm (vd: Minna bài 5, Đề thi N3...)"
                      value={scanTitle}
                      onChange={(e) => setScanTitle(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-line bg-card w-full sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isScanning || (!imagePreview && !textInput.trim())}
                    onClick={handleStartScan}
                    className="px-5 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs sm:text-sm hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{isScanning ? "⏳" : "⚡"}</span>
                    <span>{isScanning ? "Gemini đang phân tích..." : "Bắt đầu Quét & Giải bài"}</span>
                  </button>
                </div>
              </div>

              {/* Scan Results Display */}
              {currentScanResult && (
                <div className="space-y-4">
                  {/* Top Bar for Saving */}
                  <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-accent-soft/20 border-accent/40">
                    <div>
                      <h3 className="font-bold text-sm text-accent flex items-center gap-1.5">
                        <span>✓</span>
                        <span>
                          Kết quả: {currentScanResult.exercises.length} bài tập · {currentScanResult.words.length} từ vựng · {currentScanResult.grammar.length} cấu trúc ngữ pháp
                        </span>
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {currentScanResult.isAlreadySaved
                          ? "Bản phân tích này đã được lưu trong Kho Quét Ảnh."
                          : "Tích chọn các từ vựng và ngữ pháp muốn giữ lại bên dưới, sau đó bấm lưu (chỉ lưu văn bản)."}
                      </p>
                    </div>

                    {!currentScanResult.isAlreadySaved && (
                      <button
                        type="button"
                        disabled={isDuplicateSaveBlocked}
                        onClick={handleSaveToVault}
                        className="px-4 py-2 rounded-xl bg-green-brand text-ok-ink font-bold text-xs hover:opacity-90 transition-all shadow-sm disabled:opacity-40"
                      >
                        {isDuplicateSaveBlocked ? "🚫 Đã chặn lưu trùng" : "📥 Gom vào Kho Ôn tập riêng"}
                      </button>
                    )}
                  </div>

                  {saveSuccessMsg && (
                    <div className="rounded-xl p-3 bg-green-brand/20 border border-green-brand/40 text-ok-ink text-xs font-bold text-center">
                      {saveSuccessMsg}
                    </div>
                  )}

                  {/* Raw Text & Translation Summary */}
                  {currentScanResult.rawText && (
                    <div className="card p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🌐</span>
                          <h3 className="font-bold text-xs sm:text-sm text-text">
                            Bản dịch & Đối chiếu song ngữ
                          </h3>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-unk-bg p-0.5 rounded-lg border border-line text-[11px] self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setTransViewMode("bilingual")}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                              transViewMode === "bilingual"
                                ? "bg-card text-accent font-bold shadow-xs"
                                : "text-muted hover:text-text"
                            }`}
                          >
                            📖 Song ngữ đối chiếu
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransViewMode("raw")}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                              transViewMode === "raw"
                                ? "bg-card text-accent font-bold shadow-xs"
                                : "text-muted hover:text-text"
                            }`}
                          >
                            📄 Bản gốc Nhật
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransViewMode("vi")}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                              transViewMode === "vi"
                                ? "bg-card text-accent font-bold shadow-xs"
                                : "text-muted hover:text-text"
                            }`}
                          >
                            🇻🇳 Bản dịch Việt
                          </button>
                        </div>
                      </div>

                      {/* Mode 1: Bilingual Aligned View (Image 1 Style) */}
                      {transViewMode === "bilingual" && (
                        <div className="space-y-2 pt-1">
                          {renderBilingualContent(currentScanResult)}
                        </div>
                      )}

                      {/* Mode 2: Raw Japanese text */}
                      {transViewMode === "raw" && (
                        <p className="font-ja text-sm font-medium text-text whitespace-pre-wrap leading-relaxed bg-unk-bg/50 p-3 rounded-xl border border-line">
                          {currentScanResult.rawText}
                        </p>
                      )}

                      {/* Mode 3: Vietnamese translation */}
                      {transViewMode === "vi" && (
                        <p className="text-xs sm:text-sm text-text leading-relaxed whitespace-pre-wrap bg-unk-bg/50 p-3 rounded-xl border border-line">
                          {currentScanResult.translatedText || "Chưa có bản dịch."}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 1. Solved Exercises Section */}
                  {currentScanResult.exercises.length > 0 && (
                    <div className="card p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-line pb-2">
                        <span className="text-lg">📝</span>
                        <h3 className="font-bold text-sm text-text">
                          Lời giải bài tập ({currentScanResult.exercises.length} câu)
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {currentScanResult.exercises.map((ex, idx) => (
                          <div key={ex.id || idx} className="rounded-xl border border-line p-3.5 space-y-2 bg-card/60">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs px-2 py-0.5 rounded bg-accent text-accent-ink">
                                Câu {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded">
                                Đáp án đúng: {ex.correctAnswer}
                              </span>
                            </div>

                            <p className="font-ja font-bold text-sm text-text leading-relaxed">
                              {ex.questionText}
                            </p>
                            {ex.questionTranslation && (
                              <p className="text-xs text-muted italic">Dịch: {ex.questionTranslation}</p>
                            )}

                            {/* Options */}
                            {ex.options && ex.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                {ex.options.map((opt, optIdx) => {
                                  const isCorrect =
                                    opt.startsWith(ex.correctAnswer) ||
                                    opt.includes(ex.correctAnswer) ||
                                    String(optIdx + 1) === ex.correctAnswer;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-2 rounded-lg text-xs font-ja border ${
                                        isCorrect
                                          ? "border-green-500/60 bg-green-500/10 font-bold text-green-700 dark:text-green-300"
                                          : "border-line/60 bg-card/40 text-muted"
                                      }`}
                                    >
                                      {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Detailed Explanation */}
                            {ex.explanation && (
                              <div className="mt-2 pt-2 border-t border-line/60 text-xs text-text space-y-1">
                                <span className="font-bold text-accent block text-[11px] uppercase tracking-wide">
                                  💡 Giải thích chi tiết:
                                </span>
                                <p className="leading-relaxed bg-unk-bg/60 p-2.5 rounded-lg border border-line/40 whitespace-pre-wrap">
                                  {ex.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2-Column: Words & Grammar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Words Column */}
                    <div className="card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <span>📖</span>
                          <span>Từ vựng ({currentScanResult.words.length})</span>
                        </div>
                        {!currentScanResult.isAlreadySaved && currentScanResult.words.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedWordsToSave.size === currentScanResult.words.length) {
                                setSelectedWordsToSave(new Set());
                              } else {
                                setSelectedWordsToSave(new Set(currentScanResult.words.map((w: ScannedWordMeta) => w.surface)));
                              }
                            }}
                            className="text-[11px] text-accent hover:underline font-semibold"
                          >
                            {selectedWordsToSave.size === currentScanResult.words.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {currentScanResult.words.map((w, idx) => {
                          const isChecked = selectedWordsToSave.has(w.surface);
                          return (
                            <label
                              key={w.surface + idx}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked || currentScanResult.isAlreadySaved
                                  ? "border-accent bg-accent-soft/10"
                                  : "border-line bg-card/60 opacity-60"
                              }`}
                            >
                              {!currentScanResult.isAlreadySaved && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedWordsToSave((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(w.surface)) next.delete(w.surface);
                                      else next.add(w.surface);
                                      return next;
                                    });
                                  }}
                                  className="mt-1 rounded text-accent"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-ja font-bold text-base text-accent">{w.surface}</span>
                                  {w.reading && <span className="text-xs text-muted font-ja">[{w.reading}]</span>}
                                  {w.hanViet && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-unk-bg text-muted uppercase">
                                      {w.hanViet}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-text font-medium mt-0.5">{w.meaning}</p>
                                {w.contextSentence && (
                                  <p className="text-[11px] text-muted font-ja italic mt-1 truncate">
                                    "{w.contextSentence}"
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grammar Column */}
                    <div className="card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <span>📐</span>
                          <span>Ngữ pháp ({currentScanResult.grammar.length})</span>
                        </div>
                        {!currentScanResult.isAlreadySaved && currentScanResult.grammar.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedGrammarToSave.size === currentScanResult.grammar.length) {
                                setSelectedGrammarToSave(new Set());
                              } else {
                                setSelectedGrammarToSave(new Set(currentScanResult.grammar.map((g: ScannedGrammarMeta) => g.pattern)));
                              }
                            }}
                            className="text-[11px] text-accent hover:underline font-semibold"
                          >
                            {selectedGrammarToSave.size === currentScanResult.grammar.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {currentScanResult.grammar.map((g, idx) => {
                          const isChecked = selectedGrammarToSave.has(g.pattern);
                          return (
                            <label
                              key={g.pattern + idx}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked || currentScanResult.isAlreadySaved
                                  ? "border-accent bg-accent-soft/10"
                                  : "border-line bg-card/60 opacity-60"
                              }`}
                            >
                              {!currentScanResult.isAlreadySaved && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedGrammarToSave((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(g.pattern)) next.delete(g.pattern);
                                      else next.add(g.pattern);
                                      return next;
                                    });
                                  }}
                                  className="mt-1 rounded text-accent"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-ja font-bold text-sm text-accent">{g.pattern}</span>
                                {g.formation && (
                                  <span className="block text-[11px] text-muted font-mono mt-0.5">
                                    Ghép: {g.formation}
                                  </span>
                                )}
                                <p className="text-xs text-text font-medium mt-0.5">{g.meaning}</p>
                                {g.explanation && (
                                  <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                                    {g.explanation}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3. Follow-up Interactive Chat Box with @ and / mention support */}
                  <div className="card p-4 space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <h3 className="font-bold text-sm text-text">Hỏi đáp trực tiếp với Gemini về bài này</h3>
                      </div>
                      <span className="text-xs text-muted">
                        {selectedModel} · Effort: {selectedEffort}
                      </span>
                    </div>

                    {/* Chat Messages Log */}
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "bg-accent text-accent-ink rounded-tr-none font-medium"
                                : "bg-unk-bg border border-line text-text rounded-tl-none space-y-1"
                            }`}
                          >
                            {msg.role === "assistant" ? (
                              renderChatMessageContent(msg.content)
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                            <span className="block text-[9px] opacity-70 text-right mt-0.5">{msg.timestamp}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Quick Question Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        "Dịch sát nghĩa dòng theo dòng",
                        "Tại sao câu bài tập lại chọn đáp án đó?",
                        "Phân tích rõ hơn về trợ từ trong bài",
                        "Cho tôi thêm 2 câu ví dụ thực tế",
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          type="button"
                          onClick={() => handleSendChatMessage(promptText)}
                          disabled={isChatSending}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-line hover:border-accent hover:bg-accent-soft/20 text-muted hover:text-text transition-all disabled:opacity-50"
                        >
                          💬 {promptText}
                        </button>
                      ))}
                    </div>

                    {/* Chat Input with Autocomplete */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChatMessage();
                      }}
                      className="relative flex gap-2"
                    >
                      {/* Mention Autocomplete Dropdown for Chat Input */}
                      {mentionState.active && mentionState.targetField === "chatText" && filteredMentionSkills.length > 0 && (
                        <div className="absolute left-0 bottom-full mb-2 z-30 w-72 max-h-56 overflow-y-auto rounded-xl border border-line bg-card shadow-xl p-1 space-y-0.5">
                          <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-line/60">
                            Gọi Kỹ năng ({mentionState.trigger}):
                          </div>
                          {filteredMentionSkills.map((skill, idx) => (
                            <button
                              key={skill.id}
                              ref={(el) => {
                                if (idx === mentionState.selectedIndex && el) {
                                  el.scrollIntoView({ block: "nearest" });
                                }
                              }}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertSkillMention(skill);
                              }}
                              onClick={() => insertSkillMention(skill)}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                idx === mentionState.selectedIndex
                                  ? "bg-accent text-accent-ink font-bold"
                                  : "hover:bg-unk-bg text-text"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{skill.icon}</span>
                                <span>{skill.title}</span>
                              </span>
                              <span className={`text-[10px] font-mono ${idx === mentionState.selectedIndex ? "opacity-90" : "text-muted"}`}>
                                /{skill.slug}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <input
                        ref={chatInputRef}
                        type="text"
                        placeholder="Hỏi bất kỳ điều gì (gõ @ hoặc / để gọi skill, vd: /tro-tu hoặc @Giải bài tập JLPT)..."
                        value={chatInput}
                        onChange={(e) => {
                          setChatInput(e.target.value);
                          checkMentionTrigger(e.target.value, e.target.selectionStart || 0, "chatText");
                        }}
                        onKeyUp={(e) => {
                          if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
                            return;
                          }
                          checkMentionTrigger(chatInput, (e.target as HTMLInputElement).selectionStart || 0, "chatText");
                        }}
                        onKeyDown={(e) => handleMentionKeyDown(e, filteredMentionSkills)}
                        disabled={isChatSending}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-line bg-card text-xs focus:ring-2 focus:ring-accent"
                      />
                      <button
                        type="submit"
                        disabled={isChatSending || !chatInput.trim()}
                        className="px-4 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {isChatSending ? "..." : "Gửi"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXERCISES VAULT */}
          {activeTab === "exercises" && (
            <div className="space-y-4">
              <div className="card p-4 space-y-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>📝</span>
                  <span>Kho Bài tập đã giải ({allExercises.length} câu)</span>
                </h2>
                <p className="text-xs text-muted">
                  Tập hợp toàn bộ các câu hỏi trắc nghiệm bạn đã từng quét và giải từ các bức ảnh đề thi.
                </p>
              </div>

              {allExercises.length === 0 ? (
                <div className="card p-8 text-center text-muted text-xs">
                  Chưa có bài tập nào. Hãy sang mục "Quét & Giải bài" để tải ảnh đề thi!
                </div>
              ) : (
                <div className="space-y-3">
                  {allExercises.map((ex, idx) => (
                    <div key={ex.id || idx} className="card p-4 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs px-2 py-0.5 rounded bg-accent text-accent-ink">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-muted">{ex.sourceTitle}</span>
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded">
                          Đáp án đúng: {ex.correctAnswer}
                        </span>
                      </div>

                      <p className="font-ja font-bold text-sm text-text leading-relaxed">{ex.questionText}</p>
                      {ex.questionTranslation && (
                        <p className="text-xs text-muted italic">Dịch: {ex.questionTranslation}</p>
                      )}

                      {ex.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {ex.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg text-xs font-ja border ${
                                opt.includes(ex.correctAnswer) || String(optIdx + 1) === ex.correctAnswer
                                  ? "border-green-500/60 bg-green-500/10 font-bold text-green-700 dark:text-green-300"
                                  : "border-line/60 bg-card/40 text-muted"
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {ex.explanation && (
                        <div className="p-2.5 rounded-lg bg-unk-bg/60 border border-line/40 text-xs text-text space-y-1">
                          <span className="text-[11px] font-bold text-accent uppercase block">Giải thích:</span>
                          <p className="leading-relaxed whitespace-pre-wrap">{ex.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORDS VAULT */}
          {activeTab === "words" && (
            <div className="space-y-4">
              <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>📖</span>
                    <span>Kho Từ vựng đã chụp ({filteredWords.length} từ)</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Các từ vựng gom từ ảnh chụp. Có thể bấm "Mạng nhện" hoặc đẩy sang Bộ đề hôm nay.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Tìm từ vựng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-line bg-card flex-1 sm:w-40"
                  />
                  <select
                    value={selectedSourceFilter}
                    onChange={(e) => setSelectedSourceFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-line bg-card"
                  >
                    <option value="all">Tất cả nguồn</option>
                    {allScanSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  {filteredWords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleBatchPushToMainDeck(filteredWords)}
                      className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90"
                    >
                      ➕ Đẩy tất cả sang Bộ đề
                    </button>
                  )}
                </div>
              </div>

              {filteredWords.length === 0 ? (
                <div className="card p-8 text-center text-muted text-xs">
                  Chưa có từ vựng nào trong kho. Hãy quét ảnh để gom từ!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredWords.map((item) => (
                    <div
                      key={item.id}
                      className="card p-3.5 flex flex-col justify-between hover:border-accent transition-all group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-ja text-xl font-bold text-accent">{item.surface}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-unk-bg text-muted">
                            N{item.level || 5}
                          </span>
                        </div>

                        {item.reading && <p className="text-xs font-ja text-muted">[{item.reading}]</p>}
                        {item.hanViet && (
                          <p className="text-[10px] font-bold uppercase text-text/80">{item.hanViet}</p>
                        )}
                        <p className="text-xs text-text font-medium">{item.meaning}</p>

                        {item.examples.length > 0 && (
                          <div className="pt-1 text-[11px] text-muted font-ja italic truncate">
                            "{item.examples[0].ja}"
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-xs">
                        <Link
                          href={`/?q=${encodeURIComponent(item.surface)}&level=${item.level || 5}`}
                          className="text-accent hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>🕸️</span>
                          <span>Mạng nhện</span>
                        </Link>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePushToMainDeck(item)}
                            title="Đẩy từ này sang Bộ đề ôn tập hàng ngày"
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                              item.pushedToMainSRS
                                ? "bg-green-brand/20 text-ok-ink border border-green-brand/40"
                                : "bg-accent/15 text-accent hover:bg-accent hover:text-accent-ink"
                            }`}
                          >
                            {item.pushedToMainSRS ? "✓ Đã đẩy" : "➕ Vào đề"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-muted hover:text-red-500 text-xs px-1"
                            title="Xóa mục này"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GRAMMAR VAULT */}
          {activeTab === "grammar" && (
            <div className="space-y-4">
              <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>📐</span>
                    <span>Kho Ngữ pháp đã chụp ({filteredGrammar.length} cấu trúc)</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Các mẫu câu bóc tách từ ảnh kèm công thức ghép, giải thích và các câu ví dụ thực tế.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Tìm ngữ pháp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-line bg-card flex-1 sm:w-40"
                  />
                  <select
                    value={selectedSourceFilter}
                    onChange={(e) => setSelectedSourceFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-line bg-card"
                  >
                    <option value="all">Tất cả nguồn</option>
                    {allScanSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  {filteredGrammar.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleBatchPushToMainDeck(filteredGrammar)}
                      className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90"
                    >
                      ➕ Đẩy tất cả sang Bộ đề
                    </button>
                  )}
                </div>
              </div>

              {filteredGrammar.length === 0 ? (
                <div className="card p-8 text-center text-muted text-xs">
                  Chưa có ngữ pháp nào trong kho. Hãy quét ảnh để gom ngữ pháp!
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGrammar.map((item) => (
                    <div key={item.id} className="card p-4 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-ja text-lg font-bold text-accent">{item.surface}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-unk-bg text-muted">
                              N{item.level || 5}
                            </span>
                          </div>
                          {item.formation && (
                            <span className="text-xs font-mono text-muted block mt-0.5">
                              Cách kết nối: {item.formation}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePushToMainDeck(item)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              item.pushedToMainSRS
                                ? "bg-green-brand/20 text-ok-ink border border-green-brand/40"
                                : "bg-accent/15 text-accent hover:bg-accent hover:text-accent-ink"
                            }`}
                          >
                            {item.pushedToMainSRS ? "✓ Đã đẩy sang Bộ đề" : "➕ Đẩy sang Bộ đề"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-muted hover:text-red-500 text-xs px-1"
                            title="Xóa mục này"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-text">{item.meaning}</p>
                      {item.explanation && (
                        <p className="text-xs text-muted leading-relaxed bg-unk-bg/40 p-2 rounded-lg border border-line/40">
                          {item.explanation}
                        </p>
                      )}

                      {/* Example Sentences */}
                      {item.examples.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-line/60 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-muted block">
                            Câu ví dụ trong ảnh ({item.examples.length} câu):
                          </span>
                          {item.examples.map((eg, idx) => (
                            <div key={idx} className="text-xs space-y-0.5">
                              <p className="font-ja font-semibold text-text">"{eg.ja}"</p>
                              {eg.vi && <p className="text-muted text-[11px] italic">Dịch: {eg.vi}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DEDICATED REVIEW QUIZ */}
          {activeTab === "review" && (
            <div className="space-y-4">
              <div className="card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <span>🎯</span>
                      <span>Ôn tập riêng: Từ vựng & Ngữ pháp đã chụp</span>
                    </h2>
                    <p className="text-xs text-muted">
                      Luyện tập độc lập cho kho chụp ảnh. Bao gồm trắc nghiệm từ vựng và đục lỗ mẫu ngữ pháp trên câu gốc.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedSourceFilter}
                      onChange={(e) => setSelectedSourceFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-line bg-card"
                    >
                      <option value="all">Tất cả lần chụp</option>
                      {allScanSources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>

                    <select
                      value={reviewScope}
                      onChange={(e) => setReviewScope(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-line bg-card"
                    >
                      <option value="all">Cả Từ & Ngữ pháp</option>
                      <option value="words">Chỉ Từ vựng</option>
                      <option value="grammar">Chỉ Ngữ pháp</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleStartQuiz}
                      className="px-4 py-1.5 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:opacity-90 transition-all shadow-sm"
                    >
                      Bắt đầu phiên ôn
                    </button>
                  </div>
                </div>
              </div>

              {/* Quiz Workspace */}
              {quizQuestions.length > 0 && !quizCompleted && (
                <div className="card p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between text-xs text-muted border-b border-line pb-3">
                    <span className="font-semibold">
                      Câu {quizIndex + 1} / {quizQuestions.length}
                    </span>
                    <span className="font-bold text-accent">
                      Điểm: {quizScore} / {quizQuestions.length}
                    </span>
                  </div>

                  <div className="space-y-2 text-center py-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-unk-bg text-muted">
                      {quizQuestions[quizIndex].kind === "word" ? "Từ vựng" : "Ngữ pháp (Đục lỗ / Ý nghĩa)"}
                    </span>

                    <h3 className="font-ja text-xl sm:text-2xl font-bold text-text leading-relaxed mt-2">
                      {quizQuestions[quizIndex].prompt}
                    </h3>

                    {quizQuestions[quizIndex].reading && (
                      <p className="font-ja text-xs text-muted">
                        [{quizQuestions[quizIndex].reading}]
                      </p>
                    )}

                    {quizQuestions[quizIndex].hint && (
                      <p className="text-xs text-muted italic mt-1">
                        Gợi ý: {quizQuestions[quizIndex].hint}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {quizQuestions[quizIndex].options.map((opt, idx) => {
                      const isSelected = quizSelectedOption === opt;
                      const isCorrect = opt === quizQuestions[quizIndex].correctAnswer;

                      let btnStyle = "border-line bg-card hover:border-accent hover:bg-accent-soft/10 text-text";
                      if (quizIsAnswered) {
                        if (isCorrect) {
                          btnStyle = "border-green-500 bg-green-500/20 text-green-700 dark:text-green-300 font-bold";
                        } else if (isSelected) {
                          btnStyle = "border-red-500 bg-red-500/20 text-red-700 dark:text-red-300";
                        } else {
                          btnStyle = "opacity-50 border-line bg-card";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={quizIsAnswered}
                          onClick={() => handleAnswerQuiz(opt)}
                          className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all ${btnStyle}`}
                        >
                          <span className="font-bold text-muted mr-2">{idx + 1}.</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizIsAnswered && (
                    <div className="pt-3 border-t border-line space-y-3">
                      {quizQuestions[quizIndex].explanation && (
                        <div className="p-3 rounded-xl bg-unk-bg/60 border border-line/40 text-xs text-text space-y-1">
                          <span className="font-bold text-accent uppercase text-[10px] block">Giải thích:</span>
                          <p>{quizQuestions[quizIndex].explanation}</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleNextQuizQuestion}
                          className="px-5 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:opacity-90 transition-all shadow-md"
                        >
                          {quizIndex < quizQuestions.length - 1 ? "Câu tiếp theo ›" : "Xem kết quả 🏁"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {quizCompleted && (
                <div className="card p-8 text-center space-y-4">
                  <span className="text-5xl">🎉</span>
                  <h3 className="text-2xl font-bold">Hoàn thành phiên ôn tập!</h3>
                  <p className="text-sm text-muted">
                    Bạn đã trả lời đúng{" "}
                    <span className="font-bold text-accent text-base">
                      {quizScore} / {quizQuestions.length}
                    </span>{" "}
                    câu hỏi. Lịch ôn tập đã được tự động cập nhật theo FSRS.
                  </p>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleStartQuiz}
                      className="px-4 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs shadow-sm hover:opacity-90"
                    >
                      Làm phiên khác
                    </button>
                  </div>
                </div>
              )}

              {quizQuestions.length === 0 && (
                <div className="card p-8 text-center space-y-3">
                  <span className="text-4xl">📚</span>
                  <p className="text-sm font-medium">Bấm "Bắt đầu phiên ôn" để tạo câu hỏi trắc nghiệm và đục lỗ ngữ pháp.</p>
                  <p className="text-xs text-muted">Kho hiện có {allScannedItems.length} mục đã sẵn sàng.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ===================== MODAL: UNIFIED SKILLS MANAGEMENT (GOM CHUNG VÀO 1 MỤC, CÓ THỂ XÓA ĐƯỢC) ===================== */}
      {showSkillsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>🎯</span>
                <span>Quản lý Kỹ năng (Skills) của Gemini</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSkillsModal(false);
                  setIsAddingNewSkill(false);
                }}
                className="text-muted hover:text-text font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-muted space-y-1 bg-unk-bg/60 p-3 rounded-xl border border-line/50">
              <p className="font-semibold text-text">🤖 Cơ chế hoạt động của Skills:</p>
              <p>• Khi quét ảnh hoặc giải bài, AI sẽ <strong>tự động nhận diện và gọi skill phù hợp</strong>.</p>
              <p>• Khi gõ prompt hoặc chat, bạn có thể gõ <kbd className="font-mono bg-card px-1.5 py-0.5 rounded border border-line text-accent font-bold">@TênSkill</kbd> hoặc <kbd className="font-mono bg-card px-1.5 py-0.5 rounded border border-line text-accent font-bold">/slug</kbd> để kích hoạt đích danh skill đó.</p>
              <p>• Bạn có thể <strong>xóa bất kỳ skill nào</strong> không cần thiết hoặc thêm skill mới tùy ý.</p>
            </div>

            {/* Skills List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {allSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="rounded-xl border border-line p-3 bg-card/60 flex items-start justify-between gap-3 hover:border-accent transition-all"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{skill.icon}</span>
                      <span className="font-bold text-sm text-text">{skill.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent font-bold">
                        @{skill.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-unk-bg text-muted">
                        /{skill.slug}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {skill.prompt}
                    </p>
                  </div>

                  {/* Delete Button for each skill */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                    title="Xóa kỹ năng này"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {allSkills.length === 0 && (
                <div className="p-6 text-center text-xs text-muted">
                  Bạn đã xóa hết skills. Hãy tạo skill mới hoặc bấm khôi phục mặc định bên dưới.
                </div>
              )}
            </div>

            {/* Create Skill Form (Collapsible) */}
            {isAddingNewSkill ? (
              <div className="p-3.5 rounded-xl border border-accent/40 bg-accent-soft/10 space-y-3 text-xs">
                <span className="font-bold text-accent block text-sm">✨ Thêm Kỹ năng mới:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">Tên Skill:</label>
                    <input
                      type="text"
                      placeholder="Vd: Soi kính ngữ (Keigo)..."
                      value={newSkillTitle}
                      onChange={(e) => setNewSkillTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-card"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">Lệnh tắt (/slug):</label>
                    <input
                      type="text"
                      placeholder="Vd: keigo"
                      value={newSkillSlug}
                      onChange={(e) => setNewSkillSlug(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-card font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">Icon:</label>
                    <input
                      type="text"
                      placeholder="✨"
                      value={newSkillIcon}
                      onChange={(e) => setNewSkillIcon(e.target.value)}
                      className="w-16 px-2.5 py-1.5 rounded-lg border border-line bg-card text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-muted block mb-0.5">Nội dung hướng dẫn cho Skill:</label>
                    <textarea
                      rows={2}
                      placeholder="AI cần làm gì khi skill này được gọi..."
                      value={newSkillPrompt}
                      onChange={(e) => setNewSkillPrompt(e.target.value)}
                      className="w-full p-2 rounded-lg border border-line bg-card leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSkill(false)}
                    className="px-3 py-1 rounded-lg border border-line text-xs font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSkill}
                    disabled={!newSkillTitle.trim() || !newSkillPrompt.trim()}
                    className="px-4 py-1 rounded-lg bg-accent text-accent-ink font-bold text-xs disabled:opacity-50"
                  >
                    Lưu Skill mới
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleRestoreDefaultSkills}
                  className="text-xs text-muted hover:text-text underline"
                >
                  🔄 Khôi phục 5 Skills mặc định
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSkill(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-accent text-accent-ink font-bold text-xs hover:opacity-90"
                  >
                    + Tạo Skill mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSkillsModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-line text-xs font-semibold"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: SYSTEM INSTRUCTIONS ===================== */}
      {showInstructionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>⚙️</span>
                <span>Chỉ dẫn cho Gemini (System Instructions)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInstructionModal(false)}
                className="text-muted hover:text-text font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Hướng dẫn cố định cho AI khi phân tích ảnh hoặc chat trả lời bạn (giống tính năng System Instructions của Google).
            </p>

            <textarea
              rows={6}
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              className="w-full p-3 rounded-xl border border-line bg-card text-xs focus:ring-2 focus:ring-accent leading-relaxed"
            />

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted">Gợi ý nhanh:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  "Giải thích ngắn gọn cho trình độ N4, luôn kèm 1 câu ví dụ thực tế.",
                  "Tập trung phân tích kỹ vai trò của từng trợ từ và bẫy ngữ pháp.",
                  "Dịch sát nghĩa tiếng Việt tự nhiên và giữ nguyên thuật ngữ.",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSystemInstructions((prev) => `${prev}\n- ${preset}`)}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-line hover:border-accent hover:bg-accent-soft/20 text-muted"
                  >
                    + {preset.slice(0, 35)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setSystemInstructions(DEFAULT_SYSTEM_INSTRUCTIONS)}
                className="text-xs text-muted hover:text-text underline"
              >
                Đặt lại mặc định
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstructionModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveAiSettings(systemInstructions);
                    setShowInstructionModal(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-ink font-bold text-xs"
                >
                  Lưu chỉ dẫn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
