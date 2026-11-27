// Zero-dependency static server for the prototype.
// Usage: node scripts/serve.mjs [port]   (default 5179, or PORT env)
// Binds to 127.0.0.1 only. If the port is taken, it never touches the other
// process: it reuses an already-running Raumstock server, otherwise exits.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { connect } from "node:net";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "prototype");
const port = Number(process.argv[2] || process.env.PORT || 5179);
const host = "127.0.0.1";
const url = `http://localhost:${port}`;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
};

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

// True if anything accepts connections on the port (IPv4 or IPv6 loopback).
// Checked before listening because on Windows binding 127.0.0.1 can succeed
// even while another process holds the wildcard address on the same port.
function portInUse() {
  const probe = (h) =>
    new Promise((resolve) => {
      const s = connect({ host: h, port });
      s.setTimeout(500);
      s.once("connect", () => (s.destroy(), resolve(true)));
      s.once("timeout", () => (s.destroy(), resolve(false)));
      s.once("error", () => resolve(false));
    });
  return Promise.all([probe("127.0.0.1"), probe("::1")]).then((r) => r.some(Boolean));
}

async function isRaumstock() {
  try {
    const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(1500) });
    return (await res.text()).includes("라움스톡");
  } catch {
    return false;
  }
}

async function handleTaken() {
  if (await isRaumstock()) {
    console.log(`Raumstock prototype already running: ${url}`);
  } else {
    console.error(`Port ${port} is used by another service. Left it alone. Try: node scripts/serve.mjs <other-port>`);
    process.exitCode = 1;
  }
}

if (await portInUse()) {
  await handleTaken();
} else {
  server.once("error", (err) => (err.code === "EADDRINUSE" ? handleTaken() : Promise.reject(err)));
  server.listen(port, host, () => console.log(`Raumstock prototype: ${url}`));
}
