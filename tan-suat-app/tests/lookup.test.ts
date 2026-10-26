import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  FreqIndex,
  setDefaultIndex,
  lookup,
  percent,
  inTopN,
  type RawFreqData,
  type Entry,
} from "../lib/lookup";

describe("Tra cứu tần suất từ và tính toán", () => {
  let freqData: RawFreqData;
  let freqIndex: FreqIndex;

  beforeAll(() => {
    const jsonPath = path.resolve(__dirname, "../public/freq.json");
    const rawText = fs.readFileSync(jsonPath, "utf8");
    freqData = JSON.parse(rawText);
    freqIndex = new FreqIndex(freqData);
    setDefaultIndex(freqIndex);
  });

  it("1. '温泉': tìm thấy và có hạng hợp lệ", () => {
    const res = lookup("温泉");
    expect(res).not.toBeNull();
    expect(res?.word).toBe("温泉");
    expect(res?.reading).toBe("おんせん");
    expect(res?.rank).toBeGreaterThan(0);
    expect(res?.rank).toBeLessThanOrEqual(25000);
  });

  it("2. 'おんせん': cho cùng kết quả (hoặc cùng từ) với '温泉'", () => {
    const resKanji = lookup("温泉");
    const resKana = lookup("おんせん");
    expect(resKana).not.toBeNull();
    expect(resKana?.word).toBe(resKanji?.word);
    expect(resKana?.rank).toBe(resKanji?.rank);
    expect(resKana?.reading).toBe("おんせん");
  });

  it("3. 'オンセン': cùng kết quả (katakana -> hiragana)", () => {
    const resKanji = lookup("温泉");
    const resKatakana = lookup("オンセン");
    expect(resKatakana).not.toBeNull();
    expect(resKatakana?.word).toBe(resKanji?.word);
    expect(resKatakana?.rank).toBe(resKanji?.rank);
  });

  it("4. '  温泉  ': trim khoảng trắng, vẫn tìm thấy", () => {
    const resKanji = lookup("温泉");
    const resTrim = lookup("  温泉  ");
    expect(resTrim).not.toBeNull();
    expect(resTrim?.word).toBe(resKanji?.word);
    expect(resTrim?.rank).toBe(resKanji?.rank);
  });

  it("5. 'zzz': không có trong từ điển -> null", () => {
    const res = lookup("zzz");
    expect(res).toBeNull();
  });

  it("6. inTopN: hạng 1.850 với N=2.500 -> true, N=1.000 -> false", () => {
    const mockEntry: Entry = {
      rank: 1850,
      word: "温泉",
      reading: "おんせん",
      count: 7000,
    };
    expect(inTopN(mockEntry, 2500)).toBe(true);
    expect(inTopN(mockEntry, 1000)).toBe(false);
  });

  it("7. percent: count 7.000, total 100.000.000 -> pct = 0.007, perMillion = 70", () => {
    const mockEntry: Entry = {
      rank: 1850,
      word: "温泉",
      reading: "おんせん",
      count: 7000,
    };
    const res = percent(mockEntry, 100_000_000);
    expect(res).not.toBeNull();
    expect(res?.pct).toBeCloseTo(0.007, 5);
    expect(res?.perMillion).toBeCloseTo(70, 5);
  });

  it("8. percent: total = null -> percent() trả null", () => {
    const mockEntry: Entry = {
      rank: 1850,
      word: "温泉",
      reading: "おんせん",
      count: 7000,
    };
    const res = percent(mockEntry, null);
    expect(res).toBeNull();
  });

  it("9. Đọc trùng nhiều từ: trả về từ tốt nhất và danh sách others", () => {
    const res = lookup("こう");
    expect(res).not.toBeNull();
    expect(res?.reading).toBe("こう");
    // Có danh sách từ khác cùng cách đọc
    expect(Array.isArray(res?.others)).toBe(true);
  });
});
