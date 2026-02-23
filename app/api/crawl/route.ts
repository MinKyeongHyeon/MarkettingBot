import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export type CrawlMeta = {
  url: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json(
      { error: "domain 쿼리 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const url = normalizeUrl(domain);
  let html: string;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    const message = e instanceof Error ? e.message : "크롤링 실패";
    return NextResponse.json(
      { error: `도메인 요청 실패: ${message}` },
      { status: 502 }
    );
  }

  const $ = cheerio.load(html);

  const getMeta = (selector: string) =>
    $(selector).attr("content")?.trim() ?? "";
  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "";

  const meta: CrawlMeta = {
    url,
    title,
    description:
      getMeta('meta[property="og:description"]') ||
      getMeta('meta[name="description"]') ||
      "",
    ogTitle: getMeta('meta[property="og:title"]'),
    ogDescription: getMeta('meta[property="og:description"]'),
    ogImage: getMeta('meta[property="og:image"]'),
  };

  return NextResponse.json(meta);
}
