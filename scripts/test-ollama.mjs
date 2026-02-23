/**
 * Ollama API 연동 테스트
 * - Ollama 서버 연결 확인
 * - 사용 가능한 모델 목록 조회
 * - /api/generate 호출 (짧은 프롬프트)로 응답 확인
 *
 * 실행: node scripts/test-ollama.mjs
 * 또는: OLLAMA_BASE=http://localhost:11434 OLLAMA_MODEL=모델명 node scripts/test-ollama.mjs
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE ?? "http://localhost:11434";
const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "jinbora/deepseek-r1-Bllossom:8b";

async function testOllamaConnection() {
  console.log("=== Ollama API 연동 테스트 ===\n");
  console.log(`OLLAMA_BASE: ${OLLAMA_BASE}`);
  console.log(`OLLAMA_MODEL: ${OLLAMA_MODEL}\n`);

  // 1. Ollama 서버 연결 확인
  console.log("[1/3] Ollama 서버 연결 확인...");
  try {
    const pingRes = await fetch(OLLAMA_BASE, { method: "GET" });
    if (!pingRes.ok) {
      throw new Error(`HTTP ${pingRes.status}`);
    }
    console.log("  ✓ Ollama 서버 응답 정상\n");
  } catch (e) {
    console.error(
      "  ✗ 실패:",
      e.message || e,
      "\n  → Ollama가 실행 중인지 확인하세요. (ollama serve 또는 Ollama 앱 실행)"
    );
    process.exit(1);
  }

  // 2. 사용 가능한 모델 목록
  console.log("[2/3] 사용 가능한 모델 목록 조회...");
  try {
    const tagsRes = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!tagsRes.ok) {
      throw new Error(`HTTP ${tagsRes.status}`);
    }
    const tagsData = await tagsRes.json();
    const models = tagsData.models ?? [];
    if (models.length === 0) {
      console.log("  ⚠ 로컬에 풀(pull)된 모델이 없습니다.");
      console.log(
        `  → 예: ollama pull ${OLLAMA_MODEL}\n`
      );
    } else {
      console.log(
        "  모델 목록:",
        models.map((m) => m.name).join(", ") || "(없음)"
      );
      const hasModel = models.some(
        (m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL + ":")
      );
      if (!hasModel) {
        console.log(
          `  ⚠ 설정된 모델 "${OLLAMA_MODEL}"이 목록에 없습니다. 다른 모델을 사용하거나 pull 하세요.\n`
        );
      } else {
        console.log(`  ✓ 사용할 모델 "${OLLAMA_MODEL}" 존재\n`);
      }
    }
  } catch (e) {
    console.error("  ✗ 실패:", e.message || e, "\n");
  }

  // 3. /api/generate 호출 테스트
  console.log("[3/3] /api/generate 호출 테스트 (stream: false)...");
  try {
    const body = {
      model: OLLAMA_MODEL,
      system: "절대 영어 단어를 섞지 말고 자연스러운 한국어 구어체로 작성하라.",
      prompt: "한 문장으로 자기소개 해줘.",
      stream: false,
    };
    const genRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!genRes.ok) {
      const text = await genRes.text();
      throw new Error(`HTTP ${genRes.status}: ${text.slice(0, 200)}`);
    }

    const data = await genRes.json();
    const response = (data.response ?? "").trim();
    console.log("  ✓ generate 응답 수신");
    console.log("  응답 내용 (일부):", (response || "(비어 있음)").slice(0, 200));
    if (response.length > 200) console.log("  ...");
    console.log("");
    console.log("=== 모든 테스트 통과 ===");
  } catch (e) {
    console.error(
      "  ✗ 실패:",
      e.message || e,
      "\n  → 모델명과 Ollama 실행 여부를 확인하세요."
    );
    process.exit(1);
  }
}

testOllamaConnection();
