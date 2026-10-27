import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";

function sanitizeKey(key: string): string {
  return (
    (key || "studyjapan_master")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || "studyjapan_master"
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = sanitizeKey(searchParams.get("key") || "");

    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, "sync_channels", key);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const payload = snap.data();
      return NextResponse.json({
        success: true,
        key,
        data: payload.data || payload,
        lastUpdated: payload.lastUpdated || new Date().toISOString(),
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

    if (!data) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu đồng bộ" },
        { status: 400 }
      );
    }

    const lastUpdated = body.lastUpdated || new Date().toISOString();
    const deviceId = body.deviceId || "api_client";

    const firestore = getFirebaseFirestore();
    const docRef = doc(firestore, "sync_channels", key);
    await setDoc(docRef, {
      version: 2,
      key,
      deviceId,
      lastUpdated,
      data,
    });

    return NextResponse.json({
      success: true,
      lastUpdated,
      message: "Đã đồng bộ lên Firebase thành công.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi máy chủ khi lưu đồng bộ" },
      { status: 500 }
    );
  }
}
