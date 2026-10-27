export type Level = 5 | 4 | 3 | 2 | 1; // 5 = N5 (dễ nhất), 1 = N1 (khó nhất)

/**
 * Kiểm tra xem một mục có nằm trong phạm vi cấp đang chọn không (tính tích lũy).
 * Ví dụ: chọn N3 (3) thì N5 (5), N4 (4) và N3 (3) đều inScope (level >= 3).
 * N2 (2) và N1 (1) nằm ngoài phạm vi (false).
 */
export function inScope(itemLevel: number, chosen: Level): boolean {
  if (itemLevel < 1 || itemLevel > 5) return false;
  return itemLevel >= chosen;
}

/**
 * Kiểm tra xem mục có phải là mục mới riêng của cấp đang chọn không.
 */
export function isNewForLevel(itemLevel: number, chosen: Level): boolean {
  return itemLevel === chosen;
}

/**
 * Format tên cấp ước tính hiển thị
 */
export function formatLevel(level: number, inferred?: boolean): string {
  if (level >= 1 && level <= 5) {
    return inferred ? `N${level} (suy ra · cấp ước tính)` : `N${level} (cấp ước tính)`;
  }
  return "Ngoài JLPT";
}
