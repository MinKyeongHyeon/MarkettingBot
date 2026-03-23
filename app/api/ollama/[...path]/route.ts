export const runtime = "edge";

async function forward(req: Request) {
  const incomingKey = req.headers.get("x-api-key");
  if (
    !process.env.VERCEL_API_KEY ||
    incomingKey !== process.env.VERCEL_API_KEY
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tunnel = process.env.OLLAMA_TUNNEL_URL || process.env.OLLAMA_BASE;
  const INTERNAL = process.env.OLLAMA_INTERNAL_TOKEN;
  if (!tunnel)
    return new Response("Ollama tunnel not configured", { status: 500 });

  const url = new URL(req.url);
  const prefix = "/api/ollama";
  const forwardPath = url.pathname.startsWith(prefix)
    ? url.pathname.slice(prefix.length)
    : "/";

  const target = new URL(tunnel);
  target.pathname =
    (target.pathname.replace(/\/$/, "") || "") + (forwardPath || "/");

  // Build headers: keep content-type/accept, pass user's headers except host and cookie
  const headers = new Headers();
  const keep = ["content-type", "accept", "user-agent"];
  for (const [k, v] of req.headers.entries()) {
    if (k === "host" || k === "cookie" || k === "x-api-key") continue;
    if (keep.includes(k) || k.startsWith("x-")) headers.set(k, v);
  }
  if (INTERNAL) headers.set("authorization", `Bearer ${INTERNAL}`);

  const upstream = await fetch(target.toString() + url.search, {
    method: req.method,
    headers,
    body: req.body,
  });

  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete("content-encoding");
  respHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
export const OPTIONS = forward;
