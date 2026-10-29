import { describe, it, expect } from "vitest";
import {
  SAMPLE_KANJI_EXAM_7,
  SAMPLE_VOCAB_EXAM_7,
  gradeExamSubmission,
  generateKanjiExamFromItems,
  generateVocabExamFromItems,
  normalizeExamAnswer,
} from "../lib/examEngine";
import { type ScannedItem } from "../lib/db";

describe("Tính năng Ôn theo đề (Mô phỏng đề thi Chữ Hán & Từ vựng)", () => {
  it("1. normalizeExamAnswer loại bỏ khoảng trắng thừa và chuẩn hóa chuỗi", () => {
    expect(normalizeExamAnswer("　魚　")).toBe("魚");
    expect(normalizeExamAnswer("お湯を　わかす。")).toBe("お湯をわかす");
    expect(normalizeExamAnswer("パスタ！")).toBe("パスタ");
  });

  it("2. SAMPLE_KANJI_EXAM_7 chấm đúng số điểm 14/20 theo bài làm thực tế từ ảnh IMG_1008", () => {
    // Dữ liệu bài làm của học viên từ ảnh IMG_1008:
    // Câu 2 học viên làm "菜さい" (sai, đáp án là 野菜) -> 0 điểm
    // Câu 7 học viên làm "洗じます" (sai, đáp án là 洗います) -> 0 điểm
    // 8 câu còn lại đúng -> 16 điểm... wait, trong ảnh: 7 câu đúng x 2 = 14 điểm!
    const mockStudentAnswers: Record<string, string> = {
      "q-k-1": "魚", // Đúng (2đ)
      "q-k-2": "菜さい", // Sai (0đ)
      "q-k-3": "いみ", // Đúng (2đ)
      "q-k-4": "暗い", // Đúng (2đ)
      "q-k-5": "れじあんしょ", // Sai trong ảnh (0đ)
      "q-k-6": "ご飯", // Đúng (2đ)
      "q-k-7": "洗じます", // Sai (0đ)
      "q-k-8": "さとう", // Đúng (2đ)
      "q-k-9": "少し", // Đúng (2đ)
      "q-k-10": "弱い", // Đúng (2đ)
    };

    const result = gradeExamSubmission(SAMPLE_KANJI_EXAM_7, mockStudentAnswers);
    expect(result.totalQuestions).toBe(10);
    expect(result.maxScore).toBe(20);
    expect(result.totalScore).toBe(14); // Đúng 7 câu x 2đ = 14đ, khớp với điểm đỏ 14/20 trong ảnh!
    expect(result.correctCount).toBe(7);

    // Kiểm tra câu sai có chữ sửa chữa của giáo viên
    expect(result.answers["q-k-2"].isCorrect).toBe(false);
    expect(result.answers["q-k-2"].teacherCorrection).toBe("野菜");
  });

  it("3. SAMPLE_VOCAB_EXAM_7 có đủ 2 phần (Mô tả hình ảnh ①..⑤ và Khung từ điền câu ⑥..⑩)", () => {
    expect(SAMPLE_VOCAB_EXAM_7.sections.length).toBe(2);
    expect(SAMPLE_VOCAB_EXAM_7.sections[0].questions.length).toBe(5);
    expect(SAMPLE_VOCAB_EXAM_7.sections[1].questions.length).toBe(5);
    expect(SAMPLE_VOCAB_EXAM_7.sections[1].wordBox?.length).toBeGreaterThan(0);

    const fullCorrectAnswers: Record<string, string> = {
      "q-v-1": "かいぎ",
      "q-v-2": "お湯をわかす",
      "q-v-3": "パスタ",
      "q-v-4": "たいいん",
      "q-v-5": "タマネギ",
      "q-v-6": "ごろ",
      "q-v-7": "いらっしゃいます",
      "q-v-8": "皮",
      "q-v-9": "むきます",
      "q-v-10": "ご覧になりました",
    };

    const result = gradeExamSubmission(SAMPLE_VOCAB_EXAM_7, fullCorrectAnswers);
    expect(result.totalScore).toBe(20);
    expect(result.correctCount).toBe(10);
  });

  it("4. generateKanjiExamFromItems tạo tự động đề thi Chữ Hán từ danh sách mục đã quét", () => {
    const mockItems: ScannedItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `word-${i}`,
      kind: "word",
      surface: `単語${i}`,
      reading: `たんご${i}`,
      meaning: `Nghĩa từ ${i}`,
      examples: [{ ja: `これは単語${i}の例文です。`, vi: "" }],
      level: 5,
      sourceIds: ["scan-1"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    }));

    const exam = generateKanjiExamFromItems(mockItems, "Đề Chữ Hán Thử Nghiệm");
    expect(exam.category).toBe("kanji");
    expect(exam.sections[0].questions.length).toBe(10);
    expect(exam.sections[0].questions[0].circleNumber).toBe("①");
    expect(exam.sections[0].questions[9].circleNumber).toBe("⑩");
  });

  it("5. generateVocabExamFromItems tạo tự động đề thi Từ vựng với 2 phần và khung từ cho sẵn", () => {
    const mockItems: ScannedItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `v-${i}`,
      kind: "word",
      surface: `言葉${i}`,
      reading: `ことば${i}`,
      meaning: `Mô tả từ vựng ${i}`,
      examples: [{ ja: `言葉${i}を使います。`, vi: "" }],
      level: 5,
      sourceIds: ["scan-1"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    }));

    const exam = generateVocabExamFromItems(mockItems, "Đề Từ Vựng Thử Nghiệm");
    expect(exam.category).toBe("vocab");
    expect(exam.sections.length).toBe(2);
    expect(exam.sections[0].questions.length).toBe(5);
    expect(exam.sections[1].questions.length).toBe(5);
    expect(exam.sections[1].wordBox?.length).toBe(10);
  });
});
