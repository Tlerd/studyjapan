import { type ScannedItem } from "./db";

export type QuizQuestionMode = "mixed" | "ja-vi" | "vi-ja";

export interface ScanQuizQuestion {
  id: string;
  itemId: string;
  itemIndex?: number; // 1-based index in the current list (#1..#58)
  sourceTitle?: string; // e.g. "旅行の準備"
  kind: "word" | "grammar";
  type: "word-meaning" | "word-recall" | "grammar-meaning" | "grammar-cloze";
  prompt: string; // The main question prompt (e.g., Japanese word, or sentence with blank)
  reading?: string; // Reading if available
  hint?: string; // e.g., explanation or sentence translation
  options: string[]; // 4 multiple choice options
  optionIndices?: Record<string, number>; // Maps option string to its item index if known (#42, #4, etc.)
  correctAnswer: string;
  explanation?: string;
}

export interface ScanQuizOptions {
  mode?: QuizQuestionMode;
  sourceTitle?: string;
  sourceTitleMap?: Record<string, string>;
}

export interface ReflexCard {
  id: string; // unique card id, e.g. "c1-sw-カニ-0"
  itemId: string;
  itemIndex: number; // 1-based index (#1..#58)
  column: "surface" | "reading" | "meaning";
  text: string;
}

export interface ReflexRound {
  roundIndex: number; // 0-based
  roundNumber: number; // 1-based: 1..totalRounds
  totalRounds: number;
  totalWords: number;
  items: ScannedItem[];
  column1: ReflexCard[];
  column2: ReflexCard[];
  column3: ReflexCard[];
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
  otherGrammar: ScannedItem[],
  itemIndex?: number,
  sourceTitle?: string
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

  const fallbackGrammarDistractors = [
    "ている",
    "てある",
    "てしまう",
    "ておく",
    "なければならない",
    "てもいい",
    "たことがある",
  ];

  const wrongOptions = shuffle([...distractorPool, ...fallbackGrammarDistractors])
    .filter((d) => d !== targetBlank)
    .slice(0, 3);

  const options = shuffle([targetBlank, ...wrongOptions]);

  return {
    id: `quiz-cloze-${item.id}-${Date.now()}`,
    itemId: item.id,
    itemIndex,
    sourceTitle,
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
 * Khi maxCount là "all" hoặc không truyền thì giữ nguyên toàn bộ số câu hỏi,
 * không giới hạn 10 câu.
 */
export function generateScanQuizBatch(
  items: ScannedItem[],
  maxCount: number | "all" = "all",
  options?: ScanQuizOptions
): ScanQuizQuestion[] {
  if (!items || items.length === 0) return [];

  const words = items.filter((i) => i.kind === "word");
  const grammars = items.filter((i) => i.kind === "grammar");

  const questions: ScanQuizQuestion[] = [];
  const mode = options?.mode || "mixed";

  // Tạo map tra cứu chỉ số 1-based cho từng từ (#1..#N)
  const wordIndexMap = new Map<string, number>();
  words.forEach((w, idx) => {
    wordIndexMap.set(w.id, idx + 1);
  });

  // 1. Sinh câu hỏi từ vựng
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const w = words[wIdx];
    const itemIndex = wIdx + 1;
    const itemSourceTitle =
      options?.sourceTitle ||
      (w.sourceIds?.[0] && options?.sourceTitleMap?.[w.sourceIds[0]]) ||
      undefined;

    let isMeaningQuestion = true;
    if (mode === "ja-vi") {
      isMeaningQuestion = true;
    } else if (mode === "vi-ja") {
      isMeaningQuestion = false;
    } else {
      isMeaningQuestion = Math.random() > 0.5;
    }

    if (isMeaningQuestion) {
      // Câu hỏi: Hiển thị Từ tiếng Nhật -> Chọn Nghĩa tiếng Việt
      const otherWords = words.filter((ow) => ow.id !== w.id && ow.meaning);
      const wrongWordOptions = shuffle(otherWords).slice(0, 3);

      const wrongMeanings = wrongWordOptions.map((ow) => ow.meaning);
      while (wrongMeanings.length < 3) {
        const fallback = COMMON_WORD_DISTRACTORS.find(
          (d) => d !== w.meaning && !wrongMeanings.includes(d)
        );
        if (!fallback) break;
        wrongMeanings.push(fallback);
      }

      const allOptions = shuffle([w.meaning, ...wrongMeanings]);
      const optionIndices: Record<string, number> = {};
      optionIndices[w.meaning] = itemIndex;

      for (const ow of wrongWordOptions) {
        const idx = wordIndexMap.get(ow.id);
        if (idx !== undefined) {
          optionIndices[ow.meaning] = idx;
        }
      }

      questions.push({
        id: `quiz-wm-${w.id}`,
        itemId: w.id,
        itemIndex,
        sourceTitle: itemSourceTitle,
        kind: "word",
        type: "word-meaning",
        prompt: w.surface,
        reading: w.reading,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet}` : undefined,
        options: allOptions,
        optionIndices,
        correctAnswer: w.meaning,
        explanation: `${w.surface} [${w.reading || ""}]${w.hanViet ? ` (${w.hanViet})` : ""}: ${w.meaning}`,
      });
    } else {
      // Câu hỏi: Hiển thị Nghĩa tiếng Việt -> Chọn Từ tiếng Nhật
      const otherWords = words.filter((ow) => ow.id !== w.id && ow.surface);
      const wrongWordOptions = shuffle(otherWords).slice(0, 3);

      const wrongSurfaces = wrongWordOptions.map((ow) => ow.surface);
      const fallbackWords = ["学生", "大学", "毎日", "日本", "電車", "仕事", "友達"];
      while (wrongSurfaces.length < 3) {
        const fallback = fallbackWords.find(
          (d) => d !== w.surface && !wrongSurfaces.includes(d)
        );
        if (!fallback) break;
        wrongSurfaces.push(fallback);
      }

      const allOptions = shuffle([w.surface, ...wrongSurfaces]);
      const optionIndices: Record<string, number> = {};
      optionIndices[w.surface] = itemIndex;

      for (const ow of wrongWordOptions) {
        const idx = wordIndexMap.get(ow.id);
        if (idx !== undefined) {
          optionIndices[ow.surface] = idx;
        }
      }

      questions.push({
        id: `quiz-wr-${w.id}`,
        itemId: w.id,
        itemIndex,
        sourceTitle: itemSourceTitle,
        kind: "word",
        type: "word-recall",
        prompt: w.meaning,
        reading: w.reading,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet}` : undefined,
        options: allOptions,
        optionIndices,
        correctAnswer: w.surface,
        explanation: `${w.surface} [${w.reading || ""}] nghĩa là "${w.meaning}"`,
      });
    }
  }

  // 2. Sinh câu hỏi ngữ pháp
  for (let gIdx = 0; gIdx < grammars.length; gIdx++) {
    const g = grammars[gIdx];
    const itemIndex = words.length + gIdx + 1;
    const itemSourceTitle =
      options?.sourceTitle ||
      (g.sourceIds?.[0] && options?.sourceTitleMap?.[g.sourceIds[0]]) ||
      undefined;

    // Ưu tiên bài tập đục lỗ nếu có câu ví dụ
    const clozeQ = makeGrammarClozeQuestion(g, grammars, itemIndex, itemSourceTitle);
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
        itemIndex,
        sourceTitle: itemSourceTitle,
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

  const shuffledQuestions = shuffle(questions);
  if (maxCount === "all" || typeof maxCount !== "number") {
    return shuffledQuestions;
  }
  return shuffledQuestions.slice(0, maxCount);
}

/**
 * Chia danh sách từ vựng thành các đợt cho trò chơi ghép cặp phản xạ (mặc định 6 từ mỗi đợt)
 */
export function buildReflexRounds(
  items: ScannedItem[],
  batchSize = 6
): ReflexRound[] {
  const words = items.filter((i) => i.kind === "word");
  if (words.length === 0) return [];

  const totalWords = words.length;
  const safeBatch = Math.max(1, batchSize);
  const totalRounds = Math.ceil(totalWords / safeBatch);
  const rounds: ReflexRound[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const start = r * safeBatch;
    const chunk = words.slice(start, start + safeBatch);

    const c1: ReflexCard[] = [];
    const c2: ReflexCard[] = [];
    const c3: ReflexCard[] = [];

    chunk.forEach((item, idx) => {
      const globalIndex = start + idx + 1;
      const reading = item.reading?.trim() || item.surface;
      const meaning = item.meaning?.trim() || "Chưa có nghĩa";

      c1.push({
        id: `c1-${item.id}-${r}`,
        itemId: item.id,
        itemIndex: globalIndex,
        column: "surface",
        text: item.surface,
      });

      c2.push({
        id: `c2-${item.id}-${r}`,
        itemId: item.id,
        itemIndex: globalIndex,
        column: "reading",
        text: reading,
      });

      c3.push({
        id: `c3-${item.id}-${r}`,
        itemId: item.id,
        itemIndex: globalIndex,
        column: "meaning",
        text: meaning,
      });
    });

    rounds.push({
      roundIndex: r,
      roundNumber: r + 1,
      totalRounds,
      totalWords,
      items: chunk,
      column1: shuffle(c1),
      column2: shuffle(c2),
      column3: shuffle(c3),
    });
  }

  return rounds;
}

/**
 * Kiểm tra xem 3 thẻ đã chọn từ 3 cột khác nhau có ghép đúng một từ không
 */
export function checkReflexMatch(
  card1?: ReflexCard | null,
  card2?: ReflexCard | null,
  card3?: ReflexCard | null
): boolean {
  if (!card1 || !card2 || !card3) return false;
  const cols = new Set([card1.column, card2.column, card3.column]);
  if (cols.size !== 3) return false;
  return card1.itemId === card2.itemId && card2.itemId === card3.itemId;
}
