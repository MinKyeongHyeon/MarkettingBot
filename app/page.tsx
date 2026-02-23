"use client";

import { useState } from "react";

type CrawlMeta = {
  url: string;
  title: string;
  description: string;
};

type ChannelId = "instagram" | "blog" | "twitter";

const CHANNELS: { id: ChannelId; name: string }[] = [
  { id: "instagram", name: "인스타그램용" },
  { id: "blog", name: "블로그용" },
  { id: "twitter", name: "X(트위터)용" },
];

type ChannelResult = {
  status: "idle" | "loading" | "done" | "error";
  content?: string;
  error?: string;
};

/** 스트림 수신 후 최종 content 정리 (<think>, --- 등 제거) */
function cleanupContent(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (out.includes("---")) {
    out = out.split("---").pop()?.trim() ?? out;
  }
  return out;
}

async function streamGenerate(
  channelId: ChannelId,
  meta: CrawlMeta,
  onDelta: (content: string) => void,
  onError: (message: string) => void,
  onDone: (finalContent: string) => void,
) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelId, meta }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    onError(data.error ?? "생성 실패");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("스트림을 읽을 수 없습니다.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as { delta?: string };
          if (typeof obj.delta === "string") {
            content += obj.delta;
            onDelta(content);
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    const final = cleanupContent(content);
    onDone(final);
  } catch (e) {
    onError(e instanceof Error ? e.message : "스트림 읽기 실패");
  } finally {
    reader.releaseLock();
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [meta, setMeta] = useState<CrawlMeta | null>(null);
  const [channelResults, setChannelResults] = useState<
    Record<ChannelId, ChannelResult>
  >({
    instagram: { status: "idle" },
    blog: { status: "idle" },
    twitter: { status: "idle" },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = url.trim();
    if (!raw) return;

    setLoading(true);
    setCrawlError(null);
    setMeta(null);
    setChannelResults({
      instagram: { status: "idle" },
      blog: { status: "idle" },
      twitter: { status: "idle" },
    });

    try {
      const crawlRes = await fetch(
        `/api/crawl?domain=${encodeURIComponent(raw)}`
      );
      const crawlData = await crawlRes.json();

      if (!crawlRes.ok) {
        setCrawlError(crawlData.error ?? "메타 정보 크롤링 실패");
        setLoading(false);
        return;
      }

      const crawlMeta: CrawlMeta = {
        url: crawlData.url,
        title: crawlData.title,
        description: crawlData.description,
      };
      setMeta(crawlMeta);

      for (const ch of CHANNELS) {
        setChannelResults((prev) => ({
          ...prev,
          [ch.id]: { status: "loading", content: "" },
        }));

        await streamGenerate(
          ch.id,
          crawlMeta,
          (content) => {
            setChannelResults((prev) => ({
              ...prev,
              [ch.id]: { status: "loading", content },
            }));
          },
          (error) => {
            setChannelResults((prev) => ({
              ...prev,
              [ch.id]: { status: "error", error },
            }));
          },
          (finalContent) => {
            setChannelResults((prev) => ({
              ...prev,
              [ch.id]: { status: "done", content: finalContent },
            }));
          },
        );
      }
    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main">
      <section className="hero">
        <form onSubmit={handleSubmit} className="input-wrap">
          <input
            type="text"
            placeholder="URL을 입력하세요"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "분석 중…" : "분석하기"}
          </button>
        </form>
        {crawlError && <p className="status error">오류: {crawlError}</p>}
      </section>

      {meta && (
        <section className="results">
          <div className="meta-summary">
            <span className="meta-label">Title</span>
            <span className="meta-value">{meta.title || "(없음)"}</span>
            <span className="meta-label">Description</span>
            <span className="meta-value">{meta.description || "(없음)"}</span>
          </div>

          <div className="cards">
            {CHANNELS.map((ch) => {
              const result = channelResults[ch.id];
              const isLoading = result.status === "loading";
              const isError = result.status === "error";
              const isDone = result.status === "done";
              const showContent =
                isLoading || isDone ? (result.content ?? "") : "";
              const showPlaceholder =
                isLoading && !showContent ? "생성 중…" : null;

              return (
                <article
                  key={ch.id}
                  className={`card ${isLoading ? "loading" : ""} ${isError ? "error" : ""}`}
                >
                  <h3 className="card-title">{ch.name}</h3>
                  <div className="card-content-wrap">
                    <div
                      className={`card-content ${isLoading ? "card-content--blur" : ""}`}
                    >
                      {showPlaceholder}
                      {showContent}
                      {isError && result.error}
                      {result.status === "idle" && "—"}
                    </div>
                    {isLoading && (
                      <div className="card-loading-spinner" aria-hidden>
                        <span className="spinner" />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
