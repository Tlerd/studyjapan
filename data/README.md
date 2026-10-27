# Dữ liệu tần suất từ tiếng Nhật

## 1. Nguồn dữ liệu thô
- **Nguồn**: [jiten.moe Global Frequency List](https://jiten.moe/frequency-dictionaries)
- **Giấy phép**: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **File gốc**: `data/raw/frequency_list_global.csv` (16,4 MB, 460.896 từ)
- **Ngày tải / kiểm tra**: 2026-10-27

## 2. Kiểm tra cột CSV thực tế
5 dòng đầu tiên của file CSV:
```csv
Word,Form,Rank
の,の,1
は,は,2
に,に,3
を,を,4
が,が,5
```

Các cột thực tế:
- `Word`: Từ vựng (dạng chữ Hán / kanji hoặc kana gốc).
- `Form`: Cách đọc / cách phát âm (dạng kana).
- `Rank`: Thứ hạng tần suất xuất hiện theo jiten.moe (được tính ưu tiên theo độ phổ biến trên nhiều tác phẩm).

## 3. Quyết định nguồn cho % (theo mục 3.3 PLAN.md)
- File CSV của jiten.moe **không có cột số lần xuất hiện** (`count`/`occurrences`).
- Theo cây quyết định:
  - Dùng jiten cho **HẠNG**.
  - Không tự suy diễn hay bịa số lần xuất hiện theo quy luật Zipf.
  - Trường `total` và mảng `counts` để giá trị `null`.
  - Giao diện ứng dụng tự động ẩn dòng "Lặp lại (%)" và hiển thị đầy đủ thứ hạng, nhãn top N, thang log, vạch JLPT ước tính theo thiết kế.

## 4. Dữ liệu sau xử lý
- File xuất bản: `public/freq.json`
- Số lượng: Top 25.000 từ phổ biến nhất (đủ phạm vi học từ N5 lên đến N1+).
- Cấu trúc: Xuất dạng cột (columnar format) để tối ưu kích thước truyền tải web (< 1 MB).
