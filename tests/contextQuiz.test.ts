import { describe, it, expect } from "vitest";
import { type ScannedItem } from "../lib/db";
import {
  buildKanjiContextQuestions,
  buildVocabContextQuestions,
  generateScanQuizBatch,
} from "../lib/scanQuiz";

describe("Trắc nghiệm ngữ cảnh Chữ Hán & Từ vựng từ đề thi", () => {
  const mockExamWords: ScannedItem[] = [
    {
      id: "sw-sakana",
      kind: "word",
      surface: "魚",
      reading: "さかな",
      hanViet: "NGƯ",
      meaning: "cá",
      examples: [
        {
          ja: "さかなは好きですが、やさいは好きじゃありません。",
          vi: "Tôi thích cá nhưng không thích rau.",
        },
      ],
      level: 5,
      sourceIds: ["scan-kanji-7"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    },
    {
      id: "sw-imi",
      kind: "word",
      surface: "意味",
      reading: "いみ",
      hanViet: "Ý VỊ",
      meaning: "ý nghĩa",
      examples: [
        {
          ja: "このことばの意味が分かりません。",
          vi: "Tôi không hiểu ý nghĩa của từ này.",
        },
      ],
      level: 5,
      sourceIds: ["scan-kanji-7"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    },
    {
      id: "sw-kawa",
      kind: "word",
      surface: "皮",
      reading: "かわ",
      hanViet: "BÌ",
      meaning: "vỏ",
      examples: [
        {
          ja: "ジャガイモの皮をむきます。",
          vi: "Gọt vỏ khoai tây.",
        },
      ],
      level: 5,
      sourceIds: ["scan-vocab-7"],
      pushedToMainSRS: false,
      addedAt: new Date().toISOString(),
    },
  ];

  it("1. buildKanjiContextQuestions tạo câu hỏi trắc nghiệm Chữ Hán kèm câu ngữ cảnh gốc", () => {
    const questions = buildKanjiContextQuestions(mockExamWords);
    expect(questions.length).toBe(3);

    // Kiểm tra câu 1: Hiragana -> Chọn Kanji
    const q1 = questions[0];
    expect(q1.kind).toBe("kanji");
    expect(q1.type).toBe("kanji-context");
    expect(q1.prompt).toContain("さかな");
    expect(q1.subPrompt).toContain("Chọn chữ Hán đúng");
    expect(q1.options.length).toBe(4);
    expect(q1.options).toContain(q1.correctAnswer);
    expect(q1.correctAnswer).toBe("魚");

    // Kiểm tra câu 2: Chữ Hán -> Chọn cách đọc Hiragana
    const q2 = questions[1];
    expect(q2.kind).toBe("kanji");
    expect(q2.prompt).toContain("意味");
    expect(q2.subPrompt).toContain("Chọn cách đọc Hiragana đúng");
    expect(q2.correctAnswer).toBe("いみ");
    expect(q2.options).toContain("いみ");
  });

  it("2. buildVocabContextQuestions tạo câu hỏi đục lỗ trong câu văn ngữ cảnh", () => {
    const questions = buildVocabContextQuestions(mockExamWords);
    expect(questions.length).toBe(3);

    // Kiểm tra câu chứa từ "皮" trong câu "ジャガイモの皮をむきます。"
    const qKawa = questions.find((q) => q.correctAnswer === "皮");
    expect(qKawa).toBeDefined();
    expect(qKawa!.prompt).toContain("[ ______ ]");
    expect(qKawa!.prompt).toContain("ジャガイモの");
    expect(qKawa!.options.length).toBe(4);
    expect(qKawa!.options).toContain("皮");
    expect(qKawa!.subPrompt).toContain("Chọn từ vựng đúng");
  });

  it("3. generateScanQuizBatch với quizType='kanji' tạo trắc nghiệm ngữ cảnh toàn diện", () => {
    const questions = generateScanQuizBatch(mockExamWords, "all", {
      quizType: "kanji",
    });
    expect(questions.length).toBe(3);
    expect(questions.every((q) => q.kind === "kanji")).toBe(true);
  });

  it("4. generateScanQuizBatch với quizType='vocab' tạo trắc nghiệm ngữ cảnh toàn diện", () => {
    const questions = generateScanQuizBatch(mockExamWords, "all", {
      quizType: "vocab",
    });
    expect(questions.length).toBe(3);
    expect(questions.every((q) => q.type === "vocab-context")).toBe(true);
  });

  it("5. Từ vựng không có câu ví dụ tạo câu hỏi mô tả không bị dính prefix hay gạch dưới", () => {
    const wordWithoutExample: ScannedItem[] = [
      {
        id: "sw-fukuro",
        kind: "word",
        surface: "袋",
        reading: "ふくろ",
        meaning: "Túi (Ví dụ: Túi đựng rác)",
        examples: [],
        level: 5,
        sourceIds: ["scan-1"],
        pushedToMainSRS: false,
        addedAt: new Date().toISOString(),
      },
    ];

    const questions = buildVocabContextQuestions(wordWithoutExample);
    expect(questions.length).toBe(1);
    expect(questions[0].prompt).toBe("Túi (Ví dụ: Túi đựng rác)");
    expect(questions[0].prompt).not.toContain("[Ngữ cảnh / Tình huống]");
  });
});
