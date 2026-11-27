// 꼬마 탐험가와 스토리 모드(🔊 버튼)가 읽는 글을 Gemini TTS로 미리 녹음해 prototype/voice/<열쇠>.mp3 로 저장합니다.
// Usage: node scripts/gen-kid-voice.mjs [--dry] [--force] [--batches=N]
//   - 하루 호출 한도가 작아서 여러 문장을 한 번에 녹음한 뒤 긴 쉼에서 잘라요 (voice-split.mjs)
//   - 받은 원본은 .cache/voice-batches 에 남아요. 다시 돌리면 원본부터 잘라 보므로 호출을 아껴요.
//   - 자르기 검사에 걸린 원본은 *.rejected.wav 로 바꾸고, 다음 실행 때 더 작은 묶음으로 다시 녹음해요.
//   - .env 의 GEMINI_API_KEY 사용 (키는 출력하지 않음)
//   - 읽을 글은 kid.js · lab-*.js 를 그대로 실행해 모아요. 대사를 고치면 다시 돌리면 바뀐 것만 새로 만들어요.
//   - mp3 변환에는 lamejs가 필요: npm install --prefix .cache/voice-tools @breezystack/lamejs
//   - 목소리를 바꾸려면 KID_VOICE_NAME=Leda 처럼 주고 --force
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { splitBySilence, batches } from "./voice-split.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "prototype"), OUT = join(SRC, "voice");
const MODEL = process.env.KID_VOICE_MODEL || "gemini-3.8-flash-tts";
const VOICE = process.env.KID_VOICE_NAME || "Sulafat";
const STYLE = "7~9세 아이에게 그림책을 읽어 주는 다정한 선생님처럼, 밝고 자연스럽게 또박또박 말해 주세요";
const args = process.argv.slice(2), dry = args.includes("--dry"), force = args.includes("--force");

// ---------- 1) 앱 코드를 실행해 읽을 글 모으기 ----------
function loadApp() {
  const el = () => new Proxy({ style: {}, dataset: {}, classList: { add() {}, remove() {} } }, { get: (t, k) => (k in t ? t[k] : () => null), set: (t, k, v) => ((t[k] = v), true) });
  const store = new Map();
  const ctx = {
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    document: { querySelector: el, querySelectorAll: () => [], createElement: el, addEventListener() {}, body: el() },
    matchMedia: () => ({ matches: true }), setTimeout, clearTimeout, scrollTo() {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ["speak.js", "daily.js", "art.js", "fin.js", "stages-real.js", "long-real.js", "lab-easy.js", "lab-full.js", "kid-lab.js", "rival.js", "kid-vs.js", "kid.js"]) {
    vm.runInContext(readFileSync(join(SRC, f), "utf8"), ctx, { filename: f });
  }
  return ctx;
}

// 체험 화면의 글은 고른 값에 따라 달라져요. 화면이 실제로 읽어 보는 값만 골라 가며 모든 조합을 만들어요.
const range = (n) => Array.from({ length: n }, (_, i) => i);
function domain(key) {
  if (/^b_/.test(key)) return [0, 1];
  if (key === "m") return range(12);
  if (/^[abc]$/.test(key)) return range(7);
  if (/^[tn]s$/.test(key)) return range(6);
  if (/^w[07]$/.test(key)) return range(11);
  if (key === "open" || key === "three") return [0, 1];
  if (key === "shop") return range(7);
  if (/^quad-/.test(key)) return range(2);
  if (/^gap-/.test(key) || /^(first|next|down|long|rule|limit|plan|bear|[tn]c)$/.test(key)) return range(3);
  throw new Error(`모르는 고르기 값: ${key} (domain에 추가해 주세요)`);
}
function labLines(pages) {
  const out = new Set();
  let skipped = 0;
  for (const labs of Object.values(pages)) for (const list of Object.values(labs)) for (const make of list) {
    const queue = [{}], seen = new Set(["{}"]);
    while (queue.length) {
      const fixed = queue.shift(), read = new Set();
      const picks = new Proxy({ ...fixed }, { get: (t, k) => (read.add(k), t[k]) });
      try {
        const g = make(picks), a = g.ask, p = a ? picks[a.key] : undefined;
        if (!a) out.add(g.text);
        else if (p === undefined) out.add(`${g.text} ${a.q}`);
        else if (p < a.opts.length) out.add(a.reply(p));
        if (g.tapSay) out.add(g.tapSay);
      } catch { skipped++; } // 화면에서 나올 수 없는 값의 조합
      for (const k of read) {
        if (k in fixed) continue;
        for (const v of domain(k)) {
          const nextPicks = { ...fixed, [k]: v }, id = JSON.stringify(Object.entries(nextPicks).sort());
          if (!seen.has(id)) { seen.add(id); queue.push(nextPicks); }
        }
      }
    }
  }
  if (skipped) console.log(`건너뛴 조합 ${skipped}개`);
  return [...out];
}

// 스토리 모드: 숫자가 사람마다 달라지는 대사(함수)는 녹음하지 않아요
function storyLines() {
  const ctx = { setTimeout };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(SRC, "story.js"), "utf8"), ctx, { filename: "story.js" });
  const ST = ctx.RAUM_STORY, out = new Set();
  let dynamic = 0;
  for (const s of ST.chapters.flatMap((c) => c.steps)) for (const kid of [true, false]) {
    let skip = false;
    const text = ST.speech(s, kid, (v) => (typeof v === "function" ? ((skip = true), "") : v));
    if (skip) dynamic++;
    else if (text) out.add(text);
  }
  console.log(`스토리 모드 ${out.size}개 (숫자가 달라져 녹음하지 않는 대사 ${dynamic}건)`);
  return [...out];
}

const app = loadApp(), SP = app.RAUM_SPEAK;
const { lines, labPages } = app.RAUM_KID_VOICE_LINES();
const jobs = new Map(); // 열쇠 → 읽을 글
for (const raw of [...lines, ...labLines(labPages), ...storyLines()]) {
  const text = SP.plain(raw);
  if (!text) continue;
  if (/undefined|NaN|\[object/.test(text)) throw new Error(`잘못 만들어진 글: ${text}`);
  const key = SP.keyOf(text);
  if (jobs.has(key) && jobs.get(key) !== text) throw new Error("열쇠가 겹쳤어요");
  jobs.set(key, text);
}
const chars = [...jobs.values()].reduce((a, t) => a + t.length, 0);
const todo = [...jobs].filter(([k]) => force || !existsSync(join(OUT, `${k}.mp3`)));
console.log(`읽을 글 ${jobs.size}개 (${chars.toLocaleString()}자), 새로 만들 것 ${todo.length}개`);
if (dry) process.exit(0);

// ---------- 2) 녹음 → mp3 ----------
mkdirSync(OUT, { recursive: true });
const env = readFileSync(join(root, ".env"), "utf8");
const KEY = env.match(new RegExp(`^${process.env.KID_VOICE_KEYNAME || "GEMINI_API_KEY"}=(.*)$`, "m"))?.[1].trim().replace(/^"|"$/g, "");
if (!KEY) throw new Error(".env 에 GEMINI_API_KEY가 없어요.");
const lamePath = join(root, ".cache/voice-tools/node_modules/@breezystack/lamejs");
const lamePkg = JSON.parse(readFileSync(join(lamePath, "package.json"), "utf8"));
const lameEntry = lamePkg.exports?.["."]?.import?.default || lamePkg.exports?.["."]?.import || lamePkg.module || lamePkg.main;
const { Mp3Encoder } = await import(pathToFileURL(join(lamePath, lameEntry)));

// WAV(16비트 모노)에서 소리 부분과 속도를 꺼냄
function readWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") return { rate: 24000, pcm: buf };
  let at = 12, rate = 24000;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4), size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") {
      if (buf.readUInt16LE(at + 10) !== 1 || buf.readUInt16LE(at + 22) !== 16) throw new Error("16비트 모노가 아니에요");
      rate = buf.readUInt32LE(at + 12);
    }
    if (id === "data") return { rate, pcm: buf.subarray(at + 8, at + 8 + size) };
    at += 8 + size + (size % 2);
  }
  throw new Error("WAV에 소리가 없어요");
}
const toSamples = (pcm) => new Int16Array(Uint8Array.from(pcm).buffer, 0, pcm.length >> 1);
function toMp3(samples, rate) {
  const enc = new Mp3Encoder(1, rate, 48), chunks = [];
  for (let i = 0; i < samples.length; i += 1152) chunks.push(Buffer.from(enc.encodeBuffer(samples.subarray(i, i + 1152))));
  chunks.push(Buffer.from(enc.flush()));
  return { mp3: Buffer.concat(chunks), ms: Math.round(samples.length / rate * 1000) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Quota extends Error {}
function prompt(texts) {
  if (texts.length === 1) return `${STYLE}: ${texts[0]}`;
  return `${STYLE}.
아래는 서로 상관없는 ${texts.length}개의 대사예요. 빈 줄로 나뉜 대사를 순서대로 하나도 빠짐없이, 적힌 그대로 읽어 주세요.
대사 하나가 끝날 때마다 반드시 3초 동안 아무 소리 없이 쉬세요. 한 대사 안에서는 1초 넘게 쉬지 마세요.
이 안내문과 번호, '다음' 같은 말은 읽지 말고 대사만 읽으세요.

### 대사
${texts.join("\n\n")}`;
}
async function record(texts) {
  let why = "", errors = 0, waits = 0;
  while (errors < 2 && waits < 4) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt(texts) }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } }),
      signal: AbortSignal.timeout(600000),
    }).catch((e) => ({ status: 0, json: async () => ({ error: { message: e.message } }) }));
    const j = await r.json().catch(() => ({}));
    const c = j.candidates?.[0], audio = c?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (audio && (!c.finishReason || c.finishReason === "STOP")) return Buffer.from(audio.data, "base64");
    why = `${r.status} ${j.error?.message || c?.finishReason || ""}`.slice(0, 900);
    if (r.status === 429) {
      if (/per ?day|PerDay/i.test(JSON.stringify(j))) throw new Quota(why);
      waits++; // 분당 한도: 잠깐 기다렸다 다시
      await sleep(65000);
    } else { errors++; await sleep(5000); }
  }
  if (waits >= 4) throw new Quota(why);
  throw new Error(why);
}

// 길이 목록 (앱이 이 목록에 있는 것만 음성 파일로 틀어요)
const listPath = join(OUT, "list.js");
const durations = existsSync(listPath) ? JSON.parse(readFileSync(listPath, "utf8").match(/=\s*(\{[\s\S]*\})/)[1]) : {};
function writeList() {
  const have = Object.fromEntries([...jobs.keys()].filter((k) => durations[k] && existsSync(join(OUT, `${k}.mp3`))).sort().map((k) => [k, durations[k]]));
  writeFileSync(listPath, `// Generated by scripts/gen-kid-voice.mjs — do not edit by hand. 목소리: ${MODEL} / ${VOICE}\nwindow.RAUM_VOICE = ${JSON.stringify(have)};\n`);
  return Object.keys(have).length;
}

// 한 묶음의 원본을 잘라 저장. 검사에 걸리면 아무것도 저장하지 않고 오류
function cut(group, wav) {
  const { rate, pcm } = readWav(wav), samples = toSamples(pcm);
  const parts = splitBySilence(samples, rate, group.map(([, t]) => t));
  group.forEach(([key], i) => {
    const { mp3, ms } = toMp3(samples.subarray(...parts[i]), rate);
    writeFileSync(join(OUT, `${key}.mp3`), mp3);
    durations[key] = ms;
  });
  writeList();
}

const RAW = join(root, ".cache/voice-batches", `${MODEL}-${VOICE}`);
mkdirSync(RAW, { recursive: true });
let made = 0;
const failed = [];
let pending = new Map(todo);
// 1) 저장해 둔 원본으로 먼저 잘라 보기 (호출하지 않음)
for (const f of readdirSync(RAW).filter((f) => f.endsWith(".json"))) {
  const keys = JSON.parse(readFileSync(join(RAW, f), "utf8")), wav = join(RAW, f.replace(".json", ".wav"));
  if (force || !existsSync(wav) || !keys.every((k) => pending.has(k))) continue;
  try {
    cut(keys.map((k) => [k, pending.get(k)]), readFileSync(wav));
    keys.forEach((k) => pending.delete(k));
    made += keys.length;
  } catch (e) { console.log(`저장된 원본 버림: ${e.message}`); renameSync(wav, wav.replace(".wav", ".rejected.wav")); }
}
// 2) 남은 것을 묶어서 녹음. 이미 한 번 버려진 문장은 절반 크기 묶음으로
const rejected = new Set(readdirSync(RAW).filter((f) => f.endsWith(".rejected.wav")).flatMap((f) => {
  const list = join(RAW, f.replace(".rejected.wav", ".json"));
  return existsSync(list) ? JSON.parse(readFileSync(list, "utf8")) : [];
}));
const maxLines = Number(process.env.KID_VOICE_LINES || 20), maxChars = Number(process.env.KID_VOICE_CHARS || 800);
const rest = [...pending];
const groups = [
  ...batches(rest.filter(([k]) => !rejected.has(k)), maxLines, maxChars),
  ...batches(rest.filter(([k]) => rejected.has(k)), Math.ceil(maxLines / 2), Math.ceil(maxChars / 2)),
];
const limit = Number(args.find((a) => a.startsWith("--batches="))?.split("=")[1] || Infinity);
console.log(`남은 묶음 ${groups.length}개${limit < groups.length ? ` (이번에는 ${limit}개만)` : ""}`);
let bad = 0;
for (const [n, group] of groups.slice(0, limit).entries()) {
  const keys = group.map(([k]) => k), id = createHash("sha1").update(keys.join()).digest("hex").slice(0, 12);
  try {
    const wav = await record(group.map(([, t]) => t));
    writeFileSync(join(RAW, `${id}.json`), JSON.stringify(keys));
    writeFileSync(join(RAW, `${id}.wav`), wav);
    try {
      cut(group, wav);
      made += group.length;
      bad = 0;
      console.log(`묶음 ${n + 1}: ${group.length}개 저장`);
    } catch (e) {
      renameSync(join(RAW, `${id}.wav`), join(RAW, `${id}.rejected.wav`));
      failed.push(`묶음 ${n + 1} (${group.length}개) 자르기 실패: ${e.message}`);
      console.log(failed.at(-1));
      if (++bad >= 3) { console.error("세 번 연속 실패해서 멈춰요. 호출 한도를 아끼려고요."); break; }
    }
  } catch (e) {
    if (e instanceof Quota) console.error(`호출 한도에 닿았어요. 나중에 다시 돌리면 이어서 만들어요.\n${e.message}`);
    else failed.push(`묶음 ${n + 1} 녹음 실패: ${e.message}`);
    break;
  }
}

// 이제 안 쓰는 파일 지우기 (모두 만들어졌을 때만)
const total = writeList();
if (total === jobs.size) for (const f of readdirSync(OUT).filter((f) => f.endsWith(".mp3") && !jobs.has(f.slice(0, -4)))) unlinkSync(join(OUT, f));
console.log(`완료 ${total}/${jobs.size}개, 이번에 ${made}개 생성, 실패 ${failed.length}개`);
if (failed.length) console.log(failed.join("\n"));
process.exitCode = total === jobs.size ? 0 : 1; // Windows에서 바로 종료하면 Node가 오류를 내서 자연히 끝나게 둠
