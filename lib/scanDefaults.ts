export interface SkillItem {
  id: string;
  slug: string;
  icon: string;
  title: string;
  prompt: string;
  isDefault?: boolean;
}

export type DefaultSkill = SkillItem;

export const DEFAULT_SYSTEM_INSTRUCTIONS =
  "Bạn là trợ lý AI chuyên gia tiếng Nhật (JLPT N5-N1). " +
  "Nhiệm vụ của bạn là nhận diện chính xác văn bản tiếng Nhật trong hình ảnh hoặc bài viết, " +
  "giải bài tập chi tiết (chỉ rõ tại sao đáp án đúng và phân tích các đáp án sai), " +
  "bóc tách toàn bộ từ vựng quan trọng kèm âm Hán Việt, cách đọc Hiragana và nghĩa phù hợp ngữ cảnh, " +
  "đồng thời trích xuất các cấu trúc ngữ pháp kèm công thức kết nối, giải thích ngắn gọn và câu ví dụ từ bài. " +
  "QUY TẮC DỊCH VÀ TRÌNH BÀY BẮT BUỘC: Khi dịch hoặc giải thích, TUYỆT ĐỐI KHÔNG tách thành một khối toàn tiếng Nhật rồi dồn một khối dịch tiếng Việt dài dòng ở dưới gây khó đọc. " +
  "BẮT BUỘC trình bày theo dạng SONG NGỮ ĐỐI CHIẾU DÒNG-THEO-DÒNG: 'Tiếng Nhật (Cách đọc Hiragana) : Nghĩa tiếng Việt sát nghĩa' (Ví dụ: '• 会議（かいぎ）: Cuộc họp, hội nghị'). " +
  "Nếu là câu/đoạn văn thì câu Nhật và câu dịch Việt phải đi liền kề nhau ([Câu Nhật] -> ↳ Dịch: [Câu Việt]). " +
  "Hãy giải thích bằng tiếng Việt tự nhiên, ngắn gọn, súc tích và dễ hiểu cho người tự học.";

export const BUILTIN_SKILLS: SkillItem[] = [
  {
    id: "jlpt-solver",
    slug: "giai-de",
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
    slug: "tu-vung",
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
    slug: "ngu-phap",
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
    slug: "tro-tu",
    icon: "🔍",
    title: "Soi kỹ Trợ từ & Cấu trúc",
    prompt:
      "Phân tích cặn kẽ vai trò của từng trợ từ (は, が, を, に, で, と, へ, より, から, まで, も, ね, よ) " +
      "trong câu. Chỉ rõ tại sao dùng trợ từ này mà không phải trợ từ khác.",
    isDefault: true,
  },
  {
    id: "mnemonic-alert",
    slug: "meo-nho",
    icon: "💡",
    title: "Mẹo nhớ & Từ dễ nhầm",
    prompt:
      "Chỉ ra những từ vựng, chữ Hán hoặc mẫu ngữ pháp có cách viết hoặc phát âm tương tự " +
      "dễ gây nhầm lẫn trong bài thi JLPT, kèm mẹo ghi nhớ nhanh.",
    isDefault: true,
  },
  {
    id: "bilingual-aligner",
    slug: "dich",
    icon: "🌐",
    title: "Dịch sát nghĩa dòng theo dòng",
    prompt:
      "Dịch sát nghĩa từng dòng/mục hoặc từng câu tiếng Nhật trong bài theo định dạng song ngữ đối chiếu gắn liền. " +
      "Quy tắc bắt buộc: Mỗi dòng trình bày 'Tiếng Nhật (Cách đọc Hiragana) : Nghĩa dịch tiếng Việt sát nghĩa'. " +
      "Ví dụ: '• 会議（かいぎ）: Cuộc họp, hội nghị'. " +
      "TUYỆT ĐỐI không dồn tiếng Nhật một khối và tiếng Việt một khối tách rời.",
    isDefault: true,
  },
];

/**
 * Phân tích chuỗi văn bản người dùng nhập để tìm các skill được gọi qua @ hoặc /
 */
export function extractInvokedSkills(text: string, skills: SkillItem[]): SkillItem[] {
  if (!text || !skills.length) return [];
  const invoked: SkillItem[] = [];
  const textLower = text.toLowerCase();

  for (const skill of skills) {
    const atTitle = `@${skill.title.toLowerCase()}`;
    const slashSlug = `/${skill.slug.toLowerCase()}`;
    const slashTitle = `/${skill.title.toLowerCase()}`;
    const atSlug = `@${skill.slug.toLowerCase()}`;

    if (
      textLower.includes(atTitle) ||
      textLower.includes(slashSlug) ||
      textLower.includes(slashTitle) ||
      textLower.includes(atSlug)
    ) {
      if (!invoked.some((s) => s.id === skill.id)) {
        invoked.push(skill);
      }
    }
  }

  return invoked;
}
