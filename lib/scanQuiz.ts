import { type ScannedItem } from "./db";

export type QuizQuestionMode = "mixed" | "ja-vi" | "vi-ja";
export type QuizCategoryType = "all" | "kanji" | "vocab" | "grammar";

export type QuizQuestionType =
  | "word-meaning"
  | "word-recall"
  | "grammar-meaning"
  | "grammar-cloze"
  | "kanji-context"
  | "vocab-context";

export interface ScanQuizQuestion {
  id: string;
  itemId: string;
  itemIndex?: number; // 1-based index in the current list (#1..#58)
  sourceTitle?: string; // e.g. "7課 テスト"
  kind: "word" | "grammar" | "kanji";
  type: QuizQuestionType;
  prompt: string; // The main question prompt (e.g. context sentence with blank or highlighted word)
  contextSentence?: string; // Full sentence with context from the exam
  targetWord?: string; // The target word being tested
  subPrompt?: string; // e.g. "Chọn chữ Hán đúng cho từ trong câu" hoặc "Chọn cách đọc Hiragana đúng"
  reading?: string; // Reading if available
  hint?: string; // e.g., explanation or sentence translation
  options: string[]; // 4 multiple choice options
  optionIndices?: Record<string, number>; // Maps option string to its item index if known (#42, #4, etc.)
  correctAnswer: string;
  explanation?: string;
}

export interface ScanQuizOptions {
  mode?: QuizQuestionMode;
  quizType?: QuizCategoryType;
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

const FALLBACK_KANJI_DISTRACTORS = ["魚", "野菜", "意味", "暗い", "喫茶店", "ご飯", "洗います", "砂糖", "少し", "弱い"];
const FALLBACK_KANA_DISTRACTORS = ["さかな", "やさい", "いみ", "くらい", "きっさてん", "ごはん", "あらいます", "さとう", "すこし", "よわい"];

/**
 * Trộn ngẫu nhiên mảng
 */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Kiểm tra xem từ có chứa ít nhất một chữ Hán (Kanji) không
 */
export function hasKanji(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
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

  const eg = item.examples[0];
  const jaSentence = eg.ja;
  const pattern = item.surface.replace(/^[〜~]/, "").trim();

  if (!pattern) return null;

  let maskedSentence = "";
  let targetBlank = pattern;

  if (jaSentence.includes(pattern)) {
    maskedSentence = jaSentence.replace(pattern, "[ ______ ]");
    targetBlank = pattern;
  } else {
    const cleanP = pattern.split(/[\s+]/).pop() || pattern;
    if (cleanP && jaSentence.includes(cleanP)) {
      maskedSentence = jaSentence.replace(cleanP, "[ ______ ]");
      targetBlank = cleanP;
    } else {
      maskedSentence = `[ ______ ] : ${jaSentence}`;
    }
  }

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
 * Tạo câu hỏi trắc nghiệm Chữ Hán kèm câu ngữ cảnh trích xuất từ đề thi
 */
export function buildKanjiContextQuestions(
  items: ScannedItem[],
  options?: ScanQuizOptions
): ScanQuizQuestion[] {
  const words = items.filter((i) => i.kind === "word");
  if (words.length === 0) return [];

  const questions: ScanQuizQuestion[] = [];
  const allSurfaces = words.map((w) => w.surface);
  const allReadings = words.map((w) => w.reading || w.surface);

  for (let idx = 0; idx < words.length; idx++) {
    const w = words[idx];
    const itemIndex = idx + 1;
    const itemSourceTitle =
      options?.sourceTitle ||
      (w.sourceIds?.[0] && options?.sourceTitleMap?.[w.sourceIds[0]]) ||
      undefined;

    const baseSentence =
      w.examples?.[0]?.ja || `毎日の生活で${w.surface}を使います。`;

    // Luân phiên 2 dạng câu hỏi Chữ Hán như trong đề thi (IMG_1008):
    // Dạng A (chẵn): Hiragana trong câu -> Chọn Chữ Hán đúng
    // Dạng B (lẻ): Chữ Hán trong câu -> Chọn cách đọc Hiragana đúng
    const isKanaToKanji = idx % 2 === 0;

    if (isKanaToKanji) {
      // Dạng A: Hiển thị câu ngữ cảnh với từ Hiragana gạch chân / trong ngoặc
      const kanaWord = w.reading || w.surface;
      let promptSentence = baseSentence;
      if (promptSentence.includes(w.surface)) {
        promptSentence = promptSentence.replace(w.surface, ` [ ${kanaWord} ] `);
      } else if (!promptSentence.includes(kanaWord)) {
        promptSentence = `[ ${kanaWord} ] : ${promptSentence}`;
      }

      // Đáp án đúng là chữ Hán (w.surface)
      const wrongPool = allSurfaces.filter((s) => s !== w.surface);
      while (wrongPool.length < 3) {
        const fb = FALLBACK_KANJI_DISTRACTORS.find((k) => k !== w.surface && !wrongPool.includes(k));
        if (!fb) break;
        wrongPool.push(fb);
      }
      const wrongOpts = shuffle(wrongPool).slice(0, 3);
      const questionOptions = shuffle([w.surface, ...wrongOpts]);

      const optionIndices: Record<string, number> = {};
      questionOptions.forEach((opt) => {
        const foundIdx = words.findIndex((item) => item.surface === opt);
        if (foundIdx >= 0) optionIndices[opt] = foundIdx + 1;
      });

      questions.push({
        id: `quiz-k-context-kanji-${w.id}`,
        itemId: w.id,
        itemIndex,
        sourceTitle: itemSourceTitle,
        kind: "kanji",
        type: "kanji-context",
        prompt: promptSentence.trim(),
        targetWord: kanaWord,
        subPrompt: `Chọn chữ Hán đúng cho từ trong ngoặc: "${kanaWord}"`,
        contextSentence: baseSentence,
        reading: w.reading,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet} (Nghĩa: ${w.meaning})` : `Nghĩa: ${w.meaning}`,
        options: questionOptions,
        optionIndices,
        correctAnswer: w.surface,
        explanation: `Chữ Hán chuẩn: ${w.surface} [${w.reading || ""}]${w.hanViet ? ` (${w.hanViet})` : ""}: ${w.meaning}. Câu đầy đủ: "${baseSentence}"`,
      });
    } else {
      // Dạng B: Hiển thị câu ngữ cảnh với Chữ Hán -> Chọn cách đọc Hiragana đúng
      let promptSentence = baseSentence;
      if (promptSentence.includes(w.surface)) {
        promptSentence = promptSentence.replace(w.surface, ` [ ${w.surface} ] `);
      } else {
        promptSentence = `[ ${w.surface} ] : ${promptSentence}`;
      }

      const correctReading = w.reading || w.surface;
      const wrongPool = allReadings.filter((r) => r !== correctReading);
      while (wrongPool.length < 3) {
        const fb = FALLBACK_KANA_DISTRACTORS.find((k) => k !== correctReading && !wrongPool.includes(k));
        if (!fb) break;
        wrongPool.push(fb);
      }
      const wrongOpts = shuffle(wrongPool).slice(0, 3);
      const questionOptions = shuffle([correctReading, ...wrongOpts]);

      const optionIndices: Record<string, number> = {};
      questionOptions.forEach((opt) => {
        const foundIdx = words.findIndex((item) => item.reading === opt || item.surface === opt);
        if (foundIdx >= 0) optionIndices[opt] = foundIdx + 1;
      });

      questions.push({
        id: `quiz-k-context-reading-${w.id}`,
        itemId: w.id,
        itemIndex,
        sourceTitle: itemSourceTitle,
        kind: "kanji",
        type: "kanji-context",
        prompt: promptSentence.trim(),
        targetWord: w.surface,
        subPrompt: `Chọn cách đọc Hiragana đúng cho chữ Hán: "${w.surface}"`,
        contextSentence: baseSentence,
        reading: correctReading,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet}` : undefined,
        options: questionOptions,
        optionIndices,
        correctAnswer: correctReading,
        explanation: `Cách đọc đúng của ${w.surface} là "${correctReading}". Nghĩa: ${w.meaning}. Câu đầy đủ: "${baseSentence}"`,
      });
    }
  }

  return questions;
}

/**
 * Tạo câu hỏi trắc nghiệm Từ Vựng kèm câu đục lỗ / ngữ cảnh trích xuất từ đề thi
 */
export function buildVocabContextQuestions(
  items: ScannedItem[],
  options?: ScanQuizOptions
): ScanQuizQuestion[] {
  const words = items.filter((i) => i.kind === "word");
  if (words.length === 0) return [];

  const questions: ScanQuizQuestion[] = [];
  const allSurfaces = words.map((w) => w.surface);

  for (let idx = 0; idx < words.length; idx++) {
    const w = words[idx];
    const itemIndex = idx + 1;
    const itemSourceTitle =
      options?.sourceTitle ||
      (w.sourceIds?.[0] && options?.sourceTitleMap?.[w.sourceIds[0]]) ||
      undefined;

    const baseSentence = w.examples?.[0]?.ja;

    if (baseSentence && baseSentence.includes(w.surface)) {
      // Dạng 1: Đục lỗ trong câu văn ngữ cảnh như trong đề (IMG_1009)
      const maskedSentence = baseSentence.replace(w.surface, "[ ______ ]");

      const wrongPool = allSurfaces.filter((s) => s !== w.surface);
      while (wrongPool.length < 3) {
        const fb = COMMON_WORD_DISTRACTORS.find((d) => d !== w.meaning && !wrongPool.includes(d));
        if (!fb) break;
        wrongPool.push(fb);
      }
      const wrongOpts = shuffle(wrongPool).slice(0, 3);
      const questionOptions = shuffle([w.surface, ...wrongOpts]);

      const optionIndices: Record<string, number> = {};
      questionOptions.forEach((opt) => {
        const foundIdx = words.findIndex((item) => item.surface === opt);
        if (foundIdx >= 0) optionIndices[opt] = foundIdx + 1;
      });

      questions.push({
        id: `quiz-v-context-cloze-${w.id}`,
        itemId: w.id,
        itemIndex,
        sourceTitle: itemSourceTitle,
        kind: "word",
        type: "vocab-context",
        prompt: maskedSentence,
        targetWord: w.surface,
        subPrompt: "Chọn từ vựng đúng để điền vào chỗ trống [ ______ ] trong câu:",
        contextSentence: baseSentence,
        reading: w.reading,
        hint: w.examples?.[0]?.vi ? `Dịch câu: "${w.examples[0].vi}"` : `Nghĩa của từ: ${w.meaning}`,
        options: questionOptions,
        optionIndices,
        correctAnswer: w.surface,
        explanation: `Điền "${w.surface}" [${w.reading || ""}] (${w.meaning}). Câu đầy đủ: "${baseSentence}"${w.examples?.[0]?.vi ? ` - Dịch: ${w.examples[0].vi}` : ""}`,
      });
    } else {
      // Dạng 2: Câu hỏi theo ngữ cảnh tình huống / mô tả
      const promptText = `[Ngữ cảnh / Tình huống]: ${w.meaning || w.surface}`;

      const wrongPool = allSurfaces.filter((s) => s !== w.surface);
      while (wrongPool.length < 3) {
        const fb = COMMON_WORD_DISTRACTORS.find((d) => d !== w.meaning && !wrongPool.includes(d));
        if (!fb) break;
        wrongPool.push(fb);
      }
      const wrongOpts = shuffle(wrongPool).slice(0, 3);
      const questionOptions = shuffle([w.surface, ...wrongOpts]);

      const optionIndices: Record<string, number> = {};
      questionOptions.forEach((opt) => {
        const foundIdx = words.findIndex((item) => item.surface === opt);
        if (foundIdx >= 0) optionIndices[opt] = foundIdx + 1;
      });

      questions.push({
        id: `quiz-v-context-desc-${w.id}`,
        itemId: w.id,
        itemIndex,
        sourceTitle: itemSourceTitle,
        kind: "word",
        type: "vocab-context",
        prompt: promptText,
        targetWord: w.surface,
        subPrompt: "Từ vựng tiếng Nhật phù hợp với tình huống này là gì?",
        reading: w.reading,
        hint: w.hanViet ? `Âm Hán Việt: ${w.hanViet}` : undefined,
        options: questionOptions,
        optionIndices,
        correctAnswer: w.surface,
        explanation: `Từ phù hợp là: ${w.surface} [${w.reading || ""}] nghĩa là "${w.meaning}"`,
      });
    }
  }

  return questions;
}

/**
 * Sinh bộ câu hỏi ôn tập cho danh sách các mục đã quét
 * Hỗ trợ tạo trắc nghiệm ngữ cảnh cho Chữ Hán (quizType === "kanji")
 * và Từ vựng (quizType === "vocab").
 */
export function generateScanQuizBatch(
  items: ScannedItem[],
  maxCount: number | "all" = "all",
  options?: ScanQuizOptions
): ScanQuizQuestion[] {
  if (!items || items.length === 0) return [];

  const quizType = options?.quizType || "all";

  // Khi người dùng chọn ôn trắc nghiệm Chữ Hán kèm ngữ cảnh
  if (quizType === "kanji") {
    const kanjiQuestions = buildKanjiContextQuestions(items, options);
    if (maxCount === "all" || typeof maxCount !== "number") {
      return kanjiQuestions;
    }
    return kanjiQuestions.slice(0, maxCount);
  }

  // Khi người dùng chọn ôn trắc nghiệm Từ Vựng kèm ngữ cảnh
  if (quizType === "vocab") {
    const vocabQuestions = buildVocabContextQuestions(items, options);
    if (maxCount === "all" || typeof maxCount !== "number") {
      return vocabQuestions;
    }
    return vocabQuestions.slice(0, maxCount);
  }

  // Chế độ chung (Word + Grammar)
  const words = items.filter((i) => i.kind === "word");
  const grammars = items.filter((i) => i.kind === "grammar");

  const questions: ScanQuizQuestion[] = [];
  const mode = options?.mode || "mixed";

  const wordIndexMap = new Map<string, number>();
  words.forEach((w, idx) => {
    wordIndexMap.set(w.id, idx + 1);
  });

  // Sinh câu hỏi từ vựng
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

  // Sinh câu hỏi ngữ pháp
  for (let gIdx = 0; gIdx < grammars.length; gIdx++) {
    const g = grammars[gIdx];
    const itemIndex = words.length + gIdx + 1;
    const itemSourceTitle =
      options?.sourceTitle ||
      (g.sourceIds?.[0] && options?.sourceTitleMap?.[g.sourceIds[0]]) ||
      undefined;

    const clozeQ = makeGrammarClozeQuestion(g, grammars, itemIndex, itemSourceTitle);
    if (clozeQ && Math.random() > 0.3) {
      questions.push(clozeQ);
    } else {
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
 * Chia danh sách từ vựng thành các đợt cho trò chơi ghép cặp phản xạ
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
