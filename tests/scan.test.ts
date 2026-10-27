import { describe, it, expect } from "vitest";
import { computeTextHash, type ScannedItem } from "../lib/db";
import { generateScanQuizBatch } from "../lib/scanQuiz";

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
});
