"use client";

import React, { useState, useEffect } from "react";
import { type ScannedItem } from "../../lib/db";
import {
  type ExamPaper,
  type ExamCategory,
  type ExamGradingResult,
} from "../../lib/examTypes";
import {
  SAMPLE_KANJI_EXAM_7,
  SAMPLE_VOCAB_EXAM_7,
  gradeExamSubmission,
  generateKanjiExamFromItems,
  generateVocabExamFromItems,
} from "../../lib/examEngine";

interface ExamPaperViewProps {
  scannedItems: ScannedItem[];
  defaultCategory?: ExamCategory;
  onBackToOverview?: () => void;
}

export function ExamPaperView({
  scannedItems,
  defaultCategory = "kanji",
  onBackToOverview,
}: ExamPaperViewProps) {
  const [category, setCategory] = useState<ExamCategory>(defaultCategory);
  const [examSource, setExamSource] = useState<"sample" | "dynamic">("sample");
  const [currentExam, setCurrentExam] = useState<ExamPaper>(SAMPLE_KANJI_EXAM_7);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [gradingResult, setGradingResult] = useState<ExamGradingResult | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Load Exam Paper based on category and source mode
  useEffect(() => {
    if (examSource === "sample") {
      if (category === "kanji") {
        setCurrentExam(SAMPLE_KANJI_EXAM_7);
      } else if (category === "vocab") {
        setCurrentExam(SAMPLE_VOCAB_EXAM_7);
      }
    } else {
      if (category === "kanji") {
        setCurrentExam(generateKanjiExamFromItems(scannedItems));
      } else if (category === "vocab") {
        setCurrentExam(generateVocabExamFromItems(scannedItems));
      }
    }
    // Reset answers when switching exam
    setUserAnswers({});
    setGradingResult(null);
    setActiveQuestionId(null);
  }, [category, examSource, scannedItems]);

  const handleInputChange = (questionId: string, val: string) => {
    if (gradingResult) return; // Locked after grading
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  // Quick word box selection: clicking a word fills into active question or first empty question
  const handleSelectWordFromBox = (word: string) => {
    if (gradingResult) return;
    let targetQId = activeQuestionId;

    if (!targetQId) {
      // Find first empty question in current exam
      for (const sec of currentExam.sections) {
        for (const q of sec.questions) {
          if (!userAnswers[q.id]?.trim()) {
            targetQId = q.id;
            break;
          }
        }
        if (targetQId) break;
      }
    }

    if (targetQId) {
      setUserAnswers((prev) => ({
        ...prev,
        [targetQId!]: word,
      }));
      // Auto move focus to next question
      const allQs = currentExam.sections.flatMap((s) => s.questions);
      const curIdx = allQs.findIndex((q) => q.id === targetQId);
      if (curIdx >= 0 && curIdx < allQs.length - 1) {
        setActiveQuestionId(allQs[curIdx + 1].id);
      }
    }
  };

  const handleGradeExam = () => {
    const result = gradeExamSubmission(currentExam, userAnswers);
    setGradingResult(result);
  };

  const handleResetExam = () => {
    setUserAnswers({});
    setGradingResult(null);
    setActiveQuestionId(null);
  };

  // Demo helper: Fill student's real answers from photo
  const handleFillDemoPhotoAnswers = () => {
    if (category === "kanji") {
      setUserAnswers({
        "q-k-1": "魚",
        "q-k-2": "菜さい", // sai -> 野菜
        "q-k-3": "いみ",
        "q-k-4": "暗い",
        "q-k-5": "れじあんしょ", // sai -> きっさてん
        "q-k-6": "ご飯",
        "q-k-7": "洗じます", // sai -> 洗います
        "q-k-8": "さとう",
        "q-k-9": "少し",
        "q-k-10": "弱い",
      });
    } else if (category === "vocab") {
      setUserAnswers({
        "q-v-1": "かいぎ",
        "q-v-2": "お湯をわかす",
        "q-v-3": "パスタ",
        "q-v-4": "たいしん",
        "q-v-5": "タマネギ",
        "q-v-6": "まず", // sai -> ごろ
        "q-v-7": "出席します", // sai -> いらっしゃいます
        "q-v-8": "皮",
        "q-v-9": "焼きます", // sai -> むきます
        "q-v-10": "ご覧になりました",
      });
    }
    setGradingResult(null);
  };

  const allQuestions = currentExam.sections.flatMap((s) => s.questions);

  return (
    <div className="space-y-6">
      {/* Top Controls: Category Tabs & Source Switcher */}
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-line bg-card/60 backdrop-blur-xs">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-text">
            <span>📄</span>
            <span>Chế độ Ôn Theo Đề (Mô phỏng Đề thi Thực tế)</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Làm bài trực tiếp trên format giấy thi lớp học, hỗ trợ gõ đáp án hoặc bấm chọn từ nhanh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs: Choose 1 of 3 */}
          <div className="flex items-center gap-1 p-1 bg-unk-bg rounded-xl border border-line text-xs font-bold">
            <button
              type="button"
              onClick={() => setCategory("kanji")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                category === "kanji"
                  ? "bg-card text-accent shadow-xs border border-line/60"
                  : "text-muted hover:text-text"
              }`}
            >
              <span>🈸</span>
              <span>Chữ Hán (漢字)</span>
            </button>
            <button
              type="button"
              onClick={() => setCategory("vocab")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                category === "vocab"
                  ? "bg-card text-accent shadow-xs border border-line/60"
                  : "text-muted hover:text-text"
              }`}
            >
              <span>📖</span>
              <span>Từ vựng (ことば)</span>
            </button>
            <button
              type="button"
              disabled
              title="Phần ngữ pháp sẽ cập nhật sau khi bạn gửi đề ngữ pháp"
              className="px-3 py-1.5 rounded-lg text-muted/50 cursor-not-allowed flex items-center gap-1"
            >
              <span>🔒</span>
              <span>Ngữ pháp (Sắp ra mắt)</span>
            </button>
          </div>

          {/* Exam Source Toggle */}
          <select
            value={examSource}
            onChange={(e) => setExamSource(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-line bg-card font-medium"
          >
            <option value="sample">Đề mẫu lớp học (Ảnh 7課)</option>
            <option value="dynamic">Đề tự sinh từ kho quét ({scannedItems.length} từ)</option>
          </select>

          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="px-3 py-1.5 rounded-xl border border-line bg-card text-xs font-semibold hover:bg-unk-bg transition-all"
            >
              Quay lại
            </button>
          )}
        </div>
      </div>

      {/* ===================== THE AUTHENTIC JAPANESE EXAM PAPER ===================== */}
      <div className="bg-white text-zinc-900 border border-zinc-300 rounded-3xl shadow-2xl p-6 sm:p-10 font-ja max-w-4xl mx-auto space-y-6 relative overflow-hidden">
        {/* Paper Header */}
        <div className="border-b-2 border-zinc-800 pb-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-24 hidden sm:block" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-center text-zinc-950 underline decoration-2 underline-offset-8">
              {currentExam.title}
            </h1>

            {/* Red Teacher Grading Stamp */}
            <div className="border-2 border-red-600 rounded-2xl px-4 py-2 text-center bg-red-50/50 min-w-[120px] shadow-xs">
              <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                Điểm bài thi
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-tight">
                {gradingResult ? `${gradingResult.totalScore}` : "—"}
                <span className="text-sm font-bold text-zinc-500 font-sans ml-1">
                  / {currentExam.maxScore}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-sans font-medium">
                (1 問 2 点)
              </div>
            </div>
          </div>

          {/* Student Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-zinc-700 font-medium pt-2">
            <div>
              <span>学籍番号：</span>
              <span className="font-mono underline px-2 font-bold text-zinc-900">
                FU260953
              </span>
            </div>
            <div>
              <span>クラス：</span>
              <span className="underline px-2 font-bold text-zinc-900">
                みどり
              </span>
            </div>
            <div>
              <span>名前：</span>
              <span className="underline px-2 font-bold text-zinc-900">
                ドゥック アイン
              </span>
            </div>
          </div>
        </div>

        {/* Exam Body: 2 Columns Layout (Questions on Left, Answer Sheet on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Questions & Word Boxes (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {currentExam.sections.map((section) => (
              <div key={section.id} className="space-y-4">
                {/* Section Title */}
                <div className="text-sm sm:text-base font-bold text-zinc-900 bg-zinc-100/90 px-3 py-1.5 rounded-lg border-l-4 border-zinc-800">
                  {section.title}
                </div>

                {/* Optional Word Box (Hộp từ gợi ý cho đề Từ vựng) */}
                {section.wordBox && section.wordBox.length > 0 && (
                  <div className="p-3.5 rounded-2xl border-2 border-dashed border-zinc-400 bg-zinc-50/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600 uppercase tracking-wide">
                      <span>📦 Khung từ cho sẵn (Bấm để điền nhanh):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {section.wordBox.map((w, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={Boolean(gradingResult)}
                          onClick={() => handleSelectWordFromBox(w)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Bấm để đưa từ này vào ô trả lời"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Questions */}
                <div className="space-y-3.5">
                  {section.questions.map((q) => {
                    const isSelected = activeQuestionId === q.id;

                    return (
                      <div
                        key={q.id}
                        onClick={() => setActiveQuestionId(q.id)}
                        className={`p-3 rounded-xl transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-blue-50/60 border-blue-400 shadow-xs"
                            : "bg-transparent border-transparent hover:bg-zinc-50"
                        }`}
                      >
                        {/* Type 1: Image / Context Description */}
                        {q.description && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="font-bold text-blue-600 shrink-0 font-mono text-base">
                              {q.circleNumber}
                            </span>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">
                                Mô tả hình ảnh
                              </span>
                              <p className="text-zinc-800 font-medium leading-relaxed">
                                {q.description}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Type 2: Sentence Prompt (with underlined term or blank) */}
                        {q.sentencePrompt && (
                          <div className="text-xs sm:text-sm leading-relaxed text-zinc-900">
                            {q.sentencePrompt.split(/(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/g).map((part, pIdx) => {
                              if (/^[①-⑩]$/.test(part)) {
                                return (
                                  <span
                                    key={pIdx}
                                    className="font-bold text-blue-600 font-mono text-sm sm:text-base mx-0.5"
                                  >
                                    {part}
                                  </span>
                                );
                              }
                              return <span key={pIdx}>{part}</span>;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN: Authentic Answer Sheet Table (5 cols) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="border-2 border-zinc-800 rounded-2xl overflow-hidden bg-white shadow-md">
              <div className="bg-zinc-800 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between">
                <span>Phiếu điền đáp án</span>
                <span className="text-[11px] font-normal text-zinc-300">
                  {gradingResult ? "Đã chấm điểm" : "Gõ hoặc bấm từ"}
                </span>
              </div>

              <div className="divide-y divide-zinc-200">
                {allQuestions.map((q) => {
                  const record = gradingResult?.answers[q.id];
                  const isFocused = activeQuestionId === q.id;
                  const currentVal = userAnswers[q.id] || "";

                  return (
                    <div
                      key={q.id}
                      className={`flex items-center gap-2 p-2 sm:p-2.5 transition-colors relative ${
                        isFocused ? "bg-blue-50/70" : "hover:bg-zinc-50"
                      }`}
                    >
                      {/* Circle Number */}
                      <span className="font-bold text-zinc-800 font-mono text-base w-7 text-center shrink-0">
                        {q.circleNumber}
                      </span>

                      {/* Input Box */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          disabled={Boolean(gradingResult)}
                          value={currentVal}
                          onFocus={() => setActiveQuestionId(q.id)}
                          onChange={(e) => handleInputChange(q.id, e.target.value)}
                          placeholder="Nhập đáp án..."
                          className={`w-full px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border outline-none transition-all ${
                            record
                              ? record.isCorrect
                                ? "border-green-500 bg-green-50/40 text-green-800 font-bold"
                                : "border-red-400 bg-red-50/40 text-zinc-700 line-through"
                              : isFocused
                              ? "border-blue-500 ring-2 ring-blue-500/20 bg-white"
                              : "border-zinc-300 bg-zinc-50/60 focus:bg-white"
                          }`}
                        />

                        {/* Teacher Red Ink Correction Overlay */}
                        {record && !record.isCorrect && (
                          <div className="absolute -top-3.5 right-1 text-xs font-bold text-red-600 bg-white/95 px-1.5 py-0.2 rounded border border-red-300 shadow-2xs font-ja">
                            ✎ {record.teacherCorrection}
                          </div>
                        )}
                      </div>

                      {/* Status Stamp Icon (⭕ or ❌) */}
                      <div className="w-8 flex items-center justify-center shrink-0">
                        {record ? (
                          record.isCorrect ? (
                            <span
                              className="text-red-600 font-black text-xl leading-none select-none"
                              title="Chính xác (+2đ)"
                            >
                              ⭕
                            </span>
                          ) : (
                            <span
                              className="text-red-600 font-black text-lg leading-none select-none"
                              title={`Sai (Đáp án: ${record.teacherCorrection})`}
                            >
                              ❌
                            </span>
                          )
                        ) : currentVal.trim() ? (
                          <span className="text-zinc-400 text-xs">✓</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {!gradingResult ? (
                <button
                  type="button"
                  onClick={handleGradeExam}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>✍️</span>
                  <span>Nộp bài & Chấm điểm (採点)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetExam}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-xs sm:text-sm transition-all"
                  >
                    Làm lại đề này 🔄
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(category === "kanji" ? "vocab" : "kanji");
                    }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-zinc-800 hover:bg-zinc-100 text-zinc-900 font-bold text-xs sm:text-sm transition-all"
                  >
                    Chuyển sang đề {category === "kanji" ? "Từ vựng" : "Chữ Hán"} ➔
                  </button>
                </div>
              )}

              {/* Demo Helper */}
              {!gradingResult && (
                <button
                  type="button"
                  onClick={handleFillDemoPhotoAnswers}
                  className="w-full py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-[11px] font-semibold text-zinc-600 transition-colors"
                >
                  💡 Điền thử bài làm mẫu của học sinh trong ảnh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Explanations section (shown after grading) */}
        {gradingResult && (
          <div className="border-t-2 border-zinc-200 pt-6 space-y-4">
            <h3 className="font-bold text-base text-zinc-900 flex items-center gap-2">
              <span>📚</span>
              <span>Giải thích chi tiết từng câu:</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allQuestions.map((q) => {
                const rec = gradingResult.answers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      rec?.isCorrect
                        ? "bg-green-50/40 border-green-200 text-zinc-800"
                        : "bg-red-50/40 border-red-200 text-zinc-800"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span className="font-mono text-sm text-zinc-900">
                        Câu {q.circleNumber}
                      </span>
                      <span className={rec?.isCorrect ? "text-green-700" : "text-red-600"}>
                        {rec?.isCorrect ? "+2 điểm" : "0 điểm"}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">
                      Đáp án đúng:{" "}
                      <strong className="text-zinc-950 font-bold">
                        {q.correctAnswer}
                      </strong>
                    </p>
                    {q.explanation && (
                      <p className="mt-1 text-zinc-600">{q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
