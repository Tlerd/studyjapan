import Dexie, { type EntityTable } from "dexie";
import type { StudyItem, StudyCard } from "./srs";

export interface ReviewLog {
  id?: number;
  cardId: string;
  rating: number;
  reviewTime: string;
}

export interface ParseCacheEntry {
  surface: string;
  tokens: Array<{
    surface: string;
    reading: string;
    base?: string;
    pos?: string;
    isParticle?: boolean;
  }>;
  cachedAt: string;
}

export interface ViMeaningEntry {
  text: string;
  meaning: string;
  isCustom?: boolean;
}

export class JapaneseStudyDB extends Dexie {
  items!: EntityTable<StudyItem, "id">;
  cards!: EntityTable<StudyCard, "id">;
  reviewLogs!: EntityTable<ReviewLog, "id">;
  parseCache!: EntityTable<ParseCacheEntry, "surface">;
  viMeaningCache!: EntityTable<ViMeaningEntry, "text">;

  constructor() {
    super("JapaneseStudyDB");
    this.version(1).stores({
      items: "id, text, type, level, category, addedAt",
      cards: "id, itemId, skill, todayAgain",
      reviewLogs: "++id, cardId, rating, reviewTime",
      parseCache: "surface, cachedAt",
      viMeaningCache: "text"
    });
  }
}

export const db = new JapaneseStudyDB();

/**
 * Xuất toàn bộ dữ liệu ra JSON để sao lưu
 */
export async function exportDatabaseToJson(): Promise<string> {
  const items = await db.items.toArray();
  const cards = await db.cards.toArray();
  const reviewLogs = await db.reviewLogs.toArray();
  const viMeanings = await db.viMeaningCache.toArray();

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      items,
      cards,
      reviewLogs,
      viMeanings
    }
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Nhập dữ liệu từ JSON đã sao lưu
 */
export async function importDatabaseFromJson(jsonString: string): Promise<void> {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !parsed.data) {
    throw new Error("Định dạng file sao lưu không hợp lệ.");
  }

  await db.transaction("rw", [db.items, db.cards, db.reviewLogs, db.viMeaningCache], async () => {
    await db.items.clear();
    await db.cards.clear();
    await db.reviewLogs.clear();
    await db.viMeaningCache.clear();

    if (parsed.data.items?.length) await db.items.bulkAdd(parsed.data.items);
    if (parsed.data.cards?.length) await db.cards.bulkAdd(parsed.data.cards);
    if (parsed.data.reviewLogs?.length) await db.reviewLogs.bulkAdd(parsed.data.reviewLogs);
    if (parsed.data.viMeanings?.length) await db.viMeaningCache.bulkAdd(parsed.data.viMeanings);
  });
}
