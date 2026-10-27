"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import * as wanakana from "wanakana";
import { Navbar } from "../../components/Navbar";
import { db } from "../../lib/db";
import { reviewCard, Rating, type ReviewRating, type StudyCard, type StudyItem } from "../../lib/srs";
import {
  getItemAnswer,
  getDistractors,
  getExpectedReading,
  getItemTypeLabel,
} from "../../lib/quiz";
import wordsData from "../../public/words.json";

type Mode = "quiz" | "reflex" | "typing";

export default function PracticePage() {
  const [mode, setMode] = useState<Mode>("quiz");
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [itemsMap, setItemsMap] = useState<Map<string, StudyItem>>(new Map());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [sessionFinished, setSessionFinished] = useState<boolean>(false);

  // Quiz state
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Typing state
  const [typedInput, setTypedInput] = useState<string>("");
  const [typingResult, setTypingResult] = useState<"correct" | "wrong" | null>(null);

  const wordsDb = wordsData as Record<string, any>;

  // Load cards from DB or generate practice batch
  useEffect(() => {
    async function loadPracticeCards() {
      try {
        const allItems = await db.items.toArray();
        const allCards = await db.cards.toArray();
        const iMap = new Map(allItems.map((i) => [i.id, i]));
        setItemsMap(iMap);

        if (allCards.length > 0) {
          // Shuffle cards
          const shuffled = [...allCards].sort(() => Math.random() - 0.5).slice(0, 10);
          setCards(shuffled);
        } else {
          // Fallback: Generate demo batch from common words/kanji
          const demoWords = ["学生", "大学", "学校", "日本", "毎日", "今日"];
          const fallbackCards: StudyCard[] = demoWords.map((w, idx) => ({
            id: `demo-${idx}`,
            itemId: `w-${w}`,
            skill: "recognize",
            fsrsCard: {
              due: new Date(),
              stability: 1,
              difficulty: 1,
              elapsed_days: 1,
              scheduled_days: 1,
              reps: 0,
              lapses: 0,
              learning_steps: 0,
              state: 0,
            },
          }));
          const fallbackItems = new Map<string, StudyItem>();
          demoWords.forEach((w) => {
            fallbackItems.set(`w-${w}`, {
              id: `w-${w}`,
              text: w,
              type: "word",
              level: 5,
              meaning: wordsDb[w]?.meaning || "học sinh",
              addedAt: new Date().toISOString(),
            });
          });
          setItemsMap(fallbackItems);
          setCards(fallbackCards);
        }
      } catch {
        // Fallback
      }
    }
    loadPracticeCards();
  }, [wordsDb]);

  const currentCard = cards[currentIndex];
  const currentItem = currentCard ? itemsMap.get(currentCard.itemId) : null;

  // Generate options for Multiple Choice
  useEffect(() => {
    if (!currentItem) return;
    setStartTime(Date.now());
    setIsAnswered(false);
    setSelectedOption(null);
    setTypedInput("");
    setTypingResult(null);

    const correctAnswer = getItemAnswer(currentItem);
    const distractors = getDistractors(currentItem, correctAnswer);
    const opts = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
    setQuizOptions(opts);
  }, [currentIndex, currentItem]);

  // Answer Quiz Option
  const handleSelectQuiz = async (opt: string) => {
    if (isAnswered || !currentCard || !currentItem) return;
    setIsAnswered(true);
    setSelectedOption(opt);

    const correctAnswer = getItemAnswer(currentItem);
    const isCorrect = opt === correctAnswer;
    const elapsedSec = (Date.now() - startTime) / 1000;

    let rating: ReviewRating = Rating.Good;
    if (!isCorrect) rating = Rating.Again;
    else if (elapsedSec < 2) rating = Rating.Easy;
    else if (elapsedSec > 6) rating = Rating.Hard;

    if (isCorrect) setScore((s) => s + 1);

    // Update FSRS card in DB if not demo
    if (!currentCard.id.startsWith("demo-")) {
      const { updatedCard, todayAgain } = reviewCard(currentCard.fsrsCard, rating);
      await db.cards.update(currentCard.id, {
        fsrsCard: updatedCard,
        todayAgain,
        lastRating: rating,
      });
    }

    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setSessionFinished(true);
      }
    }, 1200);
  };

  // Typing mode submission
  const handleTypingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard || !currentItem || isAnswered) return;

    const expectedReading = getExpectedReading(currentItem);
    const userKana = wanakana.toHiragana(typedInput.trim());

    const isCorrect = userKana === expectedReading || userKana === currentItem.text;
    setIsAnswered(true);
    setTypingResult(isCorrect ? "correct" : "wrong");

    if (isCorrect) setScore((s) => s + 1);

    const rating: ReviewRating = isCorrect ? Rating.Good : Rating.Again;
    if (!currentCard.id.startsWith("demo-")) {
      const { updatedCard, todayAgain } = reviewCard(currentCard.fsrsCard, rating);
      await db.cards.update(currentCard.id, {
        fsrsCard: updatedCard,
        todayAgain,
        lastRating: rating,
      });
    }

    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setSessionFinished(true);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Mode Selector */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h1 className="text-xl font-bold">Luyện tập Nâng bậc</h1>
          </div>

          <div className="inline-flex rounded-xl border border-line bg-card p-1">
            <button
              type="button"
              onClick={() => {
                setMode("quiz");
                setCurrentIndex(0);
                setSessionFinished(false);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                mode === "quiz" ? "bg-accent text-accent-ink shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Trắc nghiệm
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("typing");
                setCurrentIndex(0);
                setSessionFinished(false);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                mode === "typing" ? "bg-accent text-accent-ink shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Gõ đáp án
            </button>
          </div>
        </div>

        {/* Practice Body */}
        {!sessionFinished && currentItem ? (
          <div className="card p-6 sm:p-8 space-y-6 text-center">
            {/* Progress bar */}
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Câu {currentIndex + 1} / {cards.length}
              </span>
              <span>Điểm: {score}</span>
            </div>
            <div className="w-full h-1.5 bg-bar-track rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>

            {/* Prompt Question */}
            <div className="py-6 space-y-2">
              <span className="text-xs font-semibold uppercase text-muted tracking-wider">
                {getItemTypeLabel(currentItem)}
              </span>
              <div className="font-ja text-5xl sm:text-6xl font-extrabold text-accent">
                {currentItem.text}
              </div>
            </div>

            {/* Mode 1: Multiple Choice */}
            {mode === "quiz" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                {quizOptions.map((opt) => {
                  let btnStyle = "border-line bg-card text-text hover:border-accent";
                  if (isAnswered) {
                    const correct = getItemAnswer(currentItem);
                    if (opt === correct) {
                      btnStyle = "border-green-brand bg-green-brand/20 text-ok-ink font-bold";
                    } else if (opt === selectedOption) {
                      btnStyle = "border-red-500 bg-red-500/20 text-no-ink";
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectQuiz(opt)}
                      className={`p-3.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Typing Answer */}
            {mode === "typing" && (
              <form onSubmit={handleTypingSubmit} className="max-w-md mx-auto space-y-3">
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswered}
                  value={typedInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^[a-zA-Z\s\-]+$/.test(v)) {
                      setTypedInput(wanakana.toHiragana(v));
                    } else {
                      setTypedInput(v);
                    }
                  }}
                  placeholder="Gõ cách đọc bằng romaji hoặc kana (vd: gakusei)..."
                  className="w-full text-center text-lg p-3 rounded-xl border border-line bg-card text-text focus:outline-none focus:ring-2 focus:ring-accent font-ja"
                />
                <button
                  type="submit"
                  disabled={isAnswered || !typedInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-accent text-accent-ink font-bold text-sm shadow-md hover:opacity-90 disabled:opacity-50"
                >
                  Xác nhận
                </button>

                {typingResult && (
                  <p
                    className={`text-sm font-bold ${
                      typingResult === "correct" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {typingResult === "correct"
                      ? "✓ Chính xác!"
                      : `❌ Chưa đúng! Đáp án: ${getExpectedReading(currentItem)} (${getItemAnswer(
                          currentItem
                        )})`}
                  </p>
                )}
              </form>
            )}
          </div>
        ) : (
          /* Finished Session Card */
          <div className="card text-center p-8 space-y-4">
            <span className="text-5xl block">🏆</span>
            <h2 className="text-2xl font-bold">Hoàn thành phiên luyện tập!</h2>
            <p className="text-sm text-muted">
              Bạn đã trả lời đúng {score} / {cards.length} câu.
              Lịch ôn FSRS đã tự động cập nhật độ giãn cách cho từng thẻ.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setScore(0);
                  setSessionFinished(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-accent text-accent-ink font-bold text-sm shadow-md hover:opacity-90"
              >
                Luyện tập tiếp
              </button>
              <Link
                href="/on"
                className="px-6 py-2.5 rounded-xl border border-line bg-card font-bold text-sm hover:border-accent"
              >
                Về bộ đề
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
