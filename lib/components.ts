import compJson from "../public/components.json";
import compViJson from "../data/components-vi.json";

export interface ComponentInfo {
  part: string;
  vi: string;
  pos?: string;
  hanViet?: string | null;
  hint?: string;
}

const viMap = new Map<string, { vi: string; hanViet?: string | null; hint?: string }>();
for (const item of compViJson) {
  viMap.set(item.part, {
    vi: item.vi,
    hanViet: item.hanViet,
    hint: item.hint
  });
}

const posViMap: Record<string, string> = {
  left: "bên trái",
  right: "bên phải",
  top: "ở phía trên",
  bottom: "ở phía dưới",
  surround: "bao quanh ngoài",
  inside: "ở bên trong",
  whole: "nguyên chữ"
};

/**
 * Lấy danh sách mảnh LEGO của một kanji
 */
export function components(kanji: string): ComponentInfo[] {
  const parts = (compJson as Record<string, Array<{ part: string; pos?: string }>>)[kanji] || [];
  return parts.map(p => {
    const meta = viMap.get(p.part);
    return {
      part: p.part,
      vi: meta ? meta.vi : p.part,
      pos: p.pos,
      hanViet: meta?.hanViet,
      hint: meta?.hint
    };
  });
}

/**
 * Tạo câu lệnh lắp mảnh LEGO
 * Ví dụ 泊: "Lắp mảnh Nước bên trái, mảnh Trắng bên phải"
 */
export function assembleHint(kanji: string): string {
  const comps = components(kanji);
  if (comps.length === 0) return `Kanji ${kanji} là chữ đơn.`;

  if (comps.length === 2 && comps[0].pos === "left" && comps[1].pos === "right") {
    return `Lắp mảnh ${comps[0].vi} bên trái, mảnh ${comps[1].vi} bên phải`;
  }

  const steps = comps.map(c => {
    const posText = c.pos && posViMap[c.pos] ? ` ${posViMap[c.pos]}` : "";
    return `mảnh ${c.vi}${posText}`;
  });

  return `Lắp ${steps.join(", ")}`;
}
