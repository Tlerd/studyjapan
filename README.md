# Học tiếng Nhật theo Kanji + Mạng nhện

Web học tiếng Nhật lấy Kanji làm hạt nhân liên kết, dựa trên đồ thị mạng nhện ngữ cảnh, bộ thủ (mảnh LEGO), thang học 4 bậc (Nhận ra → Nhớ ra → Viết ra → Dùng trong câu) và thuật toán lặp lại ngắt quãng (FSRS).

## Cài đặt và chạy

```bash
pnpm install
pnpm dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

## Kiểm thử và build

```bash
pnpm test
pnpm build
```

## Dữ liệu và Giấy phép

- **Tần suất từ**: 25.000 từ phổ biến trích xuất từ [jiten.moe](https://jiten.moe) (CC BY-SA 4.0).
- **Kanji**: Thông tin âm On/Kun, Hán Việt và nghĩa tiếng Anh từ KANJIDIC2 (EDRDG, CC BY-SA 4.0).
- **Từ vựng**: JMdict (EDRDG, CC BY-SA 4.0).
- **Nét viết chữ Hán**: Dự án [KanjiVG](https://kanjivg.tagaini.net) (CC BY-SA 3.0).
- **Bộ thủ & Cấu thành**: KRADFILE / kradfile-u (EDRDG, CC BY-SA 4.0) & KanjiVG elements.
- **Phân cấp JLPT ước tính**: Jonathan Waller ([tanos.co.uk](https://www.tanos.co.uk/jlpt/), CC BY).
