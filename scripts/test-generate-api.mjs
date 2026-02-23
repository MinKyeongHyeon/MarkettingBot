/**
 * Next.js /api/generate 엔드포인트 테스트
 * (개발 서버가 떠 있어야 함: npm run dev)
 *
 * 실행: node scripts/test-generate-api.mjs
 * 또는: BASE_URL=http://localhost:3000 node scripts/test-generate-api.mjs
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const testPayload = {
  channel: "instagram",
  meta: {
    url: "https://example.com",
    title: "테스트 사이트",
    description: "마케팅 봇 연동 테스트용 메타 정보입니다.",
  },
};

async function testGenerateApi() {
  console.log("=== /api/generate 엔드포인트 테스트 ===\n");
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log("요청 body:", JSON.stringify(testPayload, null, 2), "\n");

  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(120000),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("✗ API 오류:", res.status, data);
      console.error(
        "  → Ollama가 실행 중인지, 모델이 pull 되어 있는지 확인하세요."
      );
      process.exit(1);
    }

    console.log("✓ 응답 수신");
    console.log("  channel:", data.channel);
    console.log("  channelName:", data.channelName);
    console.log("  content (일부):", (data.content ?? "").slice(0, 300));
    if ((data.content ?? "").length > 300) console.log("  ...");
    console.log("\n=== 테스트 통과 ===");
  } catch (e) {
    console.error(
      "✗ 요청 실패:",
      e.message || e,
      "\n  → 개발 서버가 실행 중인지 확인하세요. (npm run dev)"
    );
    process.exit(1);
  }
}

testGenerateApi();
