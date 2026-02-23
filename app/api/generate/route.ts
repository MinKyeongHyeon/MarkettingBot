import { NextRequest, NextResponse } from "next/server";

type CrawlMeta = { url: string; title: string; description: string };

const OLLAMA_BASE = process.env.OLLAMA_BASE ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "exaone3.5";

const SYSTEM_PROMPT = `당신은 대한민국 최고의 SNS 마케팅 카피라이터입니다.
  - 오직 사용자가 복사해서 바로 사용할 수 있는 '최종 문구'만 출력하세요.
  - 인사말, 분석 과정, <think> 태그, 부연 설명은 절대 포함하지 마세요.
  - 반드시 자연스러운 한국어(구어체)로 작성하고, 불필요한 영단어 혼용을 금지합니다.`;

export type MarketingChannel = "instagram" | "blog" | "twitter";

const CHANNEL_NAMES: Record<MarketingChannel, string> = {
  instagram: "인스타그램용",
  blog: "블로그용",
  twitter: "X(트위터)용",
};

const CHANNEL_PROMPTS: Record<
  MarketingChannel,
  (meta: CrawlMeta) => string
> = {
  instagram(meta) {
    return `아래 웹사이트를 인스타그램 게시물 캡션으로 홍보하는 문구를 작성해주세요.

[웹사이트 정보]
- URL: ${meta.url}
- 제목: ${meta.title}
- 설명: ${meta.description}

[인스타그램 캡션 규칙]
- 게시물(피드/릴스) 아래에 붙일 캡션 한 덩어리로만 출력하세요.
- 첫 1~2문장은 스크롤 없이 보이는 핵심 메시지로, 눈에 띄고 공감 가는 문장으로 작성하세요.
- 이어서 서비스/제품의 핵심 가치나 경험을 2~3문장으로 짧게 풀어주세요.
- 마지막에 행동 유도 문구 한 줄(예: 링크 프로필에서 더 보기, 댓글로 의견 남겨주세요)을 넣으세요.
- 필요하면 적절한 이모지 1~3개만 사용하고, 끝에 관련 해시태그 3~5개를 한 줄로 붙이세요.
- 마크다운, 제목, 번호 목록 없이 흐르는 문단으로만 출력하세요.`;
  },

  blog(meta) {
    return `아래 웹사이트를 블로그 글이나 블로그 배너/소개 영역에 쓸 마케팅 문구로 작성해주세요.

[웹사이트 정보]
- URL: ${meta.url}
- 제목: ${meta.title}
- 설명: ${meta.description}

[블로그용 문구 규칙]
- 블로그 상단 소개 문단 또는 배너/CTA 영역에 넣을 2~3문단 분량으로 작성하세요.
- 첫 문단: 검색·유입 독자를 끌어당기는 문장으로, 제목/서비스 핵심을 자연스럽게 담으세요.
- 둘째 문단: 이 서비스·제품이 왜 좋은지, 어떤 문제를 해결하는지 구체적으로 2~4문장으로 쓰세요.
- 셋째 문단: 마무리 문장과 함께 '자세히 보기', '지금 확인하기' 등 CTA 한 줄을 포함하세요.
- 정보 전달과 신뢰감이 느껴지는 문체로, 키워드를 억지로 나열하지 말고 문장 안에 녹여내세요.
- 마크다운, 제목, 번호 목록 없이 문단만으로 출력하세요.`;
  },

  twitter(meta) {
    return `아래 웹사이트를 X(트위터) 게시물 한 편으로 홍보하는 문구를 작성해주세요.

[웹사이트 정보]
- URL: ${meta.url}
- 제목: ${meta.title}
- 설명: ${meta.description}

[X(트위터) 규칙]
- 한글이면 140자 내외, 영문이면 280자 내외로 한 편의 완결된 글로만 출력하세요.
- 첫 문장이 타임라인에서 잘려도 임팩트 있게, 호기심이나 공감을 유발하는 문장으로 시작하세요.
- 중간은 서비스·제품의 핵심 한 줄과 링크/행동 유도로 마무리하세요.
- 필요 시 관련 해시태그 1~2개만 끝에 붙이세요. 이모지는 선택사항이며 과하지 않게 쓰세요.
- 대화하듯 자연스럽고, 과장·광고체를 피해 짧고 강렬하게 쓰세요.
- 마크다운 없이 한 덩어리 텍스트로만 출력하세요.`;
  },
};

function buildPrompt(channel: MarketingChannel, meta: CrawlMeta): string {
  return CHANNEL_PROMPTS[channel](meta);
}

export async function POST(request: NextRequest) {
  let body: { channel: MarketingChannel; meta: CrawlMeta };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 본문이 필요합니다." },
      { status: 400 },
    );
  }

  const { channel, meta } = body;
  const validChannels: MarketingChannel[] = ["instagram", "blog", "twitter"];
  if (!channel || !validChannels.includes(channel)) {
    return NextResponse.json(
      {
        error: `channel은 다음 중 하나여야 합니다: ${validChannels.join(", ")}`,
      },
      { status: 400 },
    );
  }
  if (!meta?.url || !meta?.title) {
    return NextResponse.json(
      { error: "meta 객체에 url, title이 필요합니다." },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(channel, meta);

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: SYSTEM_PROMPT,
        prompt,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Ollama 요청 실패 (${res.status}): ${text}` },
        { status: 502 },
      );
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: "Ollama 스트림을 읽을 수 없습니다." },
        { status: 502 },
      );
    }

    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
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
                const obj = JSON.parse(line);
                if (obj.response != null) {
                  controller.enqueue(
                    new TextEncoder().encode(
                      JSON.stringify({ delta: obj.response }) + "\n",
                    ),
                  );
                }
              } catch {
                // ignore parse errors for incomplete lines
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ollama 연결 실패";
    return NextResponse.json(
      {
        error: `Ollama 호출 오류: ${message}. 로컬에서 Ollama가 실행 중인지 확인하세요.`,
      },
      { status: 502 },
    );
  }
}
