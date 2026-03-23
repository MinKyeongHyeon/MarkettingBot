import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

// Simple IP/CIDR checks without extra deps
function isIpv4(host: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isIpv6(host: string) {
  return host.includes(":");
}

function ipv4ToInt(ip: string) {
  return ip
    .split('.')
    .map((b) => parseInt(b, 10))
    .reduce((acc, val) => (acc << 8) + (val & 0xff), 0) >>> 0;
}

function isPrivateIpv4(ip: string) {
  try {
    const v = ipv4ToInt(ip);
    const ranges: Array<[number, number]> = [
      [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
      [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
      [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
      [ipv4ToInt('127.0.0.0'), ipv4ToInt('127.255.255.255')],
      [ipv4ToInt('169.254.0.0'), ipv4ToInt('169.254.255.255')],
      [ipv4ToInt('0.0.0.0'), ipv4ToInt('0.255.255.255')],
    ];
    return ranges.some(([a, b]) => v >= a && v <= b);
  } catch {
    return false;
  }
}

function isPrivateIpv6(host: string) {
  const lh = host.toLowerCase();
  if (lh === '::1') return true;
  if (lh.startsWith('fe80:')) return true; // link-local
  if (lh.startsWith('fc') || lh.startsWith('fd')) return true; // ULA
  return false;
}

const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'ip6-localhost',
  '0.0.0.0',
  '169.254.169.254', // cloud metadata
]);

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
  // Basic input validation
  if (url.length > 2048) {
    return NextResponse.json({ error: "URL이 너무 깁니다." }, { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
  }

  // Immediate hostname blacklist
  if (FORBIDDEN_HOSTNAMES.has(hostname)) {
    return NextResponse.json({ error: "차단된 호스트입니다." }, { status: 403 });
  }

  // If hostname is an IP literal, block private ranges
  if (isIpv4(hostname)) {
    if (isPrivateIpv4(hostname)) {
      return NextResponse.json({ error: "사설망/루프백 주소 차단" }, { status: 403 });
    }
  } else if (isIpv6(hostname)) {
    if (isPrivateIpv6(hostname)) {
      return NextResponse.json({ error: "사설망/루프백 주소 차단" }, { status: 403 });
    }
  }
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
