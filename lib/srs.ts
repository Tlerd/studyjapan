import {
  fsrs,
  createEmptyCard,
  Rating,
  type Card,
  type RecordLogItem
} from "ts-fsrs";
import categoriesData from "../data/categories.json";

export { Rating, createEmptyCard, type Card };

export interface StudyItem {
  id: string; // e.g. "k-学", "w-学生", "c-eki-1"
  text: string;
  type: "kanji" | "word" | "chunk" | "component";
  level: number; // 1..5
  meaning?: string;
  category?: string | null;
  addedAt: string;
}

export interface StudyCard {
  id: string;
  itemId: string;
  skill: "recognize" | "recall" | "write" | "particle";
  fsrsCard: Card;
  lastRating?: Rating;
  todayAgain?: boolean;
}

const f = fsrs();

/**
 * Tìm nhóm cùng loại trong categories.json (ngày trong tuần, số đếm, màu sắc, ...)
 */
export function findCategory(text: string): string | null {
  const cats = categoriesData as Record<string, string[]>;
  for (const [catName, items] of Object.entries(cats)) {
    if (items.includes(text)) {
      return catName;
    }
  }
  return null;
}

/**
 * Thêm mục học mới với luật chống nhiễu (Anti-confusion)
 * Nếu hai từ cùng nhóm (ví dụ 月曜日 và 火曜日) được thêm cùng ngày,
 * mục sau sẽ tự động được dời sang ngày hôm sau và trả về thông báo.
 */
export function scheduleNewItem(
  text: string,
  type: StudyItem["type"],
  level: number,
  existingItems: Array<{ text: string; due: Date }> = [],
  meaning?: string
): {
  item: StudyItem;
  initialCard: Card;
  notice?: string;
} {
  const category = findCategory(text);
  const now = new Date();
  let dueDate = new Date(now);
  let notice: string | undefined;

  if (category) {
    // Check if an existing item in the same category is already scheduled for today
    const sameDayConfusion = existingItems.some(ex => {
      const exCat = findCategory(ex.text);
      if (exCat === category) {
        const isSameDay =
          ex.due.getFullYear() === now.getFullYear() &&
          ex.due.getMonth() === now.getMonth() &&
          ex.due.getDate() === now.getDate();
        return isSameDay;
      }
      return false;
    });

    if (sameDayConfusion) {
      // Shift to tomorrow
      dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      notice = `Đã giãn ${text} sang ngày mai để tránh nhầm`;
    }
  }

  const rawCard = createEmptyCard(dueDate);
  const item: StudyItem = {
    id: `${type[0]}-${text}`,
    text,
    type,
    level,
    meaning,
    category,
    addedAt: now.toISOString()
  };

  return {
    item,
    initialCard: rawCard,
    notice
  };
}

export type ReviewRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

/**
 * Ghi nhận kết quả ôn tập một thẻ
 * Nếu chọn Again (sai), thẻ quay lại trong phiên ôn hôm nay (todayAgain = true)
 */
export function reviewCard(
  card: Card,
  rating: ReviewRating,
  reviewTime: Date = new Date()
): {
  updatedCard: Card;
  todayAgain: boolean;
} {
  const scheduled = f.repeat(card, reviewTime);
  const gradeKey = rating as 1 | 2 | 3 | 4;
  const item = (scheduled as unknown as Record<number, RecordLogItem>)[gradeKey];

  if (rating === Rating.Again) {
    return {
      updatedCard: item.card,
      todayAgain: true
    };
  }

  return {
    updatedCard: item.card,
    todayAgain: false
  };
}

/**
 * Lọc các thẻ đến hạn hôm nay
 * Lưu ý: Thẻ N5, N4 cũ vẫn đến hạn bình thường kể cả khi người dùng đang chọn N3.
 */
export function getDueCards(
  cards: Array<StudyCard & { level: number }>,
  currentDate: Date = new Date(),
  levelFilter?: number
): Array<StudyCard & { level: number }> {
  return cards.filter(c => {
    // If card was marked again today, it's due
    if (c.todayAgain) return true;

    // Check due date
    const isDue = new Date(c.fsrsCard.due).getTime() <= currentDate.getTime();
    if (!isDue) return false;

    // Optional level filter: if set, only return cards of that specific level
    if (levelFilter !== undefined && levelFilter > 0) {
      return c.level === levelFilter;
    }
    return true;
  });
}
