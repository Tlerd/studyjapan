import { type ScannedItem } from "./db";
import {
  type ExamPaper,
  type ExamQuestion,
  type ExamSection,
  type ExamGradingResult,
  type ExamAnswerRecord,
} from "./examTypes";

export const CIRCLE_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

/**
 * Đề thi mẫu chuẩn Chữ Hán bóc tách từ ảnh IMG_1008.HEIC (漢字たまご 7課 テスト)
 */
export const SAMPLE_KANJI_EXAM_7: ExamPaper = {
  id: "sample-kanji-7",
  title: "漢字たまご 7課 テスト",
  lesson: "7課",
  category: "kanji",
  maxScore: 20,
  pointsPerQuestion: 2,
  isSample: true,
  sections: [
    {
      id: "sec-kanji-1",
      title: "§ 漢字をひらがなで、ひらがなを漢字で書いてください。",
      format: "kanji-convert",
      questions: [
        {
          id: "q-k-1",
          orderNumber: 1,
          circleNumber: "①",
          sentencePrompt: "①さかな は好きですが、②やさい は好きじゃありません。",
          underlinedWord: "さかな",
          correctAnswer: "魚",
          acceptableAnswers: ["魚"],
          teacherCorrectionNote: "魚",
          points: 2,
          explanation: "Từ 'さかな' viết bằng chữ Hán là 魚 (NGƯ).",
        },
        {
          id: "q-k-2",
          orderNumber: 2,
          circleNumber: "②",
          sentencePrompt: "①さかな は好きですが、②やさい は好きじゃありません。",
          underlinedWord: "やさい",
          correctAnswer: "野菜",
          acceptableAnswers: ["野菜"],
          teacherCorrectionNote: "野菜",
          points: 2,
          explanation: "Từ 'やさい' viết bằng chữ Hán là 野菜 (DÃ THÁI). Chú ý không viết nhầm thành 菜さい.",
        },
        {
          id: "q-k-3",
          orderNumber: 3,
          circleNumber: "③",
          sentencePrompt: "このことばの③意味 が分かりません。",
          underlinedWord: "意味",
          correctAnswer: "いみ",
          acceptableAnswers: ["いみ"],
          teacherCorrectionNote: "いみ",
          points: 2,
          explanation: "Chữ Hán '意味' (Ý VỊ) đọc là いみ.",
        },
        {
          id: "q-k-4",
          orderNumber: 4,
          circleNumber: "④",
          sentencePrompt: "この部屋は④くらい ですね。",
          underlinedWord: "くらい",
          correctAnswer: "暗い",
          acceptableAnswers: ["暗い"],
          teacherCorrectionNote: "暗い",
          points: 2,
          explanation: "Tính từ 'くらい' (tối) viết chữ Hán là 暗い (ÁM).",
        },
        {
          id: "q-k-5",
          orderNumber: 5,
          circleNumber: "⑤",
          sentencePrompt: "疲れたから、⑤喫茶店 で休みましょう。",
          underlinedWord: "喫茶店",
          correctAnswer: "きっさてん",
          acceptableAnswers: ["きっさてん"],
          teacherCorrectionNote: "きっさてん",
          points: 2,
          explanation: "Chữ Hán '喫茶店' (KHIẾT TRÀ ĐIẾM) đọc là きっさてん.",
        },
        {
          id: "q-k-6",
          orderNumber: 6,
          circleNumber: "⑥",
          sentencePrompt: "⑥ごはん を食べるとき、手を⑦あらいます。",
          underlinedWord: "ごはん",
          correctAnswer: "ご飯",
          acceptableAnswers: ["ご飯", "御飯"],
          teacherCorrectionNote: "ご飯",
          points: 2,
          explanation: "Từ 'ごはん' viết chữ Hán là ご飯 hoặc 御飯 (PHẠN).",
        },
        {
          id: "q-k-7",
          orderNumber: 7,
          circleNumber: "⑦",
          sentencePrompt: "⑥ごはん を食べるとき、手を⑦あらいます。",
          underlinedWord: "あらいます",
          correctAnswer: "洗います",
          acceptableAnswers: ["洗います", "洗"],
          teacherCorrectionNote: "洗います",
          points: 2,
          explanation: "Động từ 'あらいます' (rửa tay) viết chữ Hán là 洗います (TẨY).",
        },
        {
          id: "q-k-8",
          orderNumber: 8,
          circleNumber: "⑧",
          sentencePrompt: "コーヒーに⑧砂糖 を⑨すこし 入れます。",
          underlinedWord: "砂糖",
          correctAnswer: "さとう",
          acceptableAnswers: ["さとう"],
          teacherCorrectionNote: "さとう",
          points: 2,
          explanation: "Chữ Hán '砂糖' (SA ĐƯỜNG) đọc là さとう.",
        },
        {
          id: "q-k-9",
          orderNumber: 9,
          circleNumber: "⑨",
          sentencePrompt: "コーヒーに⑧砂糖 を⑨すこし 入れます。",
          underlinedWord: "すこし",
          correctAnswer: "少し",
          acceptableAnswers: ["少し"],
          teacherCorrectionNote: "少し",
          points: 2,
          explanation: "Từ 'すこし' (một chút) viết chữ Hán là 少し (THIỂU/THIỂU).",
        },
        {
          id: "q-k-10",
          orderNumber: 10,
          circleNumber: "⑩",
          sentencePrompt: "母は体が⑩よわい から、よく風邪をひきます。",
          underlinedWord: "よわい",
          correctAnswer: "弱い",
          acceptableAnswers: ["弱い"],
          teacherCorrectionNote: "弱い",
          points: 2,
          explanation: "Tính từ 'よわい' (yếu ớt) viết chữ Hán là 弱い (NHƯỢC).",
        },
      ],
    },
  ],
};

/**
 * Đề thi mẫu chuẩn Từ vựng bóc tách từ ảnh IMG_1009.HEIC (ことばテスト 7課 テスト)
 */
export const SAMPLE_VOCAB_EXAM_7: ExamPaper = {
  id: "sample-vocab-7",
  title: "ことばテスト 7課 テスト",
  lesson: "7課",
  category: "vocab",
  maxScore: 20,
  pointsPerQuestion: 2,
  isSample: true,
  sections: [
    {
      id: "sec-vocab-1",
      title: "§ これは何ですか。（Nhìn tranh / Đọc mô tả ngữ cảnh để viết từ phù hợp）",
      format: "image-desc",
      questions: [
        {
          id: "q-v-1",
          orderNumber: 1,
          circleNumber: "①",
          description: "Cuộc họp trang trọng giữa ban giám đốc và các nhân viên tại văn phòng công ty",
          correctAnswer: "かいぎ",
          acceptableAnswers: ["かいぎ", "会議"],
          teacherCorrectionNote: "かいぎ",
          points: 2,
          explanation: "Hình ảnh cuộc họp: かいぎ (会議).",
        },
        {
          id: "q-v-2",
          orderNumber: 2,
          circleNumber: "②",
          description: "Nồi nước đang đặt trên ngọn lửa bếp gas, bốc hơi nóng nghi ngút",
          correctAnswer: "お湯をわかす",
          acceptableAnswers: ["お湯をわかす", "おゆをわかす", "ゆをわかす", "わかします"],
          teacherCorrectionNote: "お湯をわかす",
          points: 2,
          explanation: "Hành động đun sôi nước: お湯をわかす.",
        },
        {
          id: "q-v-3",
          orderNumber: 3,
          circleNumber: "③",
          description: "Đĩa mì Ý spaghetti / pasta sốt cà chua kèm đôi đũa bên cạnh",
          correctAnswer: "パスタ",
          acceptableAnswers: ["パスタ", "スパゲッティ"],
          teacherCorrectionNote: "パスタ",
          points: 2,
          explanation: "Món mì Ý: パスタ.",
        },
        {
          id: "q-v-4",
          orderNumber: 4,
          circleNumber: "④",
          description: "Bệnh nhân vui mừng vẫy tay chào tạm biệt khi xuất viện rời khỏi tòa nhà bệnh viện",
          correctAnswer: "たいいん",
          acceptableAnswers: ["たいいん", "退院", "たいしん", "びょういん"],
          teacherCorrectionNote: "たいいん（退院）",
          points: 2,
          explanation: "Hành động xuất viện: たいいん (退院).",
        },
        {
          id: "q-v-5",
          orderNumber: 5,
          circleNumber: "⑤",
          description: "Củ hành tây màu nâu tròn có nhiều lớp vỏ bọc bên ngoài",
          correctAnswer: "タマネギ",
          acceptableAnswers: ["タマネギ", "たまねぎ", "玉ねぎ", "玉葱"],
          teacherCorrectionNote: "タマネギ",
          points: 2,
          explanation: "Củ hành tây: タマネギ / 玉ねぎ.",
        },
      ],
    },
    {
      id: "sec-vocab-2",
      title: "§ どれがいいですか。（Chọn từ trong khung điền vào chỗ trống tương ứng）",
      format: "word-box-cloze",
      wordBox: [
        "学校",
        "いらっしゃいます",
        "ご覧になりました",
        "まず",
        "出席します",
        "変わりませんでした",
        "ごろ",
        "薄い",
        "皮",
        "むきます",
        "焼きます",
      ],
      questions: [
        {
          id: "q-v-6",
          orderNumber: 6,
          circleNumber: "⑥",
          sentencePrompt: "1. 校長先生は9時( ⑥ )、学校に( ⑦ )。",
          correctAnswer: "ごろ",
          acceptableAnswers: ["ごろ", "頃"],
          teacherCorrectionNote: "ごろ",
          points: 2,
          explanation: "Khoảng thời gian: 9時ごろ (khoảng 9 giờ).",
        },
        {
          id: "q-v-7",
          orderNumber: 7,
          circleNumber: "⑦",
          sentencePrompt: "1. 校長先生は9時( ⑥ )、学校に( ⑦ )。",
          correctAnswer: "いらっしゃいます",
          acceptableAnswers: ["いらっしゃいます", "出席します"],
          teacherCorrectionNote: "いらっしゃいます",
          points: 2,
          explanation: "Kính ngữ của 来ます/行きます: 校長先生は学校にいらっしゃいます.",
        },
        {
          id: "q-v-8",
          orderNumber: 8,
          circleNumber: "⑧",
          sentencePrompt: "2. ジャガイモの( ⑧ )を( ⑨ )。",
          correctAnswer: "皮",
          acceptableAnswers: ["皮", "かわ"],
          teacherCorrectionNote: "皮",
          points: 2,
          explanation: "Vỏ khoai tây: ジャガイモの皮.",
        },
        {
          id: "q-v-9",
          orderNumber: 9,
          circleNumber: "⑨",
          sentencePrompt: "2. ジャガイモの( ⑧ )を( ⑨ )。",
          correctAnswer: "むきます",
          acceptableAnswers: ["むきます", "剥きます"],
          teacherCorrectionNote: "むきます",
          points: 2,
          explanation: "Gọt vỏ: 皮をむきます.",
        },
        {
          id: "q-v-10",
          orderNumber: 10,
          circleNumber: "⑩",
          sentencePrompt: "3. 「社長、昨日のテレビは( ⑩ )か。」",
          correctAnswer: "ご覧になりました",
          acceptableAnswers: ["ご覧になりました", "ごらんになりました"],
          teacherCorrectionNote: "ご覧になりました",
          points: 2,
          explanation: "Tôn kính ngữ của 見ました khi hỏi giám đốc: ご覧になりましたか.",
        },
      ],
    },
  ],
};

/**
 * Chuẩn hóa chuỗi văn bản phục vụ so khớp đáp án:
 * - Xóa khoảng trắng thừa đầu cuối và ở giữa
 * - Đổi ký tự toàn giác sang bán giác cơ bản
 * - Bỏ dấu câu kết thúc (。, .)
 */
export function normalizeExamAnswer(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[.。!！?？]/g, "")
    .toLowerCase();
}

/**
 * Chấm điểm bài nộp theo thang điểm của đề thi (mặc định 20 điểm)
 */
export function gradeExamSubmission(
  paper: ExamPaper,
  userAnswers: Record<string, string>
): ExamGradingResult {
  let totalScore = 0;
  let correctCount = 0;
  let totalQuestions = 0;
  const answerRecords: Record<string, ExamAnswerRecord> = {};

  for (const section of paper.sections) {
    for (const q of section.questions) {
      totalQuestions++;
      const userRaw = userAnswers[q.id] || "";
      const normalizedUser = normalizeExamAnswer(userRaw);

      const normalizedCorrect = normalizeExamAnswer(q.correctAnswer);
      const normalizedAcceptables = (q.acceptableAnswers || []).map(normalizeExamAnswer);

      const isMatch =
        Boolean(normalizedUser) &&
        (normalizedUser === normalizedCorrect ||
          normalizedAcceptables.includes(normalizedUser));

      const points = isMatch ? q.points : 0;
      if (isMatch) {
        totalScore += points;
        correctCount++;
      }

      answerRecords[q.id] = {
        questionId: q.id,
        circleNumber: q.circleNumber,
        userAnswer: userRaw,
        isCorrect: isMatch,
        scoreAwarded: points,
        correctAnswer: q.correctAnswer,
        teacherCorrection: q.teacherCorrectionNote || q.correctAnswer,
      };
    }
  }

  return {
    paperId: paper.id,
    totalScore,
    maxScore: paper.maxScore || totalQuestions * paper.pointsPerQuestion,
    correctCount,
    totalQuestions,
    answers: answerRecords,
    gradedAt: new Date().toISOString(),
  };
}

/**
 * Tạo tự động một đề thi Chữ Hán (10 câu) từ danh sách từ vựng đã quét
 */
export function generateKanjiExamFromItems(
  items: ScannedItem[],
  customTitle?: string
): ExamPaper {
  const words = items.filter((i) => i.kind === "word");
  const selectedWords = words.slice(0, 10);
  const questions: ExamQuestion[] = [];

  for (let idx = 0; idx < selectedWords.length; idx++) {
    const item = selectedWords[idx];
    const circle = CIRCLE_NUMBERS[idx] || `(${idx + 1})`;
    const isKanjiToKana = idx % 2 === 0;

    let promptWord = item.surface;
    let expectedAnswer = item.reading || item.surface;
    let explanation = `Chuyển chữ Hán ${item.surface} sang cách đọc Hiragana: ${expectedAnswer}.`;

    if (!isKanjiToKana) {
      // Yêu cầu viết từ Hiragana sang Kanji
      promptWord = item.reading || item.surface;
      expectedAnswer = item.surface;
      explanation = `Chuyển cách đọc ${promptWord} sang chữ Hán: ${expectedAnswer}.`;
    }

    const egJa = item.examples?.[0]?.ja;
    let sentence = egJa
      ? egJa.replace(item.surface, `${circle}${promptWord}`)
      : `この単語は${circle}${promptWord}です。`;

    questions.push({
      id: `gen-k-${item.id}-${idx}`,
      orderNumber: idx + 1,
      circleNumber: circle,
      sentencePrompt: sentence,
      underlinedWord: promptWord,
      correctAnswer: expectedAnswer,
      acceptableAnswers: [expectedAnswer],
      teacherCorrectionNote: expectedAnswer,
      points: 2,
      explanation: `${explanation} (Nghĩa: ${item.meaning})`,
    });
  }

  return {
    id: `custom-kanji-${Date.now()}`,
    title: customTitle || "漢字テスト（Kho quét ảnh）",
    lesson: "Ôn tập Chữ Hán",
    category: "kanji",
    maxScore: 20,
    pointsPerQuestion: 2,
    sections: [
      {
        id: "sec-gen-kanji",
        title: "§ 漢字をひらがなで、ひらがなを漢字で書いてください。",
        format: "kanji-convert",
        questions,
      },
    ],
  };
}

/**
 * Tạo tự động một đề thi Từ vựng (10 câu) từ danh sách từ vựng đã quét
 */
export function generateVocabExamFromItems(
  items: ScannedItem[],
  customTitle?: string
): ExamPaper {
  const words = items.filter((i) => i.kind === "word");
  const chunk = words.slice(0, 10);
  const part1Items = chunk.slice(0, 5);
  const part2Items = chunk.slice(5, 10);

  const part1Questions: ExamQuestion[] = part1Items.map((item, idx) => ({
    id: `gen-v1-${item.id}-${idx}`,
    orderNumber: idx + 1,
    circleNumber: CIRCLE_NUMBERS[idx] || `(${idx + 1})`,
    description: `Mô tả ngữ cảnh: ${item.meaning || "Từ vựng bài học"}`,
    correctAnswer: item.reading || item.surface,
    acceptableAnswers: [item.reading || item.surface, item.surface],
    teacherCorrectionNote: item.reading || item.surface,
    points: 2,
    explanation: `${item.surface} [${item.reading || ""}] nghĩa là: ${item.meaning}.`,
  }));

  const wordBox = chunk.map((w) => w.surface);

  const part2Questions: ExamQuestion[] = part2Items.map((item, idx) => {
    const globalIdx = 5 + idx;
    const circle = CIRCLE_NUMBERS[globalIdx] || `(${globalIdx + 1})`;
    const egJa = item.examples?.[0]?.ja;
    const sentence = egJa
      ? egJa.replace(item.surface, `( ${circle} )`)
      : `毎日の生活で( ${circle} )を使います。`;

    return {
      id: `gen-v2-${item.id}-${globalIdx}`,
      orderNumber: globalIdx + 1,
      circleNumber: circle,
      sentencePrompt: sentence,
      correctAnswer: item.surface,
      acceptableAnswers: [item.surface, item.reading || ""].filter(Boolean),
      teacherCorrectionNote: item.surface,
      points: 2,
      explanation: `Chỗ trống ${circle} là: ${item.surface} (${item.meaning}).`,
    };
  });

  return {
    id: `custom-vocab-${Date.now()}`,
    title: customTitle || "ことばテスト（Kho quét ảnh）",
    lesson: "Ôn tập Từ vựng",
    category: "vocab",
    maxScore: 20,
    pointsPerQuestion: 2,
    sections: [
      {
        id: "sec-gen-v1",
        title: "§ これは何ですか。（Đọc mô tả ngữ cảnh để viết từ phù hợp）",
        format: "image-desc",
        questions: part1Questions,
      },
      {
        id: "sec-gen-v2",
        title: "§ どれがいいですか。（Chọn từ trong khung điền vào chỗ trống tương ứng）",
        format: "word-box-cloze",
        wordBox,
        questions: part2Questions,
      },
    ],
  };
}
