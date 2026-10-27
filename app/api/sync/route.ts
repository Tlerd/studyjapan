import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || "";
const GIST_ID = process.env.GITHUB_SYNC_GIST_ID || "7dac7196ac30df120523d260f68ad324";

// In-memory fallback relay cache in case GitHub API has transient rate limits
const memoryRelayCache = new Map<string, { data: any; lastUpdated: string }>();

function sanitizeKey(key: string): string {
  return (key || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = sanitizeKey(searchParams.get("key") || "");

    if (!key) {
      return NextResponse.json(
        { error: "Thiếu mã đồng bộ (key)" },
        { status: 400 }
      );
    }

    const filename = `sync_${key}.json`;

    // 1. Fetch from GitHub Gist if token configured
    if (GITHUB_TOKEN) {
      try {
        const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "User-Agent": "StudyJapan-App",
          },
          cache: "no-store",
        });

        if (gistRes.ok) {
          const gist = await gistRes.json();
          const file = gist.files?.[filename];

          if (file && file.content) {
            const payload = JSON.parse(file.content);
            return NextResponse.json({
              success: true,
              key,
              data: payload.data || payload,
              lastUpdated:
                payload.lastUpdated ||
                payload.exportedAt ||
                new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn("Gist fetch warning, falling back to memory cache:", e);
      }
    }

    // 2. Check memory relay cache
    const cached = memoryRelayCache.get(key);
    if (cached) {
      return NextResponse.json({
        success: true,
        key,
        data: cached.data,
        lastUpdated: cached.lastUpdated,
      });
    }

    return NextResponse.json(
      {
        success: false,
        notFound: true,
        message: "Chưa tìm thấy dữ liệu đồng bộ trên đám mây cho mã này.",
      },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi máy chủ khi đọc đồng bộ" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = sanitizeKey(body.key || "");
    const data = body.data;

    if (!key) {
      return NextResponse.json(
        { error: "Thiếu mã đồng bộ (key)" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu đồng bộ" },
        { status: 400 }
      );
    }

    const lastUpdated = body.lastUpdated || new Date().toISOString();
    const payload = {
      version: 2,
      key,
      lastUpdated,
      data,
    };

    // Save to memory relay cache
    memoryRelayCache.set(key, { data, lastUpdated });

    // Save to GitHub Secret Gist if configured
    if (GITHUB_TOKEN) {
      const filename = `sync_${key}.json`;
      try {
        const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "User-Agent": "StudyJapan-App",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "StudyJapan Cloud Sync Data Vault",
            files: {
              [filename]: {
                content: JSON.stringify(payload),
              },
            },
          }),
        });

        if (!gistRes.ok) {
          const errText = await gistRes.text();
          console.warn("Gist update warning:", errText);
        }
      } catch (e) {
        console.warn("Gist patch error, saved to relay cache:", e);
      }
    }

    return NextResponse.json({
      success: true,
      lastUpdated,
      message: "Đã đồng bộ lên đám mây thành công.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi máy chủ khi lưu đồng bộ" },
      { status: 500 }
    );
  }
}
