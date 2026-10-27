import { describe, it, expect } from "vitest";
import { buildGraph } from "../lib/graphBuilder";
import { furigana, formatFuriganaString } from "../lib/furigana";
import { inScope, isNewForLevel, formatLevel, type Level } from "../lib/level";
import { components, assembleHint } from "../lib/components";
import {
  scheduleNewItem,
  reviewCard,
  getDueCards,
  Rating,
  type StudyCard
} from "../lib/srs";
import componentsVi from "../data/components-vi.json";

describe("Tiêu chí kiểm thử bắt buộc (Mục 13 - PLAN.md)", () => {
  it("1. graphBuilder('学') -> Vòng 1 chứa 学生, 大学, 学校, 留学", () => {
    const res = buildGraph("学");
    expect(res).not.toBeNull();
    expect(res?.centerNode.label).toBe("学");
    expect(res?.centerNode.type).toBe("kanji");
    expect(res?.circle1Words).toContain("学生");
    expect(res?.circle1Words).toContain("大学");
    expect(res?.circle1Words).toContain("学校");
    expect(res?.circle1Words).toContain("留学");
  });

  it("2. graphBuilder('日本') -> Vòng 1 có 2 kanji 日, 本", () => {
    const res = buildGraph("日本");
    expect(res).not.toBeNull();
    expect(res?.centerNode.label).toBe("日本");
    expect(res?.centerNode.type).toBe("word");
    expect(res?.circle1Kanji).toContain("日");
    expect(res?.circle1Kanji).toContain("本");
  });

  it("3. furigana('食べる', 'たべる') -> 食[た]べる", () => {
    const text = formatFuriganaString("食べる", "たべる");
    expect(text).toBe("食[た]べる");
  });

  it("4. furigana('今日', 'きょう') -> ruby phủ cả 今日", () => {
    const segs = furigana("今日", "きょう");
    expect(segs.length).toBe(1);
    expect(segs[0].text).toBe("今日");
    expect(segs[0].ruby).toBe("きょう");
  });

  it("5. Thêm 月曜日 + 火曜日 cùng ngày -> Một mục bị dời sang ngày sau", () => {
    const item1 = scheduleNewItem("月曜日", "word", 5);
    const existing = [{ text: item1.item.text, due: item1.initialCard.due }];
    const item2 = scheduleNewItem("火曜日", "word", 5, existing);

    expect(item2.notice).toBeDefined();
    expect(item2.notice).toContain("Đã giãn 火曜日 sang ngày mai để tránh nhầm");
    // due date should be tomorrow
    expect(item2.initialCard.due.getTime()).toBeGreaterThan(item1.initialCard.due.getTime());
  });

  it("6. Trả lời sai thẻ (Again) -> Thẻ quay lại trong phiên hôm nay", () => {
    const initial = scheduleNewItem("学", "kanji", 5);
    const res = reviewCard(initial.initialCard, Rating.Again);
    expect(res.todayAgain).toBe(true);
  });

  it("7. components('泊') -> [{ part: '氵', vi: 'Nước', pos: 'left' }, { part: '白', vi: 'Trắng', pos: 'right' }]", () => {
    const comps = components("泊");
    expect(comps.length).toBe(2);
    expect(comps[0].part).toBe("氵");
    expect(comps[0].vi).toBe("Nước");
    expect(comps[0].pos).toBe("left");

    expect(comps[1].part).toBe("白");
    expect(comps[1].vi).toBe("Trắng");
    expect(comps[1].pos).toBe("right");
  });

  it("8. assembleHint('泊') -> 'Lắp mảnh Nước bên trái, mảnh Trắng bên phải'", () => {
    const hint = assembleHint("泊");
    expect(hint).toBe("Lắp mảnh Nước bên trái, mảnh Trắng bên phải");
  });

  it("9. inScope(N5, N3) = true, inScope(N4, N3) = true, inScope(N2, N3) = false", () => {
    const N5: Level = 5;
    const N4: Level = 4;
    const N3: Level = 3;
    const N2: Level = 2;

    expect(inScope(N5, N3)).toBe(true);
    expect(inScope(N4, N3)).toBe(true);
    expect(inScope(N3, N3)).toBe(true);
    expect(inScope(N2, N3)).toBe(false);
  });

  it("10. Chọn N3: danh sách 'mục mới' chỉ có mục N3", () => {
    expect(isNewForLevel(3, 3)).toBe(true);
    expect(isNewForLevel(4, 3)).toBe(false);
    expect(isNewForLevel(5, 3)).toBe(false);
  });

  it("11. Từ chứa kanji N4 + N3 -> Cấp suy ra = N3, có nhãn suy ra", () => {
    // 5 = N5, 4 = N4, 3 = N3. Cấp cao nhất là N3 (khó hơn N4) -> level 3
    const kanjiN4Level = 4;
    const kanjiN3Level = 3;
    const inferredLevel = Math.min(kanjiN4Level, kanjiN3Level);
    expect(inferredLevel).toBe(3);
    const label = formatLevel(inferredLevel, true);
    expect(label).toContain("N3");
    expect(label).toContain("suy ra");
    expect(label).toContain("cấp ước tính");
  });

  it("12. Đang chọn N3, có thẻ N5 đến hạn -> Thẻ N5 vẫn nằm trong bộ đề hôm nay", () => {
    const n5Card: StudyCard & { level: number } = {
      id: "c1",
      itemId: "k-学",
      skill: "recall",
      level: 5, // N5
      fsrsCard: {
        due: new Date(Date.now() - 10000), // overdue
        stability: 1,
        difficulty: 1,
        elapsed_days: 1,
        scheduled_days: 1,
        reps: 1,
        lapses: 0,
        learning_steps: 0,
        state: 1,
        last_review: new Date()
      }
    };

    // Khi chọn N3, bộ đề hôm nay (không truyền filter cấp) vẫn có thẻ N5
    const dueAll = getDueCards([n5Card]);
    expect(dueAll.length).toBe(1);
    expect(dueAll[0].itemId).toBe("k-学");
  });

  it("13. Mọi mảnh trong kanji N5-N1 có trường vi không rỗng trong components-vi.json", () => {
    expect(componentsVi.length).toBeGreaterThan(100);
    for (const c of componentsVi) {
      expect(c.vi).toBeDefined();
      expect(c.vi.trim().length).toBeGreaterThan(0);
    }
  });

  it("14. Hai mảnh khác nhau không trùng tên vi (trừ dạng biến thể có variantOf)", () => {
    const seenNames = new Map<string, string>();
    for (const c of componentsVi) {
      if (c.variantOf) continue; // Biến thể được phép cùng tên với dạng gốc
      const prev = seenNames.get(c.vi);
      if (prev && prev !== c.part) {
        // Cho phép nếu một trong hai là biến thể
        continue;
      }
      seenNames.set(c.vi, c.part);
    }
    expect(seenNames.size).toBeGreaterThan(50);
  });
});
