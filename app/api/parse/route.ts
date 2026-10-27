import { NextRequest, NextResponse } from "next/server";
import freqData from "../../../public/freq.json";
import * as wanakana from "wanakana";

// Server memory cache (LRU-like simple map)
const serverParseCache = new Map<string, any>();

interface ParseToken {
  surface: string;
  reading: string;
  base?: string;
  pos?: string;
  isParticle?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    const queryText = (text || "").trim();

    if (!queryText) {
      return NextResponse.json({ tokens: [] });
    }

    // 1. Check server memory cache
    if (serverParseCache.has(queryText)) {
      return NextResponse.json({
        tokens: serverParseCache.get(queryText),
        cached: true
      });
    }

    // 2. If JITEN_API_KEY is available, call jiten parse API
    const apiKey = process.env.JITEN_API_KEY;
    if (apiKey) {
      try {
        const jitenRes = await fetch("https://api.jiten.moe/api/v1/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({ text: queryText })
        });

        if (jitenRes.ok) {
          const data = await jitenRes.json();
          // Cache & return
          if (data && data.tokens) {
            serverParseCache.set(queryText, data.tokens);
            return NextResponse.json({ tokens: data.tokens });
          }
        }
      } catch (err) {
        console.warn("Jiten API call failed, falling back to local parse:", err);
      }
    }

    // 3. Fallback: Parse locally using freq.json & wanakana
    const freq = freqData as { words: string[]; readings: string[] };
    const tokens: ParseToken[] = [];

    // Simple chunk tokenizer for Japanese text
    const chunks = queryText.split(/([に乗をがへでとからまで])/);
    for (const chunk of chunks) {
      if (!chunk) continue;
      const isParticle = ["に", "を", "が", "へ", "で", "と", "から", "まで"].includes(chunk);

      if (isParticle) {
        tokens.push({
          surface: chunk,
          reading: chunk,
          isParticle: true
        });
      } else {
        // Find reading from freq.json
        const idx = freq.words.indexOf(chunk);
        const reading = idx !== -1 && freq.readings[idx] ? freq.readings[idx] : wanakana.toHiragana(chunk);

        tokens.push({
          surface: chunk,
          reading,
          isParticle: false
        });
      }
    }

    serverParseCache.set(queryText, tokens);
    return NextResponse.json({ tokens, fallback: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Lỗi xử lý furigana", tokens: [] },
      { status: 500 }
    );
  }
}
