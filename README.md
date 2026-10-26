# Study Japan (Học tiếng Nhật)

Repository tổng hợp tài liệu, phương pháp học tập và các công cụ hỗ trợ học tiếng Nhật.

---

## 📁 Cấu trúc kho lưu trữ

```text
studyjapan/
├─ tan-suat-app/                      # Ứng dụng tra cứu tần suất từ tiếng Nhật (Next.js 15)
│  ├─ app/                            # Next.js App Router (Giao diện chính, Layout, CSS)
│  ├─ components/                     # Các khối UI: SearchBox, ResultCard, RankLadder
│  ├─ lib/                            # Xử lý tra cứu (lookup), định dạng số, tải dữ liệu
│  ├─ public/freq.json                # Dữ liệu 25.000 từ thông dụng đã xử lý (jiten.moe)
│  ├─ scripts/build-data.ts           # Script tiền xử lý dữ liệu từ CSV
│  ├─ tests/lookup.test.ts            # Unit tests với Vitest
│  └─ README.md                       # Hướng dẫn chi tiết cho ứng dụng
├─ Cach-Nao-Ghi-Nho-Hoc-Tieng-Nhat.md # Phương pháp ghi nhớ tiếng Nhật theo khoa học não bộ
└─ Cach-Nao-Ghi-Nho-Hoc-Tieng-Nhat.html# Bản HTML đọc nhanh của cẩm nang phương pháp
```

---

## 🚀 Ứng dụng tra cứu tần suất (`tan-suat-app`)

App giúp tra cứu 1 từ tiếng Nhật xem có nằm trong **25.000 từ thông dụng nhất** hay không (đủ học từ N5 lên N1+), xem hạng thông dụng trên **thang logarit**, và kiểm tra từ có nằm trong **ngưỡng Top N** tùy chọn hay không.

### Chạy nhanh ứng dụng trên máy:
```bash
cd tan-suat-app
pnpm install
pnpm run dev
```

### Triển khai lên Vercel:
1. Import repository `Tlerd/studyjapan` trên Vercel.
2. Tại mục **Root Directory**, bấm **Edit** và chọn thư mục `tan-suat-app`.
3. Bấm **Deploy**.
