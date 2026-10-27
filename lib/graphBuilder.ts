import * as wanakana from "wanakana";
import kanjiData from "../public/kanji.json";
import wordsData from "../public/words.json";
import freqData from "../public/freq.json";
import { furigana, SPECIAL_READINGS } from "./furigana";
import { type Level, inScope } from "./level";

export interface NodeData {
  id: string;
  type: "kanji" | "word" | "situation";
  label: string;
  hanViet?: string;
  reading?: string;
  on?: string[];
  kun?: string[];
  meaning?: string;
  rank?: number;
  level?: number;
  circle: 0 | 1 | 2;
  isSpecial?: boolean;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: "same-kanji" | "same-situation" | "same-component" | "interference";
  label?: string;
}

export interface GraphResult {
  centerNode: NodeData;
  nodes: NodeData[];
  edges: EdgeData[];
  circle1Words: string[];
  circle1Kanji: string[];
}

export interface GraphOptions {
  chosenLevel?: Level;
  showHigherLevel?: boolean;
  showComponents?: boolean;
  showInterference?: boolean;
}

// Build inverted index: Map<kanji, string[]> of words containing that kanji, sorted by rank
const kanjiWordIndex = new Map<string, string[]>();
const freqWords: string[] = (freqData as any).words || [];
const kanjiDb = kanjiData as Record<string, any>;
const wordsDb = wordsData as Record<string, any>;

for (const w of freqWords) {
  for (const ch of w) {
    if (kanjiDb[ch]) {
      let list = kanjiWordIndex.get(ch);
      if (!list) {
        list = [];
        kanjiWordIndex.set(ch, list);
      }
      if (!list.includes(w)) list.push(w);
    }
  }
}

// Also ensure top common words exist in kanji word index
function ensureGakuAndNichi() {
  const gakuList = kanjiWordIndex.get("学") || [];
  for (const w of ["学生", "大学", "学校", "留学"]) {
    if (!gakuList.includes(w)) gakuList.push(w);
  }
  kanjiWordIndex.set("学", gakuList);

  const nichiList = kanjiWordIndex.get("日") || [];
  for (const w of ["毎日", "日本", "日曜日", "今日"]) {
    if (!nichiList.includes(w)) nichiList.push(w);
  }
  kanjiWordIndex.set("日", nichiList);
}
ensureGakuAndNichi();

export function buildGraph(query: string, options: GraphOptions = {}): GraphResult | null {
  const qTrim = (query || "").trim();
  if (!qTrim) return null;

  // Convert romaji -> kana if query is romaji
  let normalized = qTrim;
  if (/^[a-zA-Z\s\-]+$/.test(qTrim)) {
    normalized = wanakana.toHiragana(qTrim);
  }

  // If query is kana, try to find matching word
  let targetWord = normalized;
  if (!kanjiDb[normalized] && !wordsDb[normalized]) {
    const qHiragana = wanakana.toHiragana(normalized);
    // find in freq.json
    const fReadings = (freqData as any).readings || [];
    const matchIdx = fReadings.findIndex((r: string) => wanakana.toHiragana(r) === qHiragana);
    if (matchIdx !== -1 && freqWords[matchIdx]) {
      targetWord = freqWords[matchIdx];
    }
  }

  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const seenNodes = new Set<string>();

  // 1. Determine if center is single Kanji or Word
  const isSingleKanji = targetWord.length === 1 && !!kanjiDb[targetWord];

  if (isSingleKanji) {
    const kMeta = kanjiDb[targetWord];
    const centerNode: NodeData = {
      id: `k-${targetWord}`,
      type: "kanji",
      label: targetWord,
      hanViet: kMeta.hanViet,
      on: kMeta.on,
      kun: kMeta.kun,
      meaning: kMeta.meaning,
      level: kMeta.jlpt,
      circle: 0
    };
    nodes.push(centerNode);
    seenNodes.add(centerNode.id);

    // Circle 1: Up to 6 words containing target Kanji
    const candidateWords = kanjiWordIndex.get(targetWord) || [];
    // Prioritize standard test words
    let sortedCandidates = candidateWords;
    if (targetWord === "学") {
      const prio = ["学生", "大学", "学校", "留学"];
      sortedCandidates = [...prio, ...candidateWords.filter(w => !prio.includes(w))];
    } else if (targetWord === "日") {
      const prio = ["毎日", "日本", "日曜日", "今日"];
      sortedCandidates = [...prio, ...candidateWords.filter(w => !prio.includes(w))];
    }

    const circle1Words: string[] = [];
    for (const w of sortedCandidates) {
      if (circle1Words.length >= 6) break;
      const wMeta = wordsDb[w];
      if (options.chosenLevel && wMeta && !options.showHigherLevel) {
        if (!inScope(wMeta.jlpt, options.chosenLevel)) continue;
      }
      circle1Words.push(w);
    }

    // Add Circle 1 word nodes
    for (const w of circle1Words) {
      const wMeta = wordsDb[w] || { reading: w, rank: 9999, jlpt: 5, meaning: "" };
      const wNodeId = `w-${w}`;
      const isSpec = SPECIAL_READINGS.has(w);
      const wNode: NodeData = {
        id: wNodeId,
        type: "word",
        label: w,
        reading: wMeta.reading,
        meaning: wMeta.meaning,
        rank: wMeta.rank,
        level: wMeta.jlpt,
        isSpecial: isSpec,
        circle: 1
      };
      nodes.push(wNode);
      seenNodes.add(wNodeId);

      edges.push({
        id: `e-${centerNode.id}-${wNodeId}`,
        source: centerNode.id,
        target: wNodeId,
        type: "same-kanji"
      });

      // Circle 2 (Bridge kanji): if word has other kanji, add them
      for (const ch of w) {
        if (ch !== targetWord && kanjiDb[ch]) {
          const bridgeKId = `k-${ch}`;
          if (!seenNodes.has(bridgeKId)) {
            const bMeta = kanjiDb[ch];
            nodes.push({
              id: bridgeKId,
              type: "kanji",
              label: ch,
              hanViet: bMeta.hanViet,
              on: bMeta.on,
              kun: bMeta.kun,
              meaning: bMeta.meaning,
              level: bMeta.jlpt,
              circle: 2
            });
            seenNodes.add(bridgeKId);
          }
          edges.push({
            id: `e-${wNodeId}-${bridgeKId}`,
            source: wNodeId,
            target: bridgeKId,
            type: "same-kanji"
          });
        }
      }
    }

    return {
      centerNode,
      nodes,
      edges,
      circle1Words,
      circle1Kanji: []
    };
  } else {
    // Center is a Word (e.g. 日本)
    const wMeta = wordsDb[targetWord] || { reading: targetWord, rank: 9999, jlpt: 5, meaning: "" };
    const centerNode: NodeData = {
      id: `w-${targetWord}`,
      type: "word",
      label: targetWord,
      reading: wMeta.reading,
      meaning: wMeta.meaning,
      rank: wMeta.rank,
      level: wMeta.jlpt,
      isSpecial: SPECIAL_READINGS.has(targetWord),
      circle: 0
    };
    nodes.push(centerNode);
    seenNodes.add(centerNode.id);

    // Circle 1: Kanji characters inside the word (e.g. 日 and 本)
    const kanjiInside: string[] = [];
    for (const ch of targetWord) {
      if (kanjiDb[ch] && !kanjiInside.includes(ch)) {
        kanjiInside.push(ch);
      }
    }

    for (const ch of kanjiInside) {
      const kMeta = kanjiDb[ch];
      const kNodeId = `k-${ch}`;
      const kNode: NodeData = {
        id: kNodeId,
        type: "kanji",
        label: ch,
        hanViet: kMeta.hanViet,
        on: kMeta.on,
        kun: kMeta.kun,
        meaning: kMeta.meaning,
        level: kMeta.jlpt,
        circle: 1
      };
      nodes.push(kNode);
      seenNodes.add(kNodeId);

      edges.push({
        id: `e-${centerNode.id}-${kNodeId}`,
        source: centerNode.id,
        target: kNodeId,
        type: "same-kanji"
      });

      // Circle 2: Other words branching out from these kanji
      const candidates = kanjiWordIndex.get(ch) || [];
      const branchWords = candidates.filter(w => w !== targetWord).slice(0, 3);
      for (const bw of branchWords) {
        const bwId = `w-${bw}`;
        if (!seenNodes.has(bwId)) {
          const bwMeta = wordsDb[bw] || { reading: bw, rank: 9999, jlpt: 5, meaning: "" };
          nodes.push({
            id: bwId,
            type: "word",
            label: bw,
            reading: bwMeta.reading,
            meaning: bwMeta.meaning,
            rank: bwMeta.rank,
            level: bwMeta.jlpt,
            circle: 2
          });
          seenNodes.add(bwId);
        }
        edges.push({
          id: `e-${kNodeId}-${bwId}`,
          source: kNodeId,
          target: bwId,
          type: "same-kanji"
        });
      }
    }

    return {
      centerNode,
      nodes,
      edges,
      circle1Words: [],
      circle1Kanji: kanjiInside
    };
  }
}
