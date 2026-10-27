# Dữ liệu nguồn và cấu trúc thực tế

Tài liệu này ghi lại cấu trúc thực tế của các file nguồn dữ liệu sau khi mở và kiểm tra, tuân thủ quy tắc không đoán trường dữ liệu.

---

## 1. KANJIDIC2 (kanjidic2-all-3.6.2.json)
- **Nguồn**: EDRDG / jmdict-simplified
- **Số ký tự**: 13108
- **Cấu trúc mỗi character**:
  - `literal`: Ký tự kanji (chuỗi, ví dụ: "亜", "学", "泊")
  - `radicals`: Mảng đối tượng `{ type, value }` (classical, nelson_c, ...)
  - `misc`: Đối tượng `{ grade, strokeCounts: number[], frequency, jlptLevel }`
  - `readingMeaning`:
    - `groups`: Mảng nhóm gồm:
      - `readings`: Mảng `{ type, value }`. Các type quan trọng:
        - `"ja_on"`: Âm On (katakana)
        - `"ja_kun"`: Âm Kun (hiragana, có dấu chấm okurigana ví dụ "まな.ぶ")
        - `"vietnam"`: Âm Hán Việt (ví dụ "Học", "Bạc", "Nhật")
      - `meanings`: Mảng nghĩa `{ lang, value }` (tiếng Anh có lang: "en")

### 5 mục đầu tiên:
```json
[
  {
    "literal": "亜",
    "grade": 8,
    "strokeCounts": [
      7
    ],
    "frequency": 1509,
    "readings": [
      {
        "type": "pinyin",
        "value": "ya4"
      },
      {
        "type": "korean_r",
        "value": "a"
      },
      {
        "type": "korean_h",
        "value": "아"
      },
      {
        "type": "vietnam",
        "value": "A"
      },
      {
        "type": "vietnam",
        "value": "Á"
      },
      {
        "type": "ja_on",
        "value": "ア"
      },
      {
        "type": "ja_kun",
        "value": "つ.ぐ"
      }
    ],
    "meanings_en": [
      "Asia",
      "rank next",
      "come after",
      "-ous"
    ]
  },
  {
    "literal": "唖",
    "grade": null,
    "strokeCounts": [
      10
    ],
    "frequency": null,
    "readings": [
      {
        "type": "pinyin",
        "value": "ya1"
      },
      {
        "type": "korean_r",
        "value": "a"
      },
      {
        "type": "korean_h",
        "value": "아"
      },
      {
        "type": "vietnam",
        "value": "Á"
      },
      {
        "type": "vietnam",
        "value": "Ớ"
      },
      {
        "type": "vietnam",
        "value": "Ứ"
      },
      {
        "type": "ja_on",
        "value": "ア"
      },
      {
        "type": "ja_on",
        "value": "アク"
      },
      {
        "type": "ja_kun",
        "value": "おし"
      }
    ],
    "meanings_en": [
      "mute",
      "dumb"
    ]
  },
  {
    "literal": "娃",
    "grade": 9,
    "strokeCounts": [
      9
    ],
    "frequency": null,
    "readings": [
      {
        "type": "pinyin",
        "value": "wa2"
      },
      {
        "type": "korean_r",
        "value": "wae"
      },
      {
        "type": "korean_r",
        "value": "wa"
      },
      {
        "type": "korean_h",
        "value": "왜"
      },
      {
        "type": "korean_h",
        "value": "와"
      },
      {
        "type": "vietnam",
        "value": "Oa"
      },
      {
        "type": "ja_on",
        "value": "ア"
      },
      {
        "type": "ja_on",
        "value": "アイ"
      },
      {
        "type": "ja_on",
        "value": "ワ"
      },
      {
        "type": "ja_kun",
        "value": "うつく.しい"
      }
    ],
    "meanings_en": [
      "beautiful"
    ]
  },
  {
    "literal": "阿",
    "grade": 9,
    "strokeCounts": [
      8
    ],
    "frequency": 1126,
    "readings": [
      {
        "type": "pinyin",
        "value": "a1"
      },
      {
        "type": "pinyin",
        "value": "e1"
      },
      {
        "type": "pinyin",
        "value": "a5"
      },
      {
        "type": "pinyin",
        "value": "a2"
      },
      {
        "type": "pinyin",
        "value": "a4"
      },
      {
        "type": "korean_r",
        "value": "a"
      },
      {
        "type": "korean_r",
        "value": "og"
      },
      {
        "type": "korean_h",
        "value": "아"
      },
      {
        "type": "korean_h",
        "value": "옥"
      },
      {
        "type": "vietnam",
        "value": "A"
      },
      {
        "type": "vietnam",
        "value": "Á"
      },
      {
        "type": "ja_on",
        "value": "ア"
      },
      {
        "type": "ja_on",
        "value": "オ"
      },
      {
        "type": "ja_kun",
        "value": "おもね.る"
      },
      {
        "type": "ja_kun",
        "value": "くま"
      }
    ],
    "meanings_en": [
      "Africa",
      "flatter",
      "fawn upon",
      "corner",
      "nook",
      "recess"
    ]
  },
  {
    "literal": "哀",
    "grade": 8,
    "strokeCounts": [
      9
    ],
    "frequency": 1715,
    "readings": [
      {
        "type": "pinyin",
        "value": "ai1"
      },
      {
        "type": "korean_r",
        "value": "ae"
      },
      {
        "type": "korean_h",
        "value": "애"
      },
      {
        "type": "vietnam",
        "value": "Ai"
      },
      {
        "type": "ja_on",
        "value": "アイ"
      },
      {
        "type": "ja_kun",
        "value": "あわ.れ"
      },
      {
        "type": "ja_kun",
        "value": "あわ.れむ"
      },
      {
        "type": "ja_kun",
        "value": "かな.しい"
      }
    ],
    "meanings_en": [
      "pathetic",
      "grief",
      "sorrow",
      "pathos",
      "pity",
      "sympathize"
    ]
  }
]
```

---

## 2. JMdict Common (jmdict-eng-common-3.6.2.json)
- **Nguồn**: EDRDG / jmdict-simplified
- **Số từ**: 22649
- **Cấu trúc mỗi word**:
  - `id`: ID từ (chuỗi số, ví dụ "1000110")
  - `kanji`: Mảng `{ common: boolean, text: string, tags: string[] }`
  - `kana`: Mảng `{ common: boolean, text: string, tags: string[], appliesToKanji: string[] }`
  - `sense`: Mảng `{ partOfSpeech: string[], gloss: { lang: "eng", text: string }[] }`

### 5 mục đầu tiên:
```json
[
  {
    "id": "1000110",
    "kanji": [
      "ＣＤプレーヤー",
      "ＣＤプレイヤー"
    ],
    "kana": [
      "シーディープレーヤー",
      "シーディープレイヤー"
    ],
    "pos": [
      "n"
    ],
    "gloss": [
      "CD player"
    ]
  },
  {
    "id": "1000160",
    "kanji": [
      "Ｔシャツ"
    ],
    "kana": [
      "ティーシャツ"
    ],
    "pos": [
      "n"
    ],
    "gloss": [
      "T-shirt",
      "tee shirt"
    ]
  },
  {
    "id": "1000170",
    "kanji": [
      "Ｔバック"
    ],
    "kana": [
      "ティーバック"
    ],
    "pos": [
      "n"
    ],
    "gloss": [
      "T-back",
      "bikini thong"
    ]
  },
  {
    "id": "1000220",
    "kanji": [
      "明白"
    ],
    "kana": [
      "めいはく"
    ],
    "pos": [
      "adj-na"
    ],
    "gloss": [
      "obvious",
      "clear",
      "plain",
      "evident",
      "apparent",
      "explicit",
      "overt"
    ]
  },
  {
    "id": "1000320",
    "kanji": [
      "彼処",
      "彼所"
    ],
    "kana": [
      "あそこ",
      "あすこ",
      "かしこ",
      "アソコ",
      "あしこ"
    ],
    "pos": [
      "pn"
    ],
    "gloss": [
      "there",
      "over there",
      "that place",
      "yonder",
      "you-know-where"
    ]
  }
]
```

---

## 3. KRADFILE (kradfile-3.6.2.json)
- **Nguồn**: EDRDG / jmdict-simplified
- **Số kanji**: 12156
- **Cấu trúc**: Object với key là chữ kanji, value là mảng các mảnh bộ thủ (chuỗi).

### 5 mục đầu tiên:
```json
[
  {
    "kanji": "亜",
    "radicals": [
      "｜",
      "一",
      "口"
    ]
  },
  {
    "kanji": "唖",
    "radicals": [
      "｜",
      "一",
      "口"
    ]
  },
  {
    "kanji": "娃",
    "radicals": [
      "女",
      "土"
    ]
  },
  {
    "kanji": "阿",
    "radicals": [
      "一",
      "口",
      "亅",
      "阡"
    ]
  },
  {
    "kanji": "哀",
    "radicals": [
      "衣",
      "口",
      "亠"
    ]
  }
]
```

---

## 4. kanji-data (kanji-data.json)
- **Nguồn**: `davidluzgouveia/kanji-data` (tổng hợp từ Jonathan Waller JLPT + WaniKani)
- **Số kanji**: 13108
- **Cấu trúc**:
  - `strokes`: Số nét
  - `grade`: Khối lớp (1-8)
  - `jlpt_new`: Cấp JLPT mới (1-5, trong đó 5 là N5, 1 là N1)
  - `meanings`: Mảng nghĩa tiếng Anh
  - `readings_on`: Mảng âm On
  - `readings_kun`: Mảng âm Kun

### 5 mục đầu tiên:
```json
[
  {
    "kanji": "一",
    "data": {
      "strokes": 1,
      "grade": 1,
      "freq": 2,
      "jlpt_old": 4,
      "jlpt_new": 5,
      "meanings": [
        "One",
        "One Radical (no.1)"
      ],
      "readings_on": [
        "いち",
        "いつ"
      ],
      "readings_kun": [
        "ひと-",
        "ひと.つ"
      ],
      "wk_level": 1,
      "wk_meanings": [
        "One"
      ],
      "wk_readings_on": [
        "いち",
        "いつ"
      ],
      "wk_readings_kun": [
        "!ひと"
      ],
      "wk_radicals": [
        "Ground"
      ]
    }
  },
  {
    "kanji": "二",
    "data": {
      "strokes": 2,
      "grade": 1,
      "freq": 9,
      "jlpt_old": 4,
      "jlpt_new": 5,
      "meanings": [
        "Two",
        "Two Radical (no. 7)"
      ],
      "readings_on": [
        "に",
        "じ"
      ],
      "readings_kun": [
        "ふた",
        "ふた.つ",
        "ふたたび"
      ],
      "wk_level": 1,
      "wk_meanings": [
        "Two"
      ],
      "wk_readings_on": [
        "に"
      ],
      "wk_readings_kun": [
        "!ふた"
      ],
      "wk_radicals": [
        "Two"
      ]
    }
  },
  {
    "kanji": "九",
    "data": {
      "strokes": 2,
      "grade": 1,
      "freq": 55,
      "jlpt_old": 4,
      "jlpt_new": 5,
      "meanings": [
        "Nine"
      ],
      "readings_on": [
        "きゅう",
        "く"
      ],
      "readings_kun": [
        "ここの",
        "ここの.つ"
      ],
      "wk_level": 1,
      "wk_meanings": [
        "Nine"
      ],
      "wk_readings_on": [
        "く",
        "きゅう"
      ],
      "wk_readings_kun": [
        "!ここの"
      ],
      "wk_radicals": [
        "Nine"
      ]
    }
  },
  {
    "kanji": "七",
    "data": {
      "strokes": 2,
      "grade": 1,
      "freq": 115,
      "jlpt_old": 4,
      "jlpt_new": 5,
      "meanings": [
        "Seven"
      ],
      "readings_on": [
        "しち"
      ],
      "readings_kun": [
        "なな",
        "なな.つ",
        "なの"
      ],
      "wk_level": 1,
      "wk_meanings": [
        "Seven"
      ],
      "wk_readings_on": [
        "しち"
      ],
      "wk_readings_kun": [
        "!なな",
        "!なの"
      ],
      "wk_radicals": [
        "Seven"
      ]
    }
  },
  {
    "kanji": "人",
    "data": {
      "strokes": 2,
      "grade": 1,
      "freq": 5,
      "jlpt_old": 4,
      "jlpt_new": 5,
      "meanings": [
        "Person"
      ],
      "readings_on": [
        "じん",
        "にん"
      ],
      "readings_kun": [
        "ひと",
        "-り",
        "-と"
      ],
      "wk_level": 1,
      "wk_meanings": [
        "Person"
      ],
      "wk_readings_on": [
        "にん",
        "じん"
      ],
      "wk_readings_kun": [
        "!ひと",
        "!と"
      ],
      "wk_radicals": [
        "Person"
      ]
    }
  }
]
```

---

## 5. KanjiVG (kanjivg.xml.gz)
- **Nguồn**: KanjiVG Project (CC BY-SA 3.0)
- **Cấu trúc**: XML SVG biểu diễn từng kanji qua thẻ `<kanji id="kvg:kanji_{hex}">`
  - Nhóm cấu thành nét `<g kvg:element="..." kvg:position="left|right|top|bottom|surround...">`
  - Các đường nét `<path id="..." kvg:type="..." d="M...">`


---

## 6. JitenReader Parse API (jiten.moe)
- **Nguồn**: Dự án JitenReader (\`Sirush/JitenReader\`)
- **Endpoint**: \`https://api.jiten.moe/api/v1/parse\`
- **Phương thức**: \`POST\`
- **Headers**:
  - \`Content-Type: application/json\`
  - \`Authorization: Bearer <JITEN_API_KEY>\`
- **Request Body**:
  \`\`\`json
  {
    "text": "電車に乗る"
  }
  \`\`\`
- **Response Schema**:
  \`\`\`json
  {
    "tokens": [
      {
        "surface": "電車",
        "reading": "でんしゃ",
        "base": "電車",
        "pos": "noun",
        "isParticle": false
      },
      {
        "surface": "に",
        "reading": "に",
        "base": "に",
        "pos": "particle",
        "isParticle": true
      },
      {
        "surface": "乗る",
        "reading": "のる",
        "base": "乗る",
        "pos": "verb",
        "isParticle": false
      }
    ]
  }
  \`\`\`
- **Quy tắc bảo mật**: Key \`JITEN_API_KEY\` chỉ lưu trong biến môi trường server / Vercel, không đưa lên client bundle.
