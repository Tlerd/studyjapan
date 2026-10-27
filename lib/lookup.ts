import * as wanakana from "wanakana";

export interface RawFreqData {
  source: string;
  builtAt: string;
  total: number | null;
  words: string[];
  readings: string[];
  counts: number[] | null;
}

export interface Entry {
  rank: number;
  word: string;
  reading: string;
  count: number | null;
}

export interface LookupResult extends Entry {
  others: Entry[];
}

export class FreqIndex {
  private data: RawFreqData;
  private wordIndex: Map<string, number> = new Map();
  private readingIndex: Map<string, number[]> = new Map();

  constructor(data: RawFreqData) {
    this.data = data;
    this.buildIndex();
  }

  private buildIndex(): void {
    const { words, readings } = this.data;
    const len = words.length;

    for (let i = 0; i < len; i++) {
      const w = (words[i] || "").normalize("NFKC").trim();
      const r = wanakana.toHiragana((readings[i] || "").normalize("NFKC").trim());

      // Word index: keep first (best rank)
      if (w && !this.wordIndex.has(w)) {
        this.wordIndex.set(w, i);
      }

      // Reading index: list of word indexes sorted by rank ascending
      if (r) {
        let list = this.readingIndex.get(r);
        if (!list) {
          list = [];
          this.readingIndex.set(r, list);
        }
        list.push(i);
      }
    }
  }

  private toEntry(idx: number): Entry {
    return {
      rank: idx + 1,
      word: this.data.words[idx],
      reading: this.data.readings[idx],
      count: this.data.counts ? this.data.counts[idx] ?? null : null,
    };
  }

  public lookup(query: string): LookupResult | null {
    const qTrim = (query || "").trim();
    if (!qTrim) return null;

    const qNorm = qTrim.normalize("NFKC");
    const qHiragana = wanakana.toHiragana(qNorm);

    // 1. Khớp chính xác chữ gốc
    let matchIdx = this.wordIndex.get(qNorm);

    // 2. Khớp chữ đã đổi Katakana -> Hiragana (nếu là từ viết bằng kana)
    if (matchIdx === undefined && qHiragana !== qNorm) {
      matchIdx = this.wordIndex.get(qHiragana);
    }

    if (matchIdx !== undefined) {
      const reading = wanakana.toHiragana(
        (this.data.readings[matchIdx] || "").normalize("NFKC").trim()
      );
      const sameReadingList = this.readingIndex.get(reading) || [];
      const others = sameReadingList
        .filter((i) => i !== matchIdx)
        .slice(0, 3)
        .map((i) => this.toEntry(i));

      return {
        ...this.toEntry(matchIdx),
        others,
      };
    }

    // 3. Khớp theo cách đọc (query là kana/hiragana/katakana)
    const candidates = this.readingIndex.get(qHiragana);
    if (candidates && candidates.length > 0) {
      const bestIdx = candidates[0];
      const others = candidates.slice(1, 4).map((i) => this.toEntry(i));

      return {
        ...this.toEntry(bestIdx),
        others,
      };
    }

    return null;
  }

  public getData(): RawFreqData {
    return this.data;
  }
}

let defaultIndex: FreqIndex | null = null;

export function setDefaultIndex(index: FreqIndex | null): void {
  defaultIndex = index;
}

export function getDefaultIndex(): FreqIndex | null {
  return defaultIndex;
}

export function lookup(query: string, customData?: RawFreqData): LookupResult | null {
  if (customData) {
    const idx = new FreqIndex(customData);
    return idx.lookup(query);
  }
  if (!defaultIndex) {
    return null;
  }
  return defaultIndex.lookup(query);
}

export function percent(
  e: Entry,
  total: number | null
): { pct: number; perMillion: number } | null {
  if (total === null || total <= 0 || e.count === null || e.count < 0) {
    return null;
  }
  const frac = e.count / total;
  const pct = frac * 100;
  const perMillion = frac * 1_000_000;
  return { pct, perMillion };
}

export function inTopN(e: Entry, n: number): boolean {
  return e.rank <= n;
}
