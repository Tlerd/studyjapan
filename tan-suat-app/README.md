# App Tra Cứu Tần Suất Từ Tiếng Nhật (Top 25.000 từ)

Ứng dụng web giúp người học tiếng Nhật tra cứu nhanh độ thông dụng của một từ vựng:
1. Từ này có nằm trong **25.000 từ thông dụng nhất** hay không?
2. Từ này xếp thứ bao nhiêu, có nằm trong **ngưỡng Top N** bạn đặt ra không?
3. Trực quan hóa vị trí của từ trên **thang logarit** kèm các mốc JLPT ước tính (N5 → N1).

---

## 🚀 Tính năng nổi bật

- **Tra cứu tức thì**: Tìm kiếm theo chữ Hán (Kanji), Hiragana hoặc Katakana (tự động chuẩn hóa NFKC và chuyển đổi bằng `wanakana`).
- **Thẻ kết quả (Khối A)**:
  - Hiển thị cách đọc Furigana bằng thẻ HTML chuẩn `<ruby>` (chữ đọc nhỏ nằm ngay trên Kanji).
  - Đánh giá trạng thái Top N: `✅ Có nằm trong top N` hoặc `❌ Không nằm trong top N`.
  - Phân loại cấp độ JLPT ước tính.
  - Gợi ý các từ đồng âm khác nghĩa cùng cách đọc (ví dụ: tra `こう` hiển thị các chữ có cùng cách đọc).
- **Bảng hạng có thanh trượt (Khối B)**:
  - Trục dọc thang logarit từ hạng 1 đến hạng 25.000.
  - Vùng màu trực quan: 🟢 Top 1 → N, 🟡 N → 25.000, ⚪ Ngoài danh sách.
  - Thanh trượt N linh hoạt (500 → 25.000, bước 500), cập nhật cả 2 khối ngay lập tức.
  - Các mốc JLPT ước tính (N5 ~800, N4 ~1.500, N3 ~3.750, N2 ~6.000, N1 ~11.000) kèm nút bấm đặt nhanh.
  - Đánh dấu từ hiện tại bằng chấm nổi bật + lưu trữ 10 từ tra gần nhất qua `localStorage`.
- **Hiệu năng & Offline**: Dữ liệu nén gọn trong `public/freq.json` (~680 KB thô, ~200 KB sau khi nén bởi Vercel), tải 1 lần chạy mượt mà trên trình duyệt.

---

## 🛠️ Công nghệ sử dụng

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript.
- **Styling**: Tailwind CSS, hỗ trợ tự động chế độ Sáng / Tối (Dark / Light mode).
- **Kana converter**: `wanakana`.
- **Testing**: Vitest (100% pass toàn bộ kịch bản tra cứu và tính toán).
- **Font chữ**: Be Vietnam Pro & Noto Sans JP.

---

## 💻 Hướng dẫn chạy cục bộ

```bash
# 1. Cài đặt thư viện
pnpm install

# 2. Chạy môi trường phát triển (Dev)
pnpm run dev
# Mở trình duyệt tại: http://localhost:3000

# 3. Chạy unit tests
pnpm test

# 4. Build sản phẩm (Production)
pnpm run build

# 5. Build lại dữ liệu từ điển nếu cập nhật CSV
pnpm run build:data
```

---

## 📊 Nguồn dữ liệu & Bản quyền

- Dữ liệu tần suất: [jiten.moe](https://jiten.moe/frequency-dictionaries) – Global Frequency List (giấy phép **CC BY-SA 4.0**).
- Chi tiết cấu trúc dữ liệu và xử lý cột xem tại [`data/README.md`](./data/README.md).
