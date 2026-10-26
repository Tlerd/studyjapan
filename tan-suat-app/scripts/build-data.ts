import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import * as wanakana from "wanakana";

interface RawEntry {
  word: string;
  reading: string;
  rawRank: number;
}

interface ColumnarFreqData {
  source: string;
  builtAt: string;
  total: number | null;
  words: string[];
  readings: string[];
  counts: number[] | null;
}

async function buildData() {
  const currentDir = process.cwd();
  const rawCsvPath = path.join(currentDir, "data", "raw", "frequency_list_global.csv");
  const publicDir = path.join(currentDir, "public");
  const outputPath = path.join(publicDir, "freq.json");

  if (!fs.existsSync(rawCsvPath)) {
    throw new Error(`CSV file not found at ${rawCsvPath}`);
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`Reading CSV from: ${rawCsvPath}`);

  // Map of unique word -> best entry
  const wordMap = new Map<string, RawEntry>();
  let rowCount = 0;

  const parser = fs
    .createReadStream(rawCsvPath, { encoding: "utf8" })
    .pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      })
    );

  for await (const row of parser) {
    rowCount++;
    const rawWord = (row.Word || "").normalize("NFKC").trim();
    const rawForm = (row.Form || "").normalize("NFKC").trim();
    const rawRank = Number.parseInt(row.Rank, 10);

    if (!rawWord || Number.isNaN(rawRank)) {
      continue;
    }

    const reading = wanakana.toHiragana(rawForm);

    const existing = wordMap.get(rawWord);
    if (!existing || rawRank < existing.rawRank) {
      wordMap.set(rawWord, {
        word: rawWord,
        reading,
        rawRank,
      });
    }
  }

  console.log(`Processed ${rowCount} rows, found ${wordMap.size} unique words.`);

  // Sort unique words by rawRank ascending
  const sortedEntries = Array.from(wordMap.values()).sort(
    (a, b) => a.rawRank - b.rawRank
  );

  // Take top 25,000
  const top25k = sortedEntries.slice(0, 25000);

  const columnarData: ColumnarFreqData = {
    source: "jiten.moe Global (CC BY-SA 4.0)",
    builtAt: new Date().toISOString().slice(0, 10),
    total: null,
    words: top25k.map((item) => item.word),
    readings: top25k.map((item) => item.reading),
    counts: null,
  };

  const jsonString = JSON.stringify(columnarData);
  fs.writeFileSync(outputPath, jsonString, "utf8");

  const stat = fs.statSync(outputPath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  const sizeKB = (stat.size / 1024).toFixed(1);

  console.log("\n================ THỐNG KÊ BUILD DỮ LIỆU ================");
  console.log(`- File xuất: ${outputPath}`);
  console.log(`- Số mục: ${columnarData.words.length.toLocaleString("vi-VN")}`);
  console.log(`- Kích thước file: ${sizeKB} KB (${sizeMB} MB)`);

  console.log("\n- Top 10 từ đầu tiên:");
  for (let i = 0; i < 10; i++) {
    console.log(
      `  #${i + 1}: ${columnarData.words[i]} (${columnarData.readings[i]})`
    );
  }

  console.log("\n- Kiểm tra các từ mẫu (theo yêu cầu PLAN.md):");
  const testWords = ["温泉", "自転車", "食べる"];
  for (const w of testWords) {
    const idx = columnarData.words.indexOf(w);
    if (idx !== -1) {
      console.log(
        `  ✅ "${w}" có mặt tại hạng ${idx + 1} (cách đọc: ${columnarData.readings[idx]})`
      );
    } else {
      console.log(`  ❌ Không tìm thấy "${w}" trong top 25.000!`);
    }
  }
  console.log("========================================================\n");
}

buildData().catch((err) => {
  console.error("Build data failed:", err);
  process.exit(1);
});
