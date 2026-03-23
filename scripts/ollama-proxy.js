#!/usr/bin/env node
const http = require("http");

const PORT = process.env.PORT || 3001;
const INTERNAL_TOKEN = process.env.OLLAMA_INTERNAL_TOKEN;

if (!INTERNAL_TOKEN) {
  console.error("Set OLLAMA_INTERNAL_TOKEN env var");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${INTERNAL_TOKEN}`) {
    res.writeHead(401);
    res.end("Unauthorized");
    return;
  }

  const options = {
    hostname: "127.0.0.1",
    port: 11434,
    path: req.url,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: "127.0.0.1:11434" }),
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () =>
  console.log(`Ollama local proxy listening on ${PORT}`),
);
