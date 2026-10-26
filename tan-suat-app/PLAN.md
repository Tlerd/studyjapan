# PLAN – App "Tần suất từ" (tra 1 từ → có nằm trong nhóm thông dụng không)

> File này để đưa cho coding agent (Antigravity). Agent đọc từ trên xuống, làm theo thứ tự các Phase.
> Bản mẫu giao diện: `prototype.html` (cùng thư mục). Chỉ giữ **2 khối**: **Thẻ kết quả** và **Bảng hạng có thanh trượt**.

---

## 0. Mục tiêu (đọc kỹ trước khi code)

Người dùng gõ **1 từ tiếng Nhật** (kanji hoặc hiragana/katakana). App trả lời 2 câu:

1. **Từ này lặp lại bao nhiêu %?** = `số lần xuất hiện ÷ tổng số từ trong kho × 100`, hiển thị thêm `≈ X lần / 1 triệu từ`.
2. **Có nằm trong top N không?** = `hạng ≤ N` → ✅ / ❌, kèm hạng.

Phạm vi dữ liệu: **đủ để học lên N1**. Ước tính cộng đồng (không có danh sách JLPT chính thức): N5 ~800 · N4 ~1.500 · N3 ~3.750 · N2 ~6.000 · N1 ~10.000–12.000 từ. Danh sách tần suất không khớp 1–1 với JLPT, nên **lấy top 25.000 từ** cho dư.

**Ngoài phạm vi Phase 1:** đăng nhập, lưu tài khoản, tách câu/chia động từ, furigana cho cả đoạn văn (để Phase 3).

---

## 1. Hai khối giao diện cần giữ (theo prototype)

### Khối A – Thẻ kết quả
```
┌─────────────────────────────────────────────┐
│ おんせん   ← furigana: chữ hiragana nhỏ, nằm TRÊN kanji │
│ 温泉                                         │
│ Lặp lại: 0,0070%   ≈ 70 lần / 1 triệu từ    │
│ Hạng: 1.850 / 25.000                        │
│ ✅ Có nằm trong top 2.500                    │
│    Hạng 1.850 ≤ 2.500                       │
└─────────────────────────────────────────────┘
```
- **Furigana bằng thẻ `<ruby>` của HTML**, không dùng màu để thể hiện cách đọc:
  `<ruby>温泉<rt>おんせん</rt></ruby>`. CSS: `rt { font-size: 0.5em; }`. Từ chỉ có kana (vd: する) thì không cần `<rt>`.
- Không tìm thấy → `⚪ Không có trong 25.000 từ thông dụng nhất – rất hiếm gặp` + gợi ý "Thử nhập thể từ điển (vd: 食べた → 食べる)".
- Nếu dữ liệu không có số lần xuất hiện → ẩn dòng "Lặp lại", chỉ hiện hạng (xem mục 3.3).

### Khối B – Bảng hạng có thanh trượt
- Trục dọc **thang log** từ hạng 1 (trên) → 25.000 (dưới), vạch 1 · 10 · 100 · 1.000 · 10.000.
- Vùng màu: 🟢 hạng 1 → N · 🟡 N → 25.000 · ⚪ ngoài danh sách.
- **Thanh trượt N**: 500 → 25.000, bước 500, mặc định 2.500. Kéo là thẻ kết quả + vùng màu đổi ngay.
- **Vạch mốc JLPT (nét đứt, nhãn "ước tính")** ở hạng 800 / 1.500 / 3.750 / 6.000 / 11.000 → nhãn N5 / N4 / N3 / N2 / N1.
- Chấm: từ vừa tra (chấm xanh to, có nhãn) + **10 từ tra gần nhất** (chấm nhỏ, lưu `localStorage`).
- Nút nhanh bên dưới: "N = mức N3 / N2 / N1" → đặt slider vào mốc tương ứng.

Giữ phong cách prototype: nền kem, thẻ bo góc, font Be Vietnam Pro + Noto Sans JP, sáng/tối theo hệ thống, không tràn ngang ở 375px.

---

## 2. Tech stack

| Phần | Chọn | Lý do |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Deploy Vercel 1 click; có API route cho Phase 3 |
| Style | Tailwind CSS | Nhanh, khớp prototype |
| Dữ liệu | File tĩnh `public/freq.json` (đã nén gzip/brotli bởi Vercel) | Không cần database, tra tức thì, chạy offline sau lần tải đầu |
| Kana | `wanakana` | Đổi katakana ↔ hiragana khi tra |
| Test | Vitest | Test hàm tra cứu + tính % |
| Deploy | Vercel (Hobby, miễn phí) | |

---

## 3. Dữ liệu

### 3.1 Nguồn (tải tay, không scrape)
| Ưu tiên | Nguồn | Ghi chú |
|---|---|---|
| 1 | **jiten.moe – Global frequency list (CSV)**: https://jiten.moe/frequency-dictionaries (hoặc API `GET https://api.jiten.moe/api/frequency-list/download?downloadType=csv`) | Từ anime, drama, phim, tiểu thuyết… Giấy phép **CC BY-SA 4.0** → phải ghi nguồn. Hạng ưu tiên từ xuất hiện ở **nhiều tác phẩm**. Từ kanji có 2 hạng: hạng chữ kanji và hạng chữ kana (㋕). |
| 2 (dự phòng cho %) | **BCCWJ Short Unit Word list – NINJAL**: https://clrd.ninjal.ac.jp/bccwj/en/freq-list.html | Có **số lần xuất hiện** và tần suất/1 triệu từ. Miễn phí cho **học tập/nghiên cứu** → hợp app cá nhân. Nếu public thương mại phải hỏi NINJAL. |

⚠️ Luật của jiten.moe: **không bulk-scrape**, frequency list là "heavy endpoint" (≤10 request/phút). Tải **1 lần bằng tay**, commit file đã xử lý vào repo.

### 3.2 Bước 1 bắt buộc: kiểm tra cột CSV
Trước khi viết script, agent **mở file CSV, in 5 dòng đầu, ghi lại tên cột thật** vào `data/README.md`. Không đoán cột.

### 3.3 Quyết định nguồn cho % (cây quyết định)
```
CSV jiten có cột số lần xuất hiện (count/occurrences/frequency)?
├─ CÓ  → dùng jiten cho cả hạng và %.
└─ KHÔNG
   ├─ Dùng jiten cho HẠNG.
   └─ Ghép BCCWJ (theo cặp từ+cách đọc) để lấy %; từ không ghép được → ẩn dòng %.
      Nhãn nguồn % hiển thị: "Tần suất trong văn viết (BCCWJ)".
```
**Không bao giờ bịa % từ hạng** (vd: suy theo định luật Zipf). Không có số thì không hiện.

### 3.4 Script build dữ liệu: `scripts/build-data.ts`
Input: `data/raw/*.csv` (không commit file raw nếu lớn; commit output).
Các bước:
1. Đọc CSV (dùng `csv-parse`), xử lý BOM, UTF-8.
2. Chuẩn hoá: `NFKC`, trim; với cách đọc: katakana → hiragana (`wanakana.toHiragana`).
3. Lấy **top 25.000** theo hạng.
4. Trùng chữ: giữ hạng **tốt nhất** (số nhỏ nhất).
5. Xuất **dạng cột** để nhẹ:
```json
{
  "source": "jiten.moe Global (CC BY-SA 4.0)",
  "builtAt": "2026-10-27",
  "total": 123456789,          // tổng số lần xuất hiện của TOÀN kho (không chỉ top 25k). null nếu không có
  "words":    ["の", "は", "..."],
  "readings": ["の", "は", "..."],
  "counts":   [4500000, 2600000, ...]   // null nếu không có
}
```
   - `rank` = vị trí trong mảng + 1 (không lưu riêng).
   - ⚠️ `total` phải là tổng **cả kho**, lấy từ toàn bộ file trước khi cắt top 25.000, nếu không % sẽ sai (cao hơn thật).
6. In thống kê: số mục, kích thước file, 10 từ đầu, kiểm tra 温泉 / 自転車 / 食べる có mặt.

**Dung lượng dự kiến:** ~25.000 × ~30 byte ≈ **0,8–1 MB** JSON thô, ~**250–350 KB** sau nén. Tải 1 lần.

---

## 4. Logic tra cứu: `lib/lookup.ts`

```ts
type Entry = { rank: number; word: string; reading: string; count: number | null };

// Build 1 lần khi tải: Map<string, number> từ cả word và reading → index
// Khoá được chuẩn hoá: NFKC, trim, katakana→hiragana
lookup(query: string): Entry | null
percent(e: Entry, total: number | null): { pct: number; perMillion: number } | null
inTopN(e: Entry, n: number): boolean
```
Quy tắc:
- Chuẩn hoá query giống lúc build. Thử khớp theo thứ tự: chữ gốc → chữ đã đổi katakana→hiragana → cách đọc.
- Một cách đọc trùng nhiều từ (vd: こう) → trả về từ **hạng tốt nhất**, và hiển thị "Còn N từ khác cùng cách đọc" (liệt kê tối đa 3).
- Định dạng số kiểu Việt Nam: `Intl.NumberFormat('vi-VN')` → `2.500`, `0,0070%`.

### Test (Vitest) – bắt buộc pass
| Input | Kỳ vọng |
|---|---|
| `温泉` | tìm thấy, có hạng |
| `おんせん` | cùng kết quả với `温泉` |
| `オンセン` | cùng kết quả (katakana→hiragana) |
| ` 温泉 ` | trim, vẫn thấy |
| `zzz` | null → thẻ "không có" |
| hạng 1.850, N=2.500 | `inTopN` = true; N=1.000 → false |
| count 7.000, total 100.000.000 | pct = 0,007; perMillion = 70 |
| total = null | percent() trả null, UI ẩn dòng % |

---

## 5. Cấu trúc thư mục

```
tan-suat-app/
├─ app/
│  ├─ layout.tsx          # font, metadata, sáng/tối
│  └─ page.tsx            # ô tìm + Khối A + Khối B
├─ components/
│  ├─ SearchBox.tsx       # input + Enter + chip gợi ý
│  ├─ ResultCard.tsx      # Khối A
│  └─ RankLadder.tsx      # Khối B (SVG, thang log, slider, mốc JLPT)
├─ lib/
│  ├─ lookup.ts
│  ├─ format.ts           # số kiểu vi-VN
│  └─ useFreqData.ts      # fetch /freq.json 1 lần, cache trong memory
├─ public/freq.json
├─ scripts/build-data.ts
├─ data/README.md         # tên cột thật, nguồn, ngày tải, giấy phép
├─ tests/lookup.test.ts
└─ README.md
```

---

## 6. Các Phase & tiêu chí xong

### Phase 1 – Dữ liệu (≈ 1 buổi)
- [ ] Tải CSV jiten Global (tay). Ghi tên cột vào `data/README.md`.
- [ ] Đi theo cây quyết định 3.3. Nếu cần, tải thêm BCCWJ SUW.
- [ ] `npm run build:data` → `public/freq.json` ≤ 1,2 MB, có đúng 25.000 mục.
- **Xong khi:** script in ra 温泉, 自転車, 食べる có hạng; `total` là tổng cả kho.

### Phase 2 – Giao diện 2 khối (≈ 1–2 buổi)
- [ ] `SearchBox` + `ResultCard` + `RankLadder` theo mục 1.
- [ ] Slider đổi N cập nhật cả 2 khối ngay (không reload).
- [ ] Lưu 10 từ gần nhất + giá trị N vào `localStorage` (bọc try/catch).
- [ ] Footer ghi nguồn: "Dữ liệu tần suất: jiten.moe – CC BY-SA 4.0" (+ BCCWJ/NINJAL nếu dùng). Mốc JLPT ghi "ước tính".
- **Xong khi:** test Vitest pass; 375px không tràn ngang; Lighthouse Performance ≥ 90; tra 1 từ < 50 ms sau khi dữ liệu đã tải.

### Phase 3 – (Tuỳ chọn, sau) Dán cả đoạn văn
Lấy cảm hứng từ **JitenReader** (https://github.com/Sirush/JitenReader, MIT): dán một đoạn tiếng Nhật → tách từ → **hiện furigana (hiragana nhỏ phía trên) cho mọi từ có kanji, dùng `<ruby>`; KHÔNG tô màu chữ**. Bấm/chạm vào một từ → mở Thẻ kết quả (Khối A) của từ đó. Cuối đoạn hiện % số từ trong đoạn thuộc top N hiện tại.
- Cách đọc cho furigana lấy từ kết quả parse của API (trường reading), không tự đoán.
- Tách từ bằng API jiten: `GET https://api.jiten.moe/api/vocabulary/parse?text=...`, header `X-Api-Key`.
- Gọi qua **API route của Next.js** (`app/api/parse/route.ts`), key để trong **biến môi trường Vercel** `JITEN_API_KEY`. **Tuyệt đối không** đưa key lên client hay commit vào git (key này cho toàn quyền tài khoản).
- Giới hạn: 300 request/phút với key → thêm debounce + cache.
- Đây là phần chỉ dùng cá nhân; không mở công khai làm relay API (vi phạm luật jiten).

---

## 7. Deploy lên Vercel

1. Tạo repo GitHub (private cũng được) và push code.
2. vercel.com → **Add New → Project → Import** repo → Framework: Next.js → **Deploy**.
   (Hoặc dùng CLI: `npm i -g vercel` → `vercel` → `vercel --prod`.)
3. (Chỉ Phase 3) Project → Settings → **Environment Variables** → thêm `JITEN_API_KEY` → Redeploy.
4. Kiểm tra trên điện thoại: tra 温泉, kéo slider, xem lại ở chế độ tối.

---

## 8. Prompt dán cho Antigravity

```
Đọc PLAN.md và prototype.html trong thư mục này. Xây app Next.js 15 + TypeScript + Tailwind theo PLAN.md.
Làm lần lượt Phase 1 rồi Phase 2. KHÔNG làm Phase 3 nếu tôi chưa yêu cầu.
Bắt buộc:
- Trước khi viết scripts/build-data.ts, mở file CSV tôi đã tải ở data/raw/, in 5 dòng đầu và ghi tên cột thật vào data/README.md. Không đoán cột.
- Theo cây quyết định ở mục 3.3; không bao giờ suy ra % từ hạng.
- "total" phải là tổng cả kho, không phải tổng top 25.000.
- Viết tests/lookup.test.ts với đủ các ca ở mục 4 và chạy cho pass.
- Giao diện chỉ gồm ô tìm + Thẻ kết quả + Bảng hạng có slider, giữ phong cách prototype.html.
- Ghi nguồn dữ liệu và giấy phép ở footer.
Xong mỗi Phase thì dừng, báo tôi: đã làm gì, lệnh để chạy thử, và những gì còn thiếu.
```

---

## 9. Rủi ro đã biết

| Rủi ro | Cách xử lý |
|---|---|
| CSV jiten không có số lần xuất hiện | Cây quyết định 3.3 (ghép BCCWJ hoặc ẩn %) |
| Người dùng nhập thể chia (食べた) | Phase 1–2: hiện gợi ý "nhập thể từ điển". Phase 3: dùng API parse |
| Một cách đọc nhiều từ (こう, かみ) | Trả hạng tốt nhất + liệt kê từ khác |
| Hạng jiten ưu tiên "xuất hiện ở nhiều tác phẩm" chứ không thuần đếm số lần | Ghi rõ trên UI: "Hạng theo jiten.moe" |
| Mốc JLPT không chính thức | Nét đứt + chữ "ước tính" |
| Lộ API key (Phase 3) | Chỉ để ở env Vercel, gọi qua server route |
