/**
 * Định dạng số theo chuẩn tiếng Việt (dấu chấm phân tách hàng nghìn, dấu phẩy phân tách thập phân).
 */

const intFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return intFormatter.format(Math.round(value));
}

export function formatPercent(value: number, decimals: number = 4): string {
  if (!Number.isFinite(value)) return "0%";
  const formatter = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatter.format(value)}%`;
}
