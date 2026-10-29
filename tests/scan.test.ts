import { describe, it, expect } from "vitest";
import { computeTextHash, type ScannedItem } from "../lib/db";
import {
  generateScanQuizBatch,
  buildReflexRounds,
  checkReflexMatch,
  type ReflexCard,
} from "../lib/scanQuiz";

describe("Tính năng Quét ảnh & Kho ôn tập riêng", () => {
  it("1. computeTextHash chuẩn hóa văn bản bỏ khoảng trắng và dấu câu để chống trùng lặp", () => {
    const textA = "毎日、日本語を　勉強しています。";
    const textB = "毎日日本語を勉強しています";
    const hashA = computeTextHash(textA);
    const hashB = computeTextHash(textB);

    expect(hashA).toBe(hashB);
    expect(hashA).toBe("毎日日本語を勉強しています");
  });

  it("2. generateScanQuizBatch tạo câu hỏi trắc nghiệm nghĩa cho Từ vựng với đủ 4 lựa chọn", () => {
    const mockWord: ScannedItem = {
      id: "sw-学生",
      kind: "word",
      surface: "学生",
      reading: "がくせい",
      hanViet: "HỌC SINH",
      meaning: "học sinh, sinh viên",
      examples: [{ ja: "私は学生です。", vi: "Tôi là sinh viên." }],
      level: 5,
      sourceIds: ["scan-1"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    };

    const questions = generateScanQuizBatch([mockWord], 5);
    expect(questions.length).toBeGreaterThan(0);

    const q = questions[0];
    expect(q.kind).toBe("word");
    expect(q.options.length).toBe(4);
    expect(q.options).toContain(q.correctAnswer);
  });

  it("3. generateScanQuizBatch tạo câu hỏi đục lỗ (Cloze Test) ẩn mẫu ngữ pháp trong câu gốc", () => {
    const mockGrammar: ScannedItem = {
      id: "sg-ている",
      kind: "grammar",
      surface: "〜ている",
      meaning: "đang diễn ra (tiếp diễn)",
      formation: "V-て + いる",
      explanation: "Diễn tả hành động đang xảy ra tại thời điểm nói",
      examples: [
        {
          ja: "毎日日本語を勉強している。",
          vi: "Hàng ngày tôi đang học tiếng Nhật.",
        },
      ],
      level: 5,
      sourceIds: ["scan-1"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    };

    const questions = generateScanQuizBatch([mockGrammar], 5);
    expect(questions.length).toBeGreaterThan(0);

    const q = questions[0];
    expect(q.kind).toBe("grammar");
    expect(q.options.length).toBe(4);
    expect(q.options).toContain(q.correctAnswer);

    // Prompt contains blank placeholder
    if (q.type === "grammar-cloze") {
      expect(q.prompt).toContain("[ ______ ]");
    }
  });

  it("4. generateScanQuizBatch tạo câu hỏi cho toàn bộ từ vựng khi maxCount là 'all', không bị giới hạn 10 câu", () => {
    const mockWords: ScannedItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `sw-word-${i}`,
      kind: "word",
      surface: `単語${i}`,
      reading: `たんご${i}`,
      meaning: `nghĩa số ${i}`,
      examples: [],
      level: 5,
      sourceIds: ["scan-1"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    }));

    // Truyền "all" hoặc không truyền maxCount
    const allQuestions = generateScanQuizBatch(mockWords, "all");
    expect(allQuestions.length).toBe(25);

    // Kiểm tra câu hỏi có chứa itemIndex và optionIndices
    const firstQ = allQuestions[0];
    expect(firstQ.itemIndex).toBeGreaterThan(0);
    expect(firstQ.options.length).toBe(4);
  });

  it("5. buildReflexRounds chia 58 từ thành 10 đợt (mỗi đợt 6 từ) với 3 cột thẻ", () => {
    const mock58Words: ScannedItem[] = Array.from({ length: 58 }, (_, i) => ({
      id: `sw-item-${i + 1}`,
      kind: "word",
      surface: `漢字${i + 1}`,
      reading: `よみ${i + 1}`,
      meaning: `nghĩa ${i + 1}`,
      examples: [],
      level: 5,
      sourceIds: ["scan-58"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    }));

    const rounds = buildReflexRounds(mock58Words, 6);
    expect(rounds.length).toBe(10);
    expect(rounds[0].roundNumber).toBe(1);
    expect(rounds[0].totalRounds).toBe(10);
    expect(rounds[0].totalWords).toBe(58);
    expect(rounds[0].column1.length).toBe(6);
    expect(rounds[0].column2.length).toBe(6);
    expect(rounds[0].column3.length).toBe(6);

    // Đợt cuối cùng gồm 4 từ còn lại (58 - 9 * 6 = 4)
    expect(rounds[9].column1.length).toBe(4);
  });

  it("6. checkReflexMatch kiểm tra ghép nối đúng bộ 3 (Kanji, Reading, Meaning) cùng một từ", () => {
    const card1: ReflexCard = {
      id: "c1-sw-1-0",
      itemId: "sw-1",
      itemIndex: 1,
      column: "surface",
      text: "イルカ",
    };
    const card2: ReflexCard = {
      id: "c2-sw-1-0",
      itemId: "sw-1",
      itemIndex: 1,
      column: "reading",
      text: "イルカ",
    };
    const card3: ReflexCard = {
      id: "c3-sw-1-0",
      itemId: "sw-1",
      itemIndex: 1,
      column: "meaning",
      text: "cá heo",
    };

    const wrongCard3: ReflexCard = {
      id: "c3-sw-2-0",
      itemId: "sw-2",
      itemIndex: 2,
      column: "meaning",
      text: "con cua",
    };

    // Đúng bộ 3
    expect(checkReflexMatch(card1, card2, card3)).toBe(true);

    // Khác itemId
    expect(checkReflexMatch(card1, card2, wrongCard3)).toBe(false);

    // Trùng cột (2 thẻ cùng column "surface")
    expect(checkReflexMatch(card1, card1, card3)).toBe(false);

    // Thiếu thẻ
    expect(checkReflexMatch(card1, card2, null)).toBe(false);
  });
});
