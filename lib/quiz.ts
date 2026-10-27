import * as wanakana from "wanakana";
import { type StudyItem } from "./srs";
import kanjiData from "../public/kanji.json";
import wordsData from "../public/words.json";
import componentsData from "../data/components-vi.json";
import ekiPack from "../data/packs/eki.json";
import morningPack from "../data/packs/morning.json";
import restaurantPack from "../data/packs/restaurant.json";

export interface ChunkMeta {
  vi: string;
  reading: string;
}

export const CHUNK_DICTIONARY: Record<string, ChunkMeta> = {
  "駅": { vi: "nhà ga", reading: "えき" },
  "切符を買う": { vi: "mua vé", reading: "きっぷをかう" },
  "電車に乗る": { vi: "lên tàu", reading: "でんしゃにのる" },
  "電車が遅れる": { vi: "tàu bị trễ", reading: "đếnしゃがおくれる" },
  "朝起きる": { vi: "buổi sáng thức dậy", reading: "あさおきる" },
  "顔を洗う": { vi: "rửa mặt", reading: "かおをあらう" },
  "朝ご飯を食べる": { vi: "ăn bữa sáng", reading: "あさごはんをたべる" },
  "学校へ行く": { vi: "đi đến trường", reading: "がっこうへいく" },
  "注文する": { vi: "gọi món", reading: "ちゅうもんする" },
  "水を飲む": { vi: "uống nước", reading: "みずをのむ" },
  "美味しく食べる": { vi: "ăn ngon miệng", reading: "おいしくたべる" },
  "お金を払う": { vi: "thanh toán tiền", reading: "おかねをはらう" },
};

// Fix typo: "電車が遅れる" reading is "でんしゃがおくれる"
CHUNK_DICTIONARY["電車が遅れる"] = { vi: "tàu bị trễ", reading: "でんしゃがおくれる" };

// Merge packs
[...ekiPack.items, ...morningPack.items, ...restaurantPack.items].forEach((it) => {
  if (!CHUNK_DICTIONARY[it.text]) {
    CHUNK_DICTIONARY[it.text] = {
      vi: it.vi,
      reading: wanakana.toHiragana(it.text),
    };
  }
});

// Component Map
export const COMPONENT_MAP = new Map<string, string>();
(componentsData as Array<{ part: string; vi: string }>).forEach((c) => {
  if (c.part && c.vi) {
    COMPONENT_MAP.set(c.part, c.vi);
  }
});

// Distractor pools
export const CHUNK_DISTRACTORS = [
  "nhà ga",
  "mua vé",
  "lên tàu",
  "tàu bị trễ",
  "buổi sáng thức dậy",
  "rửa mặt",
  "ăn bữa sáng",
  "đi đến trường",
  "gọi món",
  "uống nước",
  "ăn ngon miệng",
  "thanh toán tiền",
];

export const COMPONENT_DISTRACTORS = [
  "Miệng",
  "Phẩy",
  "Mặt trời",
  "Một",
  "Cây gỗ",
  "Người đứng",
  "Nước (ba chấm thủy)",
  "Màu trắng",
  "Ngọn lửa",
  "Mặt trăng",
  "Mảnh đất",
  "Mái nhà",
  "Con dao",
  "Trái tim",
];

export const KANJI_DISTRACTORS = [
  "HỌC",
  "NHẬT",
  "BẠC",
  "BẠCH",
  "THỦY",
  "SINH",
  "ĐẠI",
  "HIỆU",
  "XUYÊN",
  "SƠN",
  "KHẨU",
  "MỘC",
  "KIM",
  "THỔ",
  "NGUYỆT",
  "HỎA",
];

export const WORD_DISTRACTORS = [
  "học sinh",
  "trường học",
  "đại học",
  "du học sinh",
  "mỗi ngày",
  "nước Nhật",
  "hôm nay",
  "ngày mai",
  "hôm qua",
  "bạn bè",
  "giáo viên",
  "xe điện",
  "thời gian",
  "sách",
];

const kanjiDb = kanjiData as Record<string, any>;
const wordsDb = wordsData as Record<string, any>;

export function getItemAnswer(
  item: StudyItem,
  customKanjiDb = kanjiDb,
  customWordsDb = wordsDb
): string {
  if (item.meaning && item.meaning.trim() !== "") {
    return item.meaning;
  }
  if (item.type === "chunk" || CHUNK_DICTIONARY[item.text]) {
    return CHUNK_DICTIONARY[item.text]?.vi || "cụm từ tình huống";
  }
  if (item.type === "component" || COMPONENT_MAP.has(item.text)) {
    return COMPONENT_MAP.get(item.text) || "Mảnh ghép Lego";
  }
  if (item.type === "kanji") {
    return customKanjiDb[item.text]?.hanViet || "HÁN TỰ";
  }
  const wordEntry = customWordsDb[item.text];
  if (wordEntry?.meaning) {
    return wordEntry.meaning;
  }
  if (customKanjiDb[item.text]?.hanViet) {
    return customKanjiDb[item.text].hanViet;
  }
  return "nghĩa từ vựng";
}

export function getDistractors(item: StudyItem, correctAnswer: string): string[] {
  let pool: string[] = WORD_DISTRACTORS;

  if (item.type === "chunk" || CHUNK_DICTIONARY[item.text]) {
    pool = CHUNK_DISTRACTORS;
  } else if (item.type === "component" || COMPONENT_MAP.has(item.text)) {
    pool = COMPONENT_DISTRACTORS;
  } else if (item.type === "kanji") {
    pool = KANJI_DISTRACTORS;
  }

  const filtered = pool.filter((d) => d.trim().toLowerCase() !== correctAnswer.trim().toLowerCase());
  const selected = filtered.sort(() => Math.random() - 0.5).slice(0, 3);

  if (selected.length < 3) {
    const backup = ["học sinh", "trường học", "mua vé", "nước Nhật", "mặt trời"];
    for (const b of backup) {
      if (b.toLowerCase() !== correctAnswer.toLowerCase() && !selected.includes(b)) {
        selected.push(b);
        if (selected.length >= 3) break;
      }
    }
  }

  return selected;
}

export function getExpectedReading(
  item: StudyItem,
  customKanjiDb = kanjiDb,
  customWordsDb = wordsDb
): string {
  if (CHUNK_DICTIONARY[item.text]?.reading) {
    return CHUNK_DICTIONARY[item.text].reading;
  }
  if (customWordsDb[item.text]?.reading) {
    return customWordsDb[item.text].reading;
  }
  if (customKanjiDb[item.text]) {
    const k = customKanjiDb[item.text];
    if (k.kun && k.kun.length > 0) {
      return k.kun[0].replace(/\..*/, "");
    }
    if (k.on && k.on.length > 0) {
      return k.on[0];
    }
  }
  return wanakana.toHiragana(item.text);
}

export function getItemTypeLabel(item: StudyItem): string {
  if (item.type === "chunk" || CHUNK_DICTIONARY[item.text]) {
    return "Ý NGHĨA CỤM TỪ / TÌNH HUỐNG";
  }
  if (item.type === "component" || COMPONENT_MAP.has(item.text)) {
    return "TÊN MẢNH LEGO (BỘ THỦ)";
  }
  if (item.type === "kanji") {
    return "NHẬN DIỆN KANJI (HÁN VIỆT)";
  }
  return "NHỚ NGHĨA TỪ VỰNG";
}
