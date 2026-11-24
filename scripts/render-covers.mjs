// 챕터 표지 3D 일러스트를 렌더링해 prototype/img/cover-<id>.webp로 저장합니다.
// Usage: node scripts/render-covers.mjs [coverId]   (Windows, Microsoft Edge 필요)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const edge = [process.env["ProgramFiles(x86)"], process.env.ProgramFiles, "C:/Program Files (x86)", "C:/Program Files"]
  .filter(Boolean)
  .map((p) => join(p, "Microsoft", "Edge", "Application", "msedge.exe"))
  .find((p) => existsSync(p));
if (!edge) throw new Error("Microsoft Edge를 찾지 못했어요.");
const port = 9334;
const prof = mkdtempSync(join(tmpdir(), "raum-studio-"));
const proc = spawn(edge, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--allow-file-access-from-files", "--use-angle=d3d11", "--enable-gpu", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 40 && !targets.length; i++) { try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === "page"); } catch {} await sleep(250); }
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.method === "Runtime.exceptionThrown") console.error("page error:", m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if (m.id) pend.get(m.id)?.(m); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
const only = process.argv[2];
await send("Page.navigate", { url: pathToFileURL(join(root, "scripts/studio.html")).href + (only ? `?only=${only}` : "") });
let covers = null;
for (let i = 0; i < 120 && !covers; i++) {
  await sleep(500);
  const r = await send("Runtime.evaluate", { expression: "window.__done ? window.__covers : null", returnByValue: true });
  covers = r.result?.result?.value;
}
if (!covers) throw new Error("렌더링 시간이 초과됐어요.");
mkdirSync(join(root, "prototype/img"), { recursive: true });
for (const [k, url] of Object.entries(covers)) {
  const buf = Buffer.from(url.split(",")[1], "base64");
  writeFileSync(join(root, `prototype/img/cover-${k}.webp`), buf);
  console.log(`cover-${k}.webp ${(buf.length / 1024).toFixed(0)}KB`);
}
ws.close();
proc.kill();
