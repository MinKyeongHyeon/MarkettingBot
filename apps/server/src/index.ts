import express from "express";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN; // comma-separated list or undefined
const corsOptions = corsOrigin
  ? { origin: corsOrigin.split(",").map((s) => s.trim()) }
  : undefined;
app.use(corsOptions ? cors(corsOptions) : cors());

function isIpv4(host: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isIpv6(host: string) {
  return host.includes(":");
}

function ipv4ToInt(ip: string) {
  return (
    ip
      .split(".")
      .map((b) => parseInt(b, 10))
      .reduce((acc, val) => (acc << 8) + (val & 0xff), 0) >>> 0
  );
}

function isPrivateIpv4(ip: string) {
  try {
    const v = ipv4ToInt(ip);
    const ranges: Array<[number, number]> = [
      [ipv4ToInt("10.0.0.0"), ipv4ToInt("10.255.255.255")],
      [ipv4ToInt("172.16.0.0"), ipv4ToInt("172.31.255.255")],
      [ipv4ToInt("192.168.0.0"), ipv4ToInt("192.168.255.255")],
      [ipv4ToInt("127.0.0.0"), ipv4ToInt("127.255.255.255")],
      [ipv4ToInt("169.254.0.0"), ipv4ToInt("169.254.255.255")],
      [ipv4ToInt("0.0.0.0"), ipv4ToInt("0.255.255.255")],
    ];
    return ranges.some(([a, b]) => v >= a && v <= b);
  } catch {
    return false;
  }
}

function isPrivateIpv6(host: string) {
  const lh = host.toLowerCase();
  if (lh === "::1") return true;
  if (lh.startsWith("fe80:")) return true;
  if (lh.startsWith("fc") || lh.startsWith("fd")) return true;
  return false;
}

const FORBIDDEN_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "0.0.0.0",
  "169.254.169.254",
]);

function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/crawl", async (req, res) => {
  const domain = String(req.query.domain || "");
  if (!domain) return res.status(400).json({ error: "domain required" });

  const url = normalizeUrl(domain);
  if (url.length > 2048) return res.status(400).json({ error: "URL too long" });

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  if (FORBIDDEN_HOSTNAMES.has(hostname))
    return res.status(403).json({ error: "forbidden host" });
  if (isIpv4(hostname) && isPrivateIpv4(hostname))
    return res.status(403).json({ error: "private ip blocked" });
  if (isIpv6(hostname) && isPrivateIpv6(hostname))
    return res.status(403).json({ error: "private ip blocked" });

  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000) as any,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const html = await r.text();
    const $ = cheerio.load(html);
    const getMeta = (selector: string) =>
      $(selector).attr("content")?.trim() ?? "";
    const title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").first().text().trim() ||
      "";
    const meta = {
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
    return res.json(meta);
  } catch (e) {
    return res.status(502).json({ error: "fetch failed", detail: String(e) });
  }
});

app.post("/api/generate", async (req, res) => {
  const provided = String(req.header("x-api-key") || "");
  const expected = String(process.env.PUBLIC_API_KEY || "");
  if (!expected || provided !== expected)
    return res.status(401).json({ error: "Unauthorized" });

  const body = req.body as any;
  if (!body || !body.channel || !body.meta)
    return res.status(400).json({ error: "channel and meta required" });

  const OLLAMA_BASE = process.env.OLLAMA_BASE ?? "http://localhost:11434";
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "exaone3.5";

  const CHANNEL_PROMPTS: Record<string, (meta: any) => string> = {
    instagram: (meta) =>
      `아래 웹사이트를 인스타그램 게시물 캡션으로 홍보하는 문구를 작성해주세요.\n\n[웹사이트 정보]\n- URL: ${meta.url}\n- 제목: ${meta.title}\n- 설명: ${meta.description}\n\n[인스타그램 캡션 규칙]\n- 게시물(피드/릴스) 아래에 붙일 캡션 한 덩어리로만 출력하세요.`,
    blog: (meta) =>
      `아래 웹사이트를 블로그 글이나 블로그 배너/소개 영역에 쓸 마케팅 문구로 작성해주세요.\n\n[웹사이트 정보]\n- URL: ${meta.url}\n- 제목: ${meta.title}\n- 설명: ${meta.description}`,
    twitter: (meta) =>
      `아래 웹사이트를 X(트위터) 게시물 한 편으로 홍보하는 문구를 작성해주세요.\n\n[웹사이트 정보]\n- URL: ${meta.url}\n- 제목: ${meta.title}\n- 설명: ${meta.description}`,
  };

  const channel = body.channel as string;
  const meta = body.meta as any;
  if (!CHANNEL_PROMPTS[channel])
    return res.status(400).json({ error: "invalid channel" });

  const prompt = CHANNEL_PROMPTS[channel](meta);
  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: "",
        prompt,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000) as any,
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      return res
        .status(502)
        .json({ error: `Ollama error: ${ollamaRes.status}`, detail: text });
    }

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Monitor client disconnects so we can stop forwarding/reading
    let clientAborted = false;
    req.on("close", () => {
      clientAborted = true;
    });

    const reader = (ollamaRes.body as any)?.getReader?.();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      if (reader) {
        // WHATWG reader (Node 18+)
        try {
          while (true) {
            if (clientAborted) {
              try {
                reader.cancel?.();
              } catch {}
              break;
            }
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const obj = JSON.parse(line);
                if (obj.response != null) {
                  res.write(JSON.stringify({ delta: obj.response }) + "\n");
                }
              } catch (err) {
                // ignore parse errors for incomplete lines
              }
            }
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {}
        }
      } else if (
        ollamaRes.body &&
        (ollamaRes.body as any)[Symbol.asyncIterator]
      ) {
        // Node stream async iterator
        for await (const chunk of ollamaRes.body as any) {
          if (clientAborted) break;
          buffer +=
            typeof chunk === "string"
              ? chunk
              : decoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.response != null) {
                res.write(JSON.stringify({ delta: obj.response }) + "\n");
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // flush remaining buffer
      if (buffer) {
        try {
          const obj = JSON.parse(buffer);
          if (obj.response != null)
            res.write(JSON.stringify({ delta: obj.response }) + "\n");
        } catch {}
      }
    } catch (err) {
      // If streaming fails, attempt to inform client via NDJSON error frame
      try {
        res.write(JSON.stringify({ error: "stream_error", detail: String(err) }) + "\n");
      } catch {}
    } finally {
      try {
        res.end();
      } catch {}
    }
  } catch (e) {
    return res
      .status(502)
      .json({ error: "Ollama fetch failed", detail: String(e) });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`server listening ${port}`);
});
