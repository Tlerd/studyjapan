import Dexie, { type EntityTable } from "dexie";
import {
  type StudyItem,
  type StudyCard,
  scheduleNewItem,
  type Card,
  type Rating,
  createEmptyCard
} from "./srs";

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

export interface ExerciseItem {
  id: string;
  questionText: string;
  questionTranslation: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ScanSource {
  id: string;
  title: string;
  imageHash: string; // SHA-256 binary hash for duplicate check
  textHash: string; // Normalized text hash for duplicate check
  rawText: string;
  translatedText: string;
  exercises: ExerciseItem[];
  chatMessages: ChatMessage[];
  modelUsed?: string;
  effortUsed?: string;
  createdAt: string;
}

export interface ScannedExample {
  ja: string;
  vi: string;
  sourceId?: string;
}

export interface ScannedItem {
  id: string; // e.g. "sw-食べる" or "sg-ている"
  kind: "word" | "grammar";
  surface: string; // Word or Grammar pattern (e.g. 〜ている)
  reading?: string; // Hiragana reading for words
  hanViet?: string; // Sino-Vietnamese reading
  meaning: string;
  formation?: string; // e.g. "V-て + いる" for grammar
  explanation?: string; // Grammar usage explanation
  examples: ScannedExample[];
  level: number; // 1..5
  sourceIds: string[]; // List of scan ids where this appeared
  pushedToMainSRS: boolean;
  addedAt: string;
}

export interface ScannedCard {
  id: string;
  targetId: string;
  kind: "word" | "grammar";
  skill: "recognize" | "recall" | "grammar-meaning" | "grammar-cloze";
  fsrsCard: Card;
  lastRating?: Rating;
  todayAgain?: boolean;
}

export interface CustomSkill {
  id: string;
  slug?: string;
  icon: string;
  title: string;
  prompt: string;
  isDefault?: boolean;
}

export interface AiSettings {
  key: string; // "gemini-config"
  instructions: string;
  defaultModel: string;
  defaultEffort: "low" | "medium" | "high";
  activeSkills: string[];
}

export class JapaneseStudyDB extends Dexie {
  items!: EntityTable<StudyItem, "id">;
  cards!: EntityTable<StudyCard, "id">;
  reviewLogs!: EntityTable<ReviewLog, "id">;
  parseCache!: EntityTable<ParseCacheEntry, "surface">;
  viMeaningCache!: EntityTable<ViMeaningEntry, "text">;

  // Tables for Scanned & Solver Data
  scanSources!: EntityTable<ScanSource, "id">;
  scannedItems!: EntityTable<ScannedItem, "id">;
  scannedCards!: EntityTable<ScannedCard, "id">;
  customSkills!: EntityTable<CustomSkill, "id">;
  aiSettings!: EntityTable<AiSettings, "key">;

  constructor() {
    super("JapaneseStudyDB");
    this.version(1).stores({
      items: "id, text, type, level, category, addedAt",
      cards: "id, itemId, skill, todayAgain",
      reviewLogs: "++id, cardId, rating, reviewTime",
      parseCache: "surface, cachedAt",
      viMeaningCache: "text"
    });

    this.version(2).stores({
      items: "id, text, type, level, category, addedAt",
      cards: "id, itemId, skill, todayAgain",
      reviewLogs: "++id, cardId, rating, reviewTime",
      parseCache: "surface, cachedAt",
      viMeaningCache: "text",
      scanSources: "id, imageHash, textHash, createdAt",
      scannedItems: "id, kind, surface, level, pushedToMainSRS, addedAt",
      scannedCards: "id, targetId, kind, skill, todayAgain",
      customSkills: "id, title",
      aiSettings: "key"
    });
  }
}

export const db = new JapaneseStudyDB();

/**
 * Tính mã SHA-256 của file ảnh trên trình duyệt
 */
export async function computeImageHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Chuẩn hóa chuỗi văn bản tiếng Nhật để so sánh trùng lặp
 */
export function computeTextHash(text: string): string {
  const normalized = (text || "")
    .toLowerCase()
    .replace(/[\s\r\n\t、。・！？!?.,:;]/g, "");
  return normalized.slice(0, 300);
}

/**
 * Đẩy một mục từ kho quét sang Bộ đề hôm nay (Main SRS deck)
 */
export async function pushScannedItemToMainDeck(
  scanned: ScannedItem
): Promise<{ notice?: string }> {
  const existingItems = await db.items.toArray();
  const existingCards = await db.cards.toArray();
  const cardMap = new Map(existingCards.map((c) => [c.itemId, c.fsrsCard.due]));

  const existingForConfusion = existingItems.map((i) => ({
    text: i.text,
    due: cardMap.get(i.id) ? new Date(cardMap.get(i.id)!) : new Date(),
  }));

  const itemType = scanned.kind === "word" ? "word" : "chunk";
  const { item, initialCard, notice } = scheduleNewItem(
    scanned.surface,
    itemType,
    scanned.level || 5,
    existingForConfusion,
    scanned.meaning
  );

  await db.items.put(item);

  const cardsToAdd: StudyCard[] = [
    {
      id: `card-${item.id}-recog`,
      itemId: item.id,
      skill: "recognize",
      fsrsCard: initialCard,
    },
    {
      id: `card-${item.id}-${scanned.kind === "word" ? "recall" : "particle"}`,
      itemId: item.id,
      skill: scanned.kind === "word" ? "recall" : "particle",
      fsrsCard: initialCard,
    },
  ];

  await db.cards.bulkPut(cardsToAdd);

  // Đánh dấu đã đẩy sang main SRS
  await db.scannedItems.update(scanned.id, { pushedToMainSRS: true });

  return { notice };
}

/**
 * Tạo thẻ ôn tập riêng trong kho quét cho từ vựng hoặc ngữ pháp
 */
export async function createScannedCards(scanned: ScannedItem): Promise<void> {
  const now = new Date();
  const baseCard = createEmptyCard(now);

  const newCards: ScannedCard[] = [];

  if (scanned.kind === "word") {
    newCards.push(
      {
        id: `scard-${scanned.id}-recog`,
        targetId: scanned.id,
        kind: "word",
        skill: "recognize",
        fsrsCard: baseCard,
      },
      {
        id: `scard-${scanned.id}-recall`,
        targetId: scanned.id,
        kind: "word",
        skill: "recall",
        fsrsCard: baseCard,
      }
    );
  } else {
    newCards.push(
      {
        id: `scard-${scanned.id}-meaning`,
        targetId: scanned.id,
        kind: "grammar",
        skill: "grammar-meaning",
        fsrsCard: baseCard,
      },
      {
        id: `scard-${scanned.id}-cloze`,
        targetId: scanned.id,
        kind: "grammar",
        skill: "grammar-cloze",
        fsrsCard: baseCard,
      }
    );
  }

  await db.scannedCards.bulkPut(newCards);
}

/**
 * Xuất toàn bộ dữ liệu ra JSON để sao lưu (Bao gồm dữ liệu quét ảnh)
 */
export async function exportDatabaseToJson(): Promise<string> {
  const items = await db.items.toArray();
  const cards = await db.cards.toArray();
  const reviewLogs = await db.reviewLogs.toArray();
  const viMeanings = await db.viMeaningCache.toArray();
  const scanSources = await db.scanSources.toArray();
  const scannedItems = await db.scannedItems.toArray();
  const scannedCards = await db.scannedCards.toArray();
  const customSkills = await db.customSkills.toArray();
  const aiSettings = await db.aiSettings.toArray();

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      items,
      cards,
      reviewLogs,
      viMeanings,
      scanSources,
      scannedItems,
      scannedCards,
      customSkills,
      aiSettings,
    },
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

  await db.transaction(
    "rw",
    [
      db.items,
      db.cards,
      db.reviewLogs,
      db.viMeaningCache,
      db.scanSources,
      db.scannedItems,
      db.scannedCards,
      db.customSkills,
      db.aiSettings,
    ],
    async () => {
      await db.items.clear();
      await db.cards.clear();
      await db.reviewLogs.clear();
      await db.viMeaningCache.clear();
      await db.scanSources.clear();
      await db.scannedItems.clear();
      await db.scannedCards.clear();
      await db.customSkills.clear();
      await db.aiSettings.clear();

      if (parsed.data.items?.length) await db.items.bulkAdd(parsed.data.items);
      if (parsed.data.cards?.length) await db.cards.bulkAdd(parsed.data.cards);
      if (parsed.data.reviewLogs?.length) await db.reviewLogs.bulkAdd(parsed.data.reviewLogs);
      if (parsed.data.viMeanings?.length) await db.viMeaningCache.bulkAdd(parsed.data.viMeanings);
      if (parsed.data.scanSources?.length) await db.scanSources.bulkAdd(parsed.data.scanSources);
      if (parsed.data.scannedItems?.length) await db.scannedItems.bulkAdd(parsed.data.scannedItems);
      if (parsed.data.scannedCards?.length) await db.scannedCards.bulkAdd(parsed.data.scannedCards);
      if (parsed.data.customSkills?.length) await db.customSkills.bulkAdd(parsed.data.customSkills);
      if (parsed.data.aiSettings?.length) await db.aiSettings.bulkAdd(parsed.data.aiSettings);
    }
  );
}


/**
 * Hợp nhất (merge) dữ liệu từ đám mây vào cơ sở dữ liệu hiện tại mà không làm mất dữ liệu cục bộ
 */
export async function mergeDatabaseFromJson(
  jsonStringOrObj: string | { data: any }
): Promise<{ mergedCount: number }> {
  const parsed =
    typeof jsonStringOrObj === "string"
      ? JSON.parse(jsonStringOrObj)
      : jsonStringOrObj;

  if (!parsed || !parsed.data) {
    throw new Error("Dữ liệu đám mây không đúng định dạng.");
  }

  let mergedCount = 0;

  await db.transaction(
    "rw",
    [
      db.items,
      db.cards,
      db.reviewLogs,
      db.viMeaningCache,
      db.scanSources,
      db.scannedItems,
      db.scannedCards,
      db.customSkills,
      db.aiSettings,
    ],
    async () => {
      // 1. Items
      if (parsed.data.items?.length) {
        await db.items.bulkPut(parsed.data.items);
        mergedCount += parsed.data.items.length;
      }

      // 2. Cards (SRS)
      if (parsed.data.cards?.length) {
        for (const cloudCard of parsed.data.cards) {
          const localCard = await db.cards.get(cloudCard.id);
          if (!localCard) {
            await db.cards.put(cloudCard);
          } else {
            const localLastReview = localCard.fsrsCard?.last_review
              ? new Date(localCard.fsrsCard.last_review).getTime()
              : 0;
            const cloudLastReview = cloudCard.fsrsCard?.last_review
              ? new Date(cloudCard.fsrsCard.last_review).getTime()
              : 0;
            if (cloudLastReview >= localLastReview) {
              await db.cards.put(cloudCard);
            }
          }
        }
      }

      // 3. ReviewLogs
      if (parsed.data.reviewLogs?.length) {
        const existingLogs = await db.reviewLogs.toArray();
        const existingSet = new Set(
          existingLogs.map((l) => `${l.cardId}_${l.reviewTime}`)
        );
        const newLogs = parsed.data.reviewLogs.filter(
          (l: any) => !existingSet.has(`${l.cardId}_${l.reviewTime}`)
        );
        if (newLogs.length) {
          await db.reviewLogs.bulkAdd(newLogs);
        }
      }

      // 4. viMeanings
      if (parsed.data.viMeanings?.length) {
        await db.viMeaningCache.bulkPut(parsed.data.viMeanings);
      }

      // 5. scanSources
      if (parsed.data.scanSources?.length) {
        await db.scanSources.bulkPut(parsed.data.scanSources);
        mergedCount += parsed.data.scanSources.length;
      }

      // 6. scannedItems
      if (parsed.data.scannedItems?.length) {
        await db.scannedItems.bulkPut(parsed.data.scannedItems);
      }

      // 7. scannedCards
      if (parsed.data.scannedCards?.length) {
        for (const cloudCard of parsed.data.scannedCards) {
          const localCard = await db.scannedCards.get(cloudCard.id);
          if (!localCard) {
            await db.scannedCards.put(cloudCard);
          } else {
            const localReview = localCard.fsrsCard?.last_review
              ? new Date(localCard.fsrsCard.last_review).getTime()
              : 0;
            const cloudReview = cloudCard.fsrsCard?.last_review
              ? new Date(cloudCard.fsrsCard.last_review).getTime()
              : 0;
            if (cloudReview >= localReview) {
              await db.scannedCards.put(cloudCard);
            }
          }
        }
      }

      // 8. customSkills
      if (parsed.data.customSkills?.length) {
        await db.customSkills.bulkPut(parsed.data.customSkills);
      }

      // 9. aiSettings
      if (parsed.data.aiSettings?.length) {
        await db.aiSettings.bulkPut(parsed.data.aiSettings);
      }
    }
  );

  return { mergedCount };
}
