export interface FuriganaSegment {
  text: string;
  ruby?: string;
}

// Danh sách các từ đọc đặc biệt (jukujikun) - ruby phủ toàn bộ từ
export const SPECIAL_READINGS = new Set([
  "今日", "昨日", "明日", "大人", "一日", "二日", "三日", "四日", "五日",
  "六日", "七日", "八日", "九日", "十日", "十四日", "二十日", "二十四日",
  "今年", "去年", "今朝", "今晩", "お祖父さん", "お祖母さん", "従兄弟", "従姉妹"
]);

/**
 * Tách okurigana cho từ
 * Ví dụ:
 * 食べる, たべる -> [{ text: "食", ruby: "た" }, { text: "べる" }]
 * 今日, きょう -> [{ text: "今日", ruby: "きょう" }]
 */
export function furigana(surface: string, reading: string): FuriganaSegment[] {
  if (!surface) return [];
  if (!reading) return [{ text: surface }];

  // 1. Kiểm tra từ đọc đặc biệt (jukujikun)
  if (SPECIAL_READINGS.has(surface)) {
    return [{ text: surface, ruby: reading }];
  }

  // 2. Nếu từ hoàn toàn không có Kanji
  if (!/[一-龯]/.test(surface)) {
    return [{ text: surface }];
  }

  // 3. Tách phần okurigana đuôi (hậu tố kana trùng nhau)
  let sEnd = surface.length;
  let rEnd = reading.length;
  while (sEnd > 0 && rEnd > 0 && surface[sEnd - 1] === reading[rEnd - 1]) {
    sEnd--;
    rEnd--;
  }

  // 4. Tách phần tiền tố kana trùng nhau (nếu có, ví dụ お茶 -> おちゃ)
  let sStart = 0;
  let rStart = 0;
  while (sStart < sEnd && rStart < rEnd && surface[sStart] === reading[rStart]) {
    sStart++;
    rStart++;
  }

  const segments: FuriganaSegment[] = [];

  if (sStart > 0) {
    segments.push({ text: surface.slice(0, sStart) });
  }

  const kanjiPart = surface.slice(sStart, sEnd);
  const readingPart = reading.slice(rStart, rEnd);

  if (kanjiPart) {
    segments.push({ text: kanjiPart, ruby: readingPart });
  }

  if (sEnd < surface.length) {
    segments.push({ text: surface.slice(sEnd) });
  }

  return segments;
}

/**
 * Xuất chuỗi furigana dạng văn bản rút gọn: 食[た]べる hoặc 今日[きょう]
 */
export function formatFuriganaString(surface: string, reading: string): string {
  const segs = furigana(surface, reading);
  return segs
    .map(s => (s.ruby ? `${s.text}[${s.ruby}]` : s.text))
    .join("");
}
