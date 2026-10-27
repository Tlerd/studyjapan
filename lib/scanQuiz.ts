import { type ScannedItem } from "./db";

export interface ScanQuizQuestion {
  id: string;
  itemId: string;
  kind: "word" | "grammar";
  type: "word-meaning" | "word-recall" | "grammar-meaning" | "grammar-cloze";
  prompt: string; // The main question prompt (e.g., Japanese word, or sentence with blank)
  reading?: string; // Reading if available
  hint?: string; // e.g., explanation or sentence translation
  options: string[]; // 4 multiple choice options
  correctAnswer: string;
  explanation?: string;
}

const COMMON_WORD_DISTRACTORS = [
  "học tập",
  "trường đại học",
  "sinh viên",
  "nước Nhật",
  "hàng ngày",
  "hôm nay",
  "thời gian",
  "bạn bè",
  "gia đình",
  "giáo viên",
  "công việc",
  "xe điện",
];

const COMMON_GRAMMAR_DISTRACTORS = [
  "đang diễn ra (tiếp diễn)",
  "phải làm gì đó",
  "không được phép làm",
  "có thể làm gì đó",
  "sau khi làm gì đó",
  "thử làm việc gì đó",
  "chuẩn bị làm trước",
  "dù... nhưng vẫn...",
];

/**
 * Trộn ngẫu nhiên mảng
 */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Tạo câu hỏi đục lỗ (Cloze Test) cho mẫu ngữ pháp từ câu ví dụ đã chụp
 */
function makeGrammarClozeQuestion(
  item: ScannedItem,
  otherGrammar: ScannedItem[]
): ScanQuizQuestion | null {
  if (!item.examples || item.examples.length === 0) return null;

  // Lấy câu ví dụ đầu tiên
  const eg = item.examples[0];
  const jaSentence = eg.ja;
  const pattern = item.surface.replace(/^[〜~]/, "").trim();

  if (!pattern) return null;

  // Tìm vị trí của pattern trong câu (hoặc dạng rút gọn)
  let maskedSentence = "";
  let targetBlank = pattern;

  if (jaSentence.includes(pattern)) {
    maskedSentence = jaSentence.replace(pattern, "[ ______ ]");
    targetBlank = pattern;
  } else {
    // Thử tách cụm ngắn hơn nếu có dấu ngã
    const cleanP = pattern.split(/[\s+]/).pop() || pattern;
    if (cleanP && jaSentence.includes(cleanP)) {
      maskedSentence = jaSentence.replace(cleanP, "[ ______ ]");
      targetBlank = cleanP;
    } else {
      maskedSentence = `[ ______ ] : ${jaSentence}`;
    }
  }

  // Thu thập các đáp án sai từ các mẫu ngữ pháp khác
  const distractorPool = otherGrammar
    .filter((g) => g.id !== item.id)
    .map((g) => g.surface.replace(/^[〜~]/, "").trim())
    .filter((s) => Boolean(s) && s !== targetBlank);

  const fallbackGrammarDistractors = ["ている", "てある", "てしまう", "ておく", "なければならない", "てもいい", "たことがある"];

  const wrongOptions = shuffle([...distractorPool, ...fallbackGrammarDistractors])
    .filter((d) => d !== targetBlank)
    .slice(0, 3);

  const options = shuffle([targetBlank, ...wrongOptions]);

  return {
    id: `quiz-cloze-${item.id}-${Date.now()}`,
    itemId: item.id,
    kind: "grammar",
    type: "grammar-cloze",
    prompt: maskedSentence,
    hint: eg.vi ? `Dịch: "${eg.vi}"` : item.meaning,
    options,
    correctAnswer: targetBlank,
    explanation: item.explanation || `Mẫu cấu trúc: ${item.surface} (${item.meaning})`,
  };
}

/**
 * Sinh bộ câu hỏi ôn tập cho danh sách các mục đã quét
 */
export function generateScanQuizBatch(
  items: ScannedItem[],
  maxCount = 10
): ScanQuizQuestion[] {
  if (!items || items.length === 0) return [];

  const words = items.filter((i) => i.kind === "word");
  const grammars = items.filter((i) => i.kind === "grammar");

  const questions: ScanQuizQuestion[] = [];

  // 1. Sinh câu hỏi từ vựng
  for (const w of words) {
    const isMeaningQuestion = Math.random() > 0.5;

    if (isMeaningQuestion) {
      // Câu hỏi: Hiển thị Từ -> Chọn Nghĩa tiếng Việt
      const otherMeanings = words
        .filter((ow) => ow.id !== w.id && ow.meaning)
        .map((ow) => ow.meaning);
      const wrong = shuffle([...otherMeanings, ...COMMON_WORD_DISTRACTORS])
        .filter((m) => m !== w.meaning)
        .slice(0, 3);

      questions.push({
        id: `quiz-wm-${w.id}`,
        itemId: w.id,
        kind: "word",
        type: "word-meaning",
        prompt: w.surface,
        reading: w.reading,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet}` : undefined,
        options: shuffle([w.meaning, ...wrong]),
        correctAnswer: w.meaning,
        explanation: `${w.surface} [${w.reading || ""}]${w.hanViet ? ` (${w.hanViet})` : ""}: ${w.meaning}`,
      });
    } else {
      // Câu hỏi: Hiển thị Nghĩa -> Chọn Từ tiếng Nhật
      const otherWords = words
        .filter((ow) => ow.id !== w.id)
        .map((ow) => ow.surface);
      const fallbackWords = ["学生", "大学", "毎日", "日本", "電車", "仕事", "友達"];
      const wrong = shuffle([...otherWords, ...fallbackWords])
        .filter((s) => s !== w.surface)
        .slice(0, 3);

      questions.push({
        id: `quiz-wr-${w.id}`,
        itemId: w.id,
        kind: "word",
        type: "word-recall",
        prompt: w.meaning,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet}` : undefined,
        options: shuffle([w.surface, ...wrong]),
        correctAnswer: w.surface,
        explanation: `${w.surface} [${w.reading || ""}] nghĩa là "${w.meaning}"`,
      });
    }
  }

  // 2. Sinh câu hỏi ngữ pháp
  for (const g of grammars) {
    // Ưu tiên bài tập đục lỗ nếu có câu ví dụ
    const clozeQ = makeGrammarClozeQuestion(g, grammars);
    if (clozeQ && Math.random() > 0.3) {
      questions.push(clozeQ);
    } else {
      // Câu hỏi trắc nghiệm ý nghĩa ngữ pháp
      const otherMeanings = grammars
        .filter((og) => og.id !== g.id)
        .map((og) => og.meaning);
      const wrong = shuffle([...otherMeanings, ...COMMON_GRAMMAR_DISTRACTORS])
        .filter((m) => m !== g.meaning)
        .slice(0, 3);

      questions.push({
        id: `quiz-gm-${g.id}`,
        itemId: g.id,
        kind: "grammar",
        type: "grammar-meaning",
        prompt: `Ý nghĩa của mẫu cấu trúc: ${g.surface}`,
        hint: g.formation ? `Cách chia: ${g.formation}` : undefined,
        options: shuffle([g.meaning, ...wrong]),
        correctAnswer: g.meaning,
        explanation: `${g.surface} : ${g.meaning}. ${g.explanation || ""}`,
      });
    }
  }

  return shuffle(questions).slice(0, maxCount);
}
