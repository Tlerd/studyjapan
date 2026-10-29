export type ExamCategory = "kanji" | "vocab" | "grammar";

export type QuestionFormat =
  | "kanji-convert"  // Chuyển đổi Kanji <-> Hiragana (câu gạch chân, điền bảng số ①..⑩)
  | "image-desc"     // Nhìn hình / đọc mô tả ngữ cảnh đoán từ (①..⑤)
  | "word-box-cloze" // Chọn từ trong khung gợi ý điền vào câu đục lỗ (⑥..⑩)
  | "inline-choice"; // Chọn trong ngoặc (dùng cho ngữ pháp sau này)

export interface ExamQuestion {
  id: string;
  orderNumber: number; // 1..10
  circleNumber: string; // "①", "②", ..., "⑩"
  sentencePrompt?: string; // Câu ngữ cảnh chứa từ hoặc chỗ trống
  underlinedWord?: string; // Từ gạch chân trong câu (đề Kanji)
  description?: string; // Mô tả ngữ cảnh hình ảnh (đề Từ vựng phần 1)
  correctAnswer: string; // Đáp án chuẩn giáo viên
  acceptableAnswers?: string[]; // Các biến thể chấp nhận được
  teacherCorrectionNote?: string; // Chữ đỏ chữa bài của giáo viên nếu học sinh sai
  points: number; // Điểm số câu hỏi (mặc định 2 điểm)
  explanation?: string; // Giải thích thêm
}

export interface ExamSection {
  id: string;
  title: string; // e.g. "§ 漢字をひらがなで、ひらがなを漢字で書いてください。" hoặc "§ これは何ですか。"
  format: QuestionFormat;
  wordBox?: string[]; // Khung từ gợi ý cho dạng word-box-cloze
  questions: ExamQuestion[];
}

export interface ExamPaper {
  id: string;
  sourceId?: string; // Id của lần quét nếu tạo từ ảnh
  title: string; // e.g. "漢字たまご 7課 テスト" hoặc "ことばテスト 7課 テスト"
  lesson?: string; // e.g. "7課"
  category: ExamCategory;
  maxScore: number; // Mặc định 20
  pointsPerQuestion: number; // Mặc định 2
  sections: ExamSection[];
  isSample?: boolean;
}

export interface ExamAnswerRecord {
  questionId: string;
  circleNumber: string;
  userAnswer: string;
  isCorrect: boolean;
  scoreAwarded: number;
  correctAnswer: string;
  teacherCorrection: string;
}

export interface ExamGradingResult {
  paperId: string;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  answers: Record<string, ExamAnswerRecord>;
  gradedAt: string;
}
