#!/usr/bin/env bash
set -eu

# Load .env.local if present (KEY=VALUE lines)
if [ -f .env.local ]; then
  set -o allexport
  source .env.local
  set +o allexport
fi

: "${VERCEL_API_KEY:?Please set VERCEL_API_KEY in environment or .env.local}"
: "${OLLAMA_INTERNAL_TOKEN:?Please set OLLAMA_INTERNAL_TOKEN in environment or .env.local}"

HOST=${HOST:-http://localhost:3000}

echo "Sending test request to $HOST/api/ollama/generate"

curl -sS -X POST "$HOST/api/ollama/generate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $VERCEL_API_KEY" \
  -d '{"model":"exaone3.5","prompt":"Hello from local test"}'

echo
