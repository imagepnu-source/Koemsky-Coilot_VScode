import { NextRequest, NextResponse } from "next/server";

// 서버 측에서 네이버 Papago NMT API 를 호출해 영→한 번역을 수행합니다.
// 환경 변수에 아래 값을 설정해야 합니다.
// NAVER_PAPAGO_CLIENT_ID
// NAVER_PAPAGO_CLIENT_SECRET

export async function POST(req: NextRequest) {
  try {
    const { text, source = "en", target = "ko" } = (await req.json()) ?? {};

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const clientId = process.env.NAVER_PAPAGO_CLIENT_ID;
    const clientSecret = process.env.NAVER_PAPAGO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[Papago] Missing NAVER_PAPAGO_CLIENT_ID or NAVER_PAPAGO_CLIENT_SECRET");
      return NextResponse.json({ error: "Papago credentials not configured" }, { status: 500 });
    }

    const params = new URLSearchParams({
      source,
      target,
      text,
    });

    const papagoRes = await fetch("https://openapi.naver.com/v1/papago/n2mt", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!papagoRes.ok) {
      const bodyText = await papagoRes.text();
      console.error("[Papago] HTTP error", papagoRes.status, bodyText);
      return NextResponse.json({ error: "Papago request failed" }, { status: 502 });
    }

    const data: any = await papagoRes.json();
    const translated = data?.message?.result?.translatedText as string | undefined;

    if (!translated || !translated.trim()) {
      return NextResponse.json({ translatedText: text });
    }

    return NextResponse.json({ translatedText: translated.trim() });
  } catch (e) {
    console.error("[Papago] Unexpected error", e);
    return NextResponse.json({ error: "Papago translate error" }, { status: 500 });
  }
}
