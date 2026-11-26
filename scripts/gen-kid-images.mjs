// 꼬마 탐험가 그림 영상용 그림을 Gemini로 만들어 prototype/img/kid/<id>.webp 로 저장합니다.
// Usage: node scripts/gen-kid-images.mjs [id ...] [--force]
//   - .env 의 GEMINI_API_KEY 사용 (키는 출력하지 않음)
//   - 먼저 부엉이 '라우' 기준 그림(.cache/kid-art/rau-ref.png)을 만들고, 모든 장면에 참고 그림으로 넘겨 모습을 맞춤
//   - 원본 PNG는 .cache/kid-art/ 에 남고, webp 변환은 Microsoft Edge(헤드리스)로 함
//   - 끝나면 prototype/img/kid/list.js 에 있는 그림 목록을 다시 씀 (kid.js가 이 목록만 불러옴)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(root, ".cache/kid-art"), OUT = join(root, "prototype/img/kid");
mkdirSync(CACHE, { recursive: true }); mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync(join(root, ".env"), "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]));
const KEY = env[process.env.KID_IMG_KEYNAME || "GEMINI_API_KEY"];
if (!KEY) throw new Error(".env 에 GEMINI_API_KEY가 없어요.");
const MODEL = process.env.KID_IMG_MODEL || "gemini-3-pro-image";

const STYLE = `Children's picture-book illustration for 7-9 year olds, flat 2D sticker style, thick rounded dark-navy (#16223d) outlines, solid offset drop shadows, minimal shading, no gradients. Palette: sky blue #dff0ff background tones, sunflower yellow #ffc83d, mint #1f9e7f, pink #ff9bb3, tomato red #e5383b, brown #a0785a. Warm, friendly, simple shapes, lots of clean empty space, centered composition, 4:3 landscape. ABSOLUTELY NO text, letters, numbers, words, signs with writing, or logos anywhere in the image.`;
const RAU = `Recurring character "Rau": a round, chubby brown owl (#a0785a) with two small ear tufts, a cream-colored belly, big friendly eyes, a small orange beak, a mint-green scarf, and a small white round clock on its belly.`;

const SCENES = {
  "g1-1": "A cheerful small pizza shop with a red-and-white striped awning and a big pizza in the window, four happy customers (diverse kids and adults) lining up at the door. Rau the owl waves from the side.",
  "g1-2": "A whole pizza seen from above, cut into 8 slices that are slightly pulled apart; one slice glows with a thick golden outline and sparkles. Rau stands beside it pointing at the glowing slice with a wing.",
  "g1-3": "A smiling child holding one pizza slice proudly with both hands, a small golden crown floating above the child's head, the striped-awning pizza shop small in the background. Rau claps happily.",
  "g1-4": "The striped-awning pizza shop very busy with a long happy queue; in front, one pizza slice on a small podium has grown big, with a large red upward arrow beside it.",
  "g1-5": "The same striped-awning pizza shop on a gray rainy day, almost empty; in front, one small pizza slice on a podium has shrunk, with a blue downward arrow beside it. Rau holds an umbrella and looks a little worried.",
  "g2-1": "A crowd of many people eagerly raising their hands toward one golden pizza slice on a stand; behind them a simple thick red line chart climbs upward into the sky. Rau watches excitedly.",
  "g2-2": "People walking away from a stand shaking their heads, some holding slices out as if to give them away; behind them a simple thick blue line chart falls downward. Rau looks surprised.",
  "g2-3": "A newspaper flying through the air like a bird (with only scribble lines, no readable text); above a small crowd float thought bubbles containing a scared face, a red heart, and a question mark. Rau reads the flying newspaper.",
  "g2-4": "Rau the owl shrugging with both wings out and a puzzled smile, big friendly question marks floating around, a gently foggy road disappearing into the distance.",
  "g3-1": "A parent and a child sitting together on a cozy sofa looking at a smartphone; the phone screen shows a simple list of rows with small red upward triangles and blue downward triangles only (no text). Rau peeks over the sofa.",
  "g3-2": "Two cute mascot characters standing side by side: a big friendly red upward-pointing triangle with a happy face, and a big friendly blue downward-pointing triangle with a calm face, next to a large smartphone. Rau stands between them.",
  "g3-3": "A large friendly cartoon smartphone; at the bottom of its screen are two big rounded buttons, one red and one blue, with no text. A child's finger is about to tap the red button. Rau watches over the shoulder.",
  "g3-4": "Ten shiny gold coins standing in a neat row next to a pink piggy bank; Rau holds one coin up happily with a wing.",
  "g3-5": "A whimsical round brass time machine with a big clock face, Rau and a child sitting inside smiling, swirling stars and blank calendar pages flying past through a colorful vortex.",
};

async function gen(prompt, ref) {
  const parts = [{ text: prompt }];
  if (ref) parts.push({ inlineData: { mimeType: "image/png", data: ref.toString("base64") } });
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3", imageSize: "1K" } } }),
    });
    const j = await r.json().catch(() => ({}));
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (img) return Buffer.from(img.data, "base64");
    console.warn(`  다시 시도 ${attempt}/3: ${j.error?.status || r.status} ${j.error?.message?.slice(0, 120) || j.candidates?.[0]?.finishReason || ""}`);
    await new Promise((res) => setTimeout(res, 3000 * attempt));
  }
  throw new Error("그림을 받지 못했어요.");
}

const args = process.argv.slice(2), force = args.includes("--force");
const want = args.filter((a) => !a.startsWith("--"));
const ids = want.length ? want : Object.keys(SCENES);

// 1) 라우 기준 그림
const refPath = join(CACHE, "rau-ref.png");
if (!existsSync(refPath) || want.includes("rau")) {
  console.log("라우 기준 그림 만드는 중…");
  writeFileSync(refPath, await gen(`${STYLE}\n${RAU}\nCharacter reference: Rau the owl standing alone, full body, front view, friendly smile, plain light sky-blue background.`));
}
const ref = readFileSync(refPath);

// 2) 장면 (3개씩 동시에)
const todo = ids.filter((id) => SCENES[id] && (force || !existsSync(join(CACHE, `${id}.png`))));
for (let i = 0; i < todo.length; i += 3) {
  await Promise.all(todo.slice(i, i + 3).map(async (id) => {
    console.log(`${id} 만드는 중…`);
    const png = await gen(`${STYLE}\n${RAU} The attached image shows exactly how Rau looks; keep Rau identical.\nScene: ${SCENES[id]}`, ref);
    writeFileSync(join(CACHE, `${id}.png`), png);
    console.log(`${id} 완료 (${(png.length / 1024).toFixed(0)}KB)`);
  }));
}

// 3) webp 변환 (Edge 헤드리스 캔버스, 1200x900)
const edge = [process.env["ProgramFiles(x86)"], process.env.ProgramFiles, "C:/Program Files (x86)", "C:/Program Files"].filter(Boolean)
  .map((p) => join(p, "Microsoft", "Edge", "Application", "msedge.exe")).find((p) => existsSync(p));
if (!edge) throw new Error("Microsoft Edge를 찾지 못했어요.");
const port = 9336;
const proc = spawn(edge, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "raum-kidimg-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 40 && !targets.length; i++) { try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === "page"); } catch {} await sleep(250); }
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let mid = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id) pend.get(m.id)?.(m); });
const send = (method, params = {}) => new Promise((r) => { const i = ++mid; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const done = [];
for (const f of readdirSync(CACHE).filter((f) => /^g\d-\d+\.png$/.test(f)).sort()) {
  const id = f.replace(".png", "");
  const b64 = readFileSync(join(CACHE, f)).toString("base64");
  const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = 1200; c.height = 900; const g = c.getContext("2d"); const s = Math.max(1200 / im.width, 900 / im.height), w = im.width * s, h = im.height * s; g.drawImage(im, (1200 - w) / 2, (900 - h) / 2, w, h); res(c.toDataURL("image/webp", 0.85).split(",")[1]); }; im.src = "data:image/png;base64,${b64}"; })` });
  const buf = Buffer.from(r.result.result.value, "base64");
  writeFileSync(join(OUT, `${id}.webp`), buf);
  done.push(id);
  console.log(`${id}.webp ${(buf.length / 1024).toFixed(0)}KB`);
}
ws.close(); proc.kill();

// 4) 그림 목록 (split-kid-grid.mjs로 넣은 그림도 남도록 기존 목록과 합침)
const listPath = join(OUT, "list.js");
const old = existsSync(listPath) ? JSON.parse(readFileSync(listPath, "utf8").match(/=\s*(\[[\s\S]*?\])/)[1]) : [];
const all = [...new Set([...old, ...done])].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
writeFileSync(listPath, `// Generated by scripts/gen-kid-images.mjs / split-kid-grid.mjs — do not edit by hand.\nwindow.RAUM_KID_IMGS = ${JSON.stringify(all)};\n`);
console.log(`목록: ${all.length}장`);
process.exit(0);
