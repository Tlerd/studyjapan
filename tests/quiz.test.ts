import { describe, it, expect } from "vitest";
import {
  getItemAnswer,
  getDistractors,
  getExpectedReading,
  getItemTypeLabel,
  CHUNK_DICTIONARY,
} from "../lib/quiz";
import { type StudyItem } from "../lib/srs";

describe("Quiz logic & Distractor generation", () => {
  it("1. Resolves situation chunks correctly (e.g. 切符を買う)", () => {
    const item: StudyItem = {
      id: "c-切符を買う",
      text: "切符を買う",
      type: "chunk",
      level: 5,
      addedAt: new Date().toISOString(),
    };

    const answer = getItemAnswer(item);
    expect(answer).toBe("mua vé");

    const reading = getExpectedReading(item);
    expect(reading).toBe("きっぷをかう");

    const label = getItemTypeLabel(item);
    expect(label).toBe("Ý NGHĨA CỤM TỪ / TÌNH HUỐNG");

    const distractors = getDistractors(item, answer);
    expect(distractors).toHaveLength(3);
    expect(distractors).not.toContain(answer);
    // Ensure distractors are chunk phrases, not hardcoded single words like "học sinh"
    distractors.forEach((d) => {
      expect(["học sinh", "trường học", "đại học"]).not.toContain(d);
    });
  });

  it("2. Resolves other packs like restaurant or morning chunks", () => {
    const item: StudyItem = {
      id: "c-注文する",
      text: "注文する",
      type: "chunk",
      level: 5,
      addedAt: new Date().toISOString(),
    };

    expect(getItemAnswer(item)).toBe("gọi món");
    expect(getExpectedReading(item)).toBe("ちゅうもんする");
  });

  it("3. Resolves Lego components (e.g. 口, 木)", () => {
    const item: StudyItem = {
      id: "p-口",
      text: "口",
      type: "component",
      level: 5,
      addedAt: new Date().toISOString(),
    };

    const answer = getItemAnswer(item);
    expect(answer).toBe("Miệng");
    expect(getItemTypeLabel(item)).toBe("TÊN MẢNH LEGO (BỘ THỦ)");

    const distractors = getDistractors(item, answer);
    expect(distractors).toHaveLength(3);
    expect(distractors).not.toContain("Miệng");
  });

  it("4. Resolves Kanji Hán-Việt correctly (e.g. 学)", () => {
    const item: StudyItem = {
      id: "k-学",
      text: "学",
      type: "kanji",
      level: 5,
      addedAt: new Date().toISOString(),
    };

    const answer = getItemAnswer(item);
    expect(answer).toBe("HỌC");
    expect(getItemTypeLabel(item)).toBe("NHẬN DIỆN KANJI (HÁN VIỆT)");

    const distractors = getDistractors(item, answer);
    expect(distractors).toHaveLength(3);
    expect(distractors).not.toContain("HỌC");
  });

  it("5. Respects item.meaning override if present", () => {
    const item: StudyItem = {
      id: "c-test",
      text: "切符を買う",
      type: "chunk",
      level: 5,
      meaning: "mua vé xe",
      addedAt: new Date().toISOString(),
    };

    expect(getItemAnswer(item)).toBe("mua vé xe");
  });
});
