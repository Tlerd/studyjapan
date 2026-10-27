export interface DefaultSkill {
  id: string;
  icon: string;
  title: string;
  prompt: string;
  isDefault?: boolean;
}

export const DEFAULT_SYSTEM_INSTRUCTIONS =
  "Bạn là trợ lý AI chuyên gia tiếng Nhật (JLPT N5-N1). " +
  "Nhiệm vụ của bạn là nhận diện chính xác văn bản tiếng Nhật trong hình ảnh hoặc bài viết, " +
  "giải bài tập chi tiết (chỉ rõ tại sao đáp án đúng và phân tích các đáp án sai), " +
  "bóc tách toàn bộ từ vựng quan trọng kèm âm Hán Việt, cách đọc Hiragana và nghĩa phù hợp ngữ cảnh, " +
  "đồng thời trích xuất các cấu trúc ngữ pháp kèm công thức kết nối, giải thích ngắn gọn và câu ví dụ từ bài. " +
  "Hãy giải thích bằng tiếng Việt tự nhiên, ngắn gọn, súc tích và dễ hiểu cho người tự học.";

export const BUILTIN_SKILLS: DefaultSkill[] = [
  {
    id: "jlpt-solver",
    icon: "🎯",
    title: "Giải bài tập JLPT",
    prompt:
      "Tập trung phân tích các câu hỏi bài tập trắc nghiệm trong ảnh/văn bản. " +
      "Chỉ rõ đáp án chính xác, dịch câu hỏi, và giải thích chi tiết tại sao chọn đáp án đó " +
      "cùng lý do các đáp án gây nhiễu còn lại không đúng.",
    isDefault: true,
  },
  {
    id: "vocab-extractor",
    icon: "📖",
    title: "Bóc tách Từ vựng & Hán tự",
    prompt:
      "Trích xuất tất cả từ vựng quan trọng, từ ghép và chữ Hán trong bài. " +
      "Ghi rõ cách đọc Hiragana, âm Hán Việt chính xác, nghĩa tiếng Việt theo ngữ cảnh câu " +
      "và cấp độ JLPT ước tính.",
    isDefault: true,
  },
  {
    id: "grammar-analyzer",
    icon: "📐",
    title: "Phân tích Ngữ pháp",
    prompt:
      "Tìm tất cả các mẫu cấu trúc ngữ pháp xuất hiện trong câu/đoạn văn. " +
      "Nêu rõ công thức chia/kết nối (formation), ý nghĩa cốt lõi, giải thích sắc thái sử dụng " +
      "và trích nguyên câu văn trong bài làm ví dụ.",
    isDefault: true,
  },
  {
    id: "particle-focus",
    icon: "🔍",
    title: "Soi kỹ Trợ từ & Cấu trúc",
    prompt:
      "Phân tích cặn kẽ vai trò của từng trợ từ (は, が, を, に, で, と, へ, より, から, まで, も, ね, よ) " +
      "trong câu. Chỉ rõ tại sao dùng trợ từ này mà không phải trợ từ khác.",
    isDefault: false,
  },
  {
    id: "mnemonic-alert",
    icon: "💡",
    title: "Mẹo nhớ & Từ dễ nhầm",
    prompt:
      "Chỉ ra những từ vựng, chữ Hán hoặc mẫu ngữ pháp có cách viết hoặc phát âm tương tự " +
      "dễ gây nhầm lẫn trong bài thi JLPT, kèm mẹo ghi nhớ nhanh.",
    isDefault: false,
  },
];
