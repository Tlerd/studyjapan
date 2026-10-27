import { NextRequest, NextResponse } from "next/server";
import kanjiData from "../../../public/kanji.json";
import wordsData from "../../../public/words.json";
import { DEFAULT_SYSTEM_INSTRUCTIONS } from "../../../lib/scanDefaults";

const kanjiDb = kanjiData as Record<string, any>;
const wordsDb = wordsData as Record<string, any>;

interface RequestPayload {
  mode?: "scan" | "chat";
  imageBase64?: string;
  mimeType?: string;
  textInput?: string;
  model?: string;
  effort?: "low" | "medium" | "high";
  skills?: Array<{ id: string; title: string; prompt: string }>;
  invokedSkills?: Array<{ id: string; title: string; prompt: string }>;
  instructions?: string;
  // For chat
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: string;
}

// Map user model choice to Gemini API model identifiers
function resolveGeminiModel(userModel?: string): string {
  const m = (userModel || "").trim().toLowerCase();
  if (!m) return "gemini-2.5-flash";

  // Allow direct custom model IDs like "gemini-2.5-flash", "gemini-2.5-pro", etc.
  if (m.startsWith("gemini-") && !m.includes(" ")) {
    return m;
  }

  if (m.includes("3.8") || m.includes("3-8")) {
    return "gemini-3.8-flash";
  }
  if (m.includes("2.5 pro") || m.includes("2.5-pro")) {
    return "gemini-2.5-pro";
  }
  if (m.includes("2.0 flash") || m.includes("2.0-flash")) {
    return "gemini-2.0-flash";
  }
  if (m.includes("1.5 flash") || m.includes("1.5-flash")) {
    return "gemini-1.5-flash";
  }
  return "gemini-2.5-flash";
}

// Map effort to thinking budget
function resolveThinkingConfig(effort?: "low" | "medium" | "high") {
  if (effort === "low") {
    return { thinkingBudget: 1024 };
  }
  if (effort === "high") {
    return { thinkingBudget: 8192 };
  }
  // Default medium
  return { thinkingBudget: 4096 };
}

function modelSupportsThinking(modelId: string): boolean {
  const m = modelId.toLowerCase();
  return m.includes("2.5") || m.includes("3.") || m.includes("3-") || m.includes("thinking");
}

/**
 * Trích xuất phần văn bản trả lời chính thức, bỏ qua các part suy luận nội bộ (thought: true)
 */
function extractAnswerText(result: any): string {
  const parts: any[] = result?.candidates?.[0]?.content?.parts || [];
  const nonThoughtParts = parts.filter((p) => !p?.thought && typeof p?.text === "string");
  if (nonThoughtParts.length > 0) {
    return nonThoughtParts.map((p) => p.text).join("\n");
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    if (typeof parts[i]?.text === "string") {
      return parts[i].text;
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình GEMINI_API_KEY trong file .env hoặc biến môi trường của ứng dụng. " +
            "Vui lòng thêm GEMINI_API_KEY vào .env để sử dụng tính năng này.",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as RequestPayload;
    const mode = body.mode || "scan";
    const selectedModel = resolveGeminiModel(body.model);
    const thinkingConfig = resolveThinkingConfig(body.effort);

    // Build combined System Instructions
    let fullSystemInstructions = DEFAULT_SYSTEM_INSTRUCTIONS;
    if (body.instructions && body.instructions.trim()) {
      fullSystemInstructions += `\n\n[Chỉ dẫn bổ sung từ người học]:\n${body.instructions.trim()}`;
    }

    if (body.invokedSkills && body.invokedSkills.length > 0) {
      fullSystemInstructions += "\n\n[NGƯỜI DÙNG CHỈ ĐỊNH RÕ CÁC KỸ NĂNG SAU QUA @ HOẶC /]:";
      body.invokedSkills.forEach((s, idx) => {
        fullSystemInstructions += `\n${idx + 1}. Kỹ năng ${s.title}: ${s.prompt}`;
      });
      fullSystemInstructions += "\nHãy ưu tiên hàng đầu và tập trung toàn lực áp dụng các kỹ năng được chỉ định này.";
    } else {
      fullSystemInstructions +=
        "\n\n[CHẾ ĐỘ TỰ ĐỘNG GỌI SKILL PHÙ HỢP]:\n" +
        "Tự động nhận diện ngữ cảnh và áp dụng các kỹ năng phù hợp:\n" +
        "- Nếu phát hiện câu hỏi bài tập (trắc nghiệm, điền từ, sắp xếp dấu sao ★, đọc hiểu): Tự động giải chi tiết từng câu, dịch câu hỏi, chỉ rõ đáp án đúng và phân tích lý do các đáp án còn lại sai.\n" +
        "- Tự động bóc tách các từ vựng quan trọng kèm âm Hán Việt, cách đọc Hiragana và nghĩa theo ngữ cảnh.\n" +
        "- Tự động bóc tách các cấu trúc ngữ pháp kèm công thức chia/kết nối (formation) và trích câu ví dụ thực tế.";
    }

    if (body.skills && body.skills.length > 0) {
      fullSystemInstructions += "\n\n[Danh sách toàn bộ các kỹ năng có sẵn trong hệ thống]:";
      body.skills.forEach((s, idx) => {
        fullSystemInstructions += `\n- ${s.title}: ${s.prompt}`;
      });
    }

    // MODE 1: SCAN (OCR, Exercise Solver, Word & Grammar Extraction)
    if (mode === "scan") {
      const contentsParts: any[] = [];

      // 1. Image part if provided
      if (body.imageBase64) {
        let cleanBase64 = body.imageBase64;
        const commaIdx = cleanBase64.indexOf(",");
        if (commaIdx !== -1) {
          cleanBase64 = cleanBase64.substring(commaIdx + 1);
        }
        contentsParts.push({
          inlineData: {
            mimeType: body.mimeType || "image/jpeg",
            data: cleanBase64,
          },
        });
      }

      // 2. Text prompt part
      const promptText = `Hãy nhận diện hình ảnh/văn bản tiếng Nhật này và trả về kết quả dưới định dạng JSON duy nhất tuân thủ đúng cấu trúc sau:
{
  "rawText": "Toàn bộ văn bản tiếng Nhật đọc được từ ảnh hoặc đề bài",
  "translatedText": "Bản dịch tiếng Việt tự nhiên và chuẩn xác cho đoạn văn",
  "exercises": [
    {
      "id": "ex-1",
      "questionText": "Nội dung câu hỏi tiếng Nhật (bao gồm câu dẫn và chỗ trống nếu có)",
      "questionTranslation": "Dịch nghĩa câu hỏi sang tiếng Việt",
      "options": ["1. Lựa chọn 1", "2. Lựa chọn 2", "3. Lựa chọn 3", "4. Lựa chọn 4"],
      "correctAnswer": "2",
      "explanation": "Giải thích chi tiết tại sao đáp án 2 đúng (về ngữ pháp, từ vựng, ngữ cảnh) và phân tích lý do các lựa chọn còn lại sai"
    }
  ],
  "words": [
    {
      "surface": "Từ vựng (dạng viết chuẩn)",
      "reading": "Cách đọc viết bằng chữ Hiragana",
      "hanViet": "Âm Hán Việt",
      "meaning": "Nghĩa tiếng Việt phù hợp nhất với ngữ cảnh",
      "level": 5,
      "contextSentence": "Câu gốc chứa từ này trích từ ảnh"
    }
  ],
  "grammar": [
    {
      "pattern": "Mẫu ngữ pháp (ví dụ: 〜ている, 〜なければならない)",
      "formation": "Công thức kết nối (ví dụ: V-て + いる)",
      "meaning": "Nghĩa tiếng Việt của mẫu ngữ pháp",
      "explanation": "Giải thích súc tích cách dùng và sắc thái",
      "exampleSentence": "Câu ví dụ thực tế trích từ ảnh",
      "exampleTranslation": "Dịch câu ví dụ sang tiếng Việt",
      "level": 5
    }
  ]
}

Lưu ý:
- Nếu ảnh có câu hỏi bài tập (trắc nghiệm, điền từ, sắp xếp dấu sao ★, đọc hiểu), hãy giải đầy đủ từng câu trong mảng "exercises". Nếu không có câu hỏi bài tập, để "exercises": [].
- Bóc tách đầy đủ các từ vựng quan trọng và cấu trúc ngữ pháp xuất hiện trong ảnh/đề bài.
- Chỉ trả về duy nhất chuỗi JSON hợp lệ, không bọc markdown fence và không có text nào ngoài JSON.`;

      contentsParts.push({
        text: body.textInput ? `${promptText}\n\nĐề bài / Văn bản đi kèm:\n${body.textInput}` : promptText,
      });

      const { data: result, modelUsed } = await callGeminiWithFallback(
        apiKey,
        selectedModel,
        {
          contents: [{ role: "user", parts: contentsParts }],
          systemInstruction: {
            parts: [{ text: fullSystemInstructions }],
          },
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        },
        thinkingConfig
      );

      // Parse JSON response
      let parsedData: any = {};
      try {
        let rawResponse = extractAnswerText(result) || "{}";
        rawResponse = rawResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsedData = JSON.parse(rawResponse);
      } catch (parseErr) {
        return NextResponse.json(
          { error: "Lỗi phân tích dữ liệu JSON từ AI: " + String(parseErr) },
          { status: 500 }
        );
      }

      // Enrich words with local database (Han-Viet, rank, level)
      if (Array.isArray(parsedData.words)) {
        parsedData.words = parsedData.words.map((w: any) => {
          const surface = (w.surface || "").trim();
          const kMeta = kanjiDb[surface];
          const wMeta = wordsDb[surface];

          // Build Han-Viet from each Kanji character if not already provided
          let inferredHanViet = "";
          if (!w.hanViet && surface) {
            const hvParts: string[] = [];
            for (const ch of surface) {
              if (kanjiDb[ch]?.hanViet) {
                hvParts.push(kanjiDb[ch].hanViet);
              }
            }
            if (hvParts.length > 0) {
              inferredHanViet = hvParts.join(" ");
            }
          }

          const hanViet = w.hanViet || kMeta?.hanViet || inferredHanViet || "";
          const level = w.level || wMeta?.jlpt || kMeta?.jlpt || 5;
          return {
            ...w,
            surface,
            hanViet,
            level,
          };
        });
      }

      return NextResponse.json({
        ...parsedData,
        modelUsed,
      });
    }

    // MODE 2: CHAT (Follow-up interactive conversation)
    if (mode === "chat") {
      const messages = body.messages || [];
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      let chatSystemInstruction = fullSystemInstructions;
      if (body.context) {
        chatSystemInstruction += `\n\n[Bối cảnh bài học/bức ảnh người học vừa quét]:\n${body.context}`;
      }

      const { data: result, modelUsed } = await callGeminiWithFallback(
        apiKey,
        selectedModel,
        {
          contents,
          systemInstruction: {
            parts: [{ text: chatSystemInstruction }],
          },
          generationConfig: {
            temperature: 0.4,
          },
        },
        thinkingConfig
      );

      const reply = extractAnswerText(result) || "Không có phản hồi.";
      return NextResponse.json({ reply, modelUsed });
    }

    return NextResponse.json({ error: "Chế độ không hợp lệ." }, { status: 400 });
  } catch (err: any) {
    console.error("Scan API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Đã xảy ra lỗi khi gọi Gemini API." },
      { status: 500 }
    );
  }
}

/**
 * Gọi Gemini REST API với cơ chế tự động chuyển đổi sang model thay thế nếu model yêu cầu chưa khả dụng
 * và tự động lược bỏ thinkingConfig nếu model fallback không hỗ trợ.
 */
async function callGeminiWithFallback(
  apiKey: string,
  model: string,
  basePayload: any,
  thinkingConfig: { thinkingBudget: number }
): Promise<{ data: any; modelUsed: string }> {
  const modelsToTry = [model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const currentModel of uniqueModels) {
    const includeThinking = modelSupportsThinking(currentModel);
    const payloadWithThinking = {
      ...basePayload,
      generationConfig: {
        ...basePayload.generationConfig,
        ...(includeThinking ? { thinkingConfig } : {}),
      },
    };

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadWithThinking),
      });

      if (res.ok) {
        return { data: await res.json(), modelUsed: currentModel };
      }

      const errText = await res.text();

      // If 400 due to thinkingConfig not supported on this endpoint, retry same model without thinkingConfig
      if (
        res.status === 400 &&
        includeThinking &&
        (errText.includes("thinkingConfig") || errText.includes("thinking_config"))
      ) {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        });
        if (res.ok) {
          return { data: await res.json(), modelUsed: currentModel };
        }
      }

      // If 404 or model not supported, try next fallback model
      if (
        res.status === 404 ||
        errText.includes("not found") ||
        errText.includes("not supported") ||
        errText.includes("is not found for API version")
      ) {
        console.warn(`Model ${currentModel} not available, trying next fallback...`);
        lastError = new Error(`Model ${currentModel}: ${errText}`);
        continue;
      }

      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    } catch (e: any) {
      lastError = e;
      if (
        e?.message?.includes("404") ||
        e?.message?.includes("not found") ||
        e?.message?.includes("not supported")
      ) {
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error("Không thể kết nối với Gemini API qua bất kỳ model nào.");
}
