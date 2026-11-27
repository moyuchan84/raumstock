// 꼬마 탐험가와 스토리 모드(🔊 버튼)가 읽는 글을 Gemini TTS로 미리 녹음해 prototype/voice/<열쇠>.mp3 로 저장합니다.
// Usage: node scripts/gen-kid-voice.mjs [--dry] [--force] [--batches=N]
//   - 하루 호출 한도가 작아서 여러 문장을 한 번에 녹음한 뒤 나눠요 (voice-split.mjs)
//     쉼마다 잘게 자른 조각을 다른 Gemini 모델에 받아쓰게 하고, 이어 붙인 글이 원문과 맞는 것만 저장해요 (voice-check.mjs)
//   - 받은 원본은 .cache/voice-batches 에 남아요. 대조를 못 끝낸 원본(.wav)은 다음 실행 때 녹음 호출 없이 다시 확인해요.
//   - 대조에 걸린 문장은 다음 실행 때 더 작은 묶음으로 다시 녹음해요 (원본은 *.rejected.wav).
//   - .env 의 GEMINI_API_KEY 사용 (키는 출력하지 않음)
//   - 읽을 글은 kid.js · lab-*.js 를 그대로 실행해 모아요. 대사를 고치면 다시 돌리면 바뀐 것만 새로 만들어요.
//   - mp3 변환에는 lamejs가 필요: npm install --prefix .cache/voice-tools @breezystack/lamejs
//   - 목소리를 바꾸려면 KID_VOICE_NAME=Leda 처럼 주고 --force
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { fragments, padded, batches } from "./voice-split.mjs";
import { transcribe, assign, matches, tooLong } from "./voice-check.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "prototype"), OUT = join(SRC, "voice");
const MODEL = process.env.KID_VOICE_MODEL || "gemini-3.8-flash-tts";
const VOICE = process.env.KID_VOICE_NAME || "Sulafat";
const CHECK_MODEL = process.env.KID_VOICE_CHECK_MODEL || "gemini-3.5-flash-lite";
const STYLE = "warm and friendly, reading a picture book to a young child, speaking clearly";
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
// text에 적은 글은 모두 소리 내어 읽혀요. 말투 지시는 반드시 style에 따로 보내요.
async function record(texts) {
  let why = "", errors = 0, waits = 0;
  while (errors < 2 && waits < 4) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        model: MODEL,
        input: [{ type: "user_input", content: [{ type: "text", text: texts.join("\n\n<long pause>\n\n"), annotations: [{ type: "speech_metadata", style: STYLE }] }] }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice: VOICE }] },
      }),
      signal: AbortSignal.timeout(600000),
    }).catch((e) => ({ status: 0, json: async () => ({ error: { message: e.message } }) }));
    const j = await r.json().catch(() => ({}));
    const audio = j.steps?.filter((x) => x.type === "model_output").flatMap((x) => x.content || []).filter((c) => c.type === "audio").at(-1)?.data;
    if (audio && (!j.status || j.status === "completed")) return Buffer.from(audio, "base64");
    why = `${r.status} ${j.error?.message || j.status || ""}`.slice(0, 900);
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

// 한 묶음의 원본을 잘게 자르고, 받아쓴 글이 원문과 맞게 이어지는 부분만 저장
async function cut(group, wav) {
  const { rate, pcm } = readWav(wav), samples = toSamples(pcm);
  const frags = fragments(samples, rate);
  if (!frags.length) throw new Error("소리가 없어요");
  const listen = (mp3) => transcribe(mp3, { key: KEY, model: CHECK_MODEL, cache: join(RAW, "heard.json") });
  const heard = [];
  for (const f of frags) heard.push(await listen(toMp3(padded(f, samples, rate), rate).mp3)); // 하나씩
  const spans = assign(group.map(([, t]) => t), heard);
  const saved = [], wrong = [];
  for (const [i, [key, text]] of group.entries()) {
    if (!spans[i]) { wrong.push(text); continue; }
    const [from, to] = spans[i];
    const { mp3, ms } = toMp3(padded([frags[from][0], frags[to][1]], samples, rate), rate);
    // 저장하기 전에 완성한 파일을 통째로 한 번 더 확인
    if (tooLong(text, ms) || !matches(text, await listen(mp3))) { wrong.push(text); continue; }
    writeFileSync(join(OUT, `${key}.mp3`), mp3);
    durations[key] = ms;
    saved.push(key);
  }
  writeList();
  return { saved, wrong, heard };
}

const RAW = join(root, ".cache/voice-batches", `${MODEL}-${VOICE}`);
mkdirSync(RAW, { recursive: true });
let made = 0, bad = 0;
const failed = [];
const pending = new Map(todo);
const keysOf = (id) => JSON.parse(readFileSync(join(RAW, `${id}.json`), "utf8"));

// 원본 하나를 확인해서 저장. 계속해도 되면 true
async function check(id, group, label) {
  const wav = join(RAW, `${id}.wav`);
  let result;
  try { result = await cut(group, readFileSync(wav)); }
  catch (e) {
    if (e.message === "소리가 없어요") result = { saved: [], wrong: group.map(([, text]) => text), heard: [] };
    else { failed.push(`${label} 확인 못 함 (원본은 남겨 둠): ${e.message}`); console.log(failed.at(-1)); return false; }
  }
  const { saved, wrong, heard } = result;
  made += saved.filter((k) => pending.has(k)).length;
  saved.forEach((k) => pending.delete(k));
  renameSync(wav, join(RAW, `${id}.${wrong.length ? "rejected" : "done"}.wav`));
  console.log(`${label}: ${saved.length}개 저장${wrong.length ? `, ${wrong.length}개는 대조에 걸림` : ""}`);
  if (wrong.length) console.log(`  걸린 원문: ${wrong.slice(0, 3).join(" / ")}\n  받아쓴 글: ${heard.join(" | ").slice(0, 600)}`);
  if (wrong.length) failed.push(`${label}: ${wrong.length}개 대조 실패`);
  bad = saved.length * 2 < group.length ? bad + 1 : 0; // 절반도 못 건지면 실패로 셈
  return true;
}

let go = true;
// 1) 아직 확인하지 못한 원본부터 (녹음 호출 없음)
for (const f of readdirSync(RAW).filter((f) => /^[0-9a-f]+\.wav$/.test(f))) {
  const id = f.slice(0, -4), keys = keysOf(id);
  if (!go || force || !keys.some((k) => pending.has(k))) continue;
  go = await check(id, keys.filter((k) => jobs.has(k)).map((k) => [k, jobs.get(k)]), "저장해 둔 원본");
}
// 2) 남은 것을 묶어서 녹음. 이미 한 번 걸린 문장은 절반 크기 묶음으로
const rejected = new Set(readdirSync(RAW).filter((f) => f.endsWith(".rejected.wav")).flatMap((f) => keysOf(f.slice(0, -".rejected.wav".length))));
const maxLines = Number(process.env.KID_VOICE_LINES || 20), maxChars = Number(process.env.KID_VOICE_CHARS || 800);
const rest = [...pending];
const groups = [
  ...batches(rest.filter(([k]) => !rejected.has(k)), maxLines, maxChars),
  ...batches(rest.filter(([k]) => rejected.has(k)), Math.ceil(maxLines / 2), Math.ceil(maxChars / 2)),
];
const limit = Number(args.find((a) => a.startsWith("--batches="))?.split("=")[1] ?? Infinity);
console.log(`남은 묶음 ${groups.length}개${limit < groups.length ? ` (이번에는 ${limit}개만)` : ""}`);
bad = 0;
for (const [n, group] of groups.slice(0, limit).entries()) {
  if (!go) break;
  const keys = group.map(([k]) => k), id = createHash("sha1").update(keys.join()).digest("hex").slice(0, 12);
  let wav;
  try { wav = await record(group.map(([, t]) => t)); }
  catch (e) {
    if (e instanceof Quota) console.error(`호출 한도에 닿았어요. 나중에 다시 돌리면 이어서 만들어요.\n${e.message}`);
    else failed.push(`묶음 ${n + 1} 녹음 실패: ${e.message}`);
    break;
  }
  writeFileSync(join(RAW, `${id}.json`), JSON.stringify(keys));
  writeFileSync(join(RAW, `${id}.wav`), wav);
  go = await check(id, group, `묶음 ${n + 1}`);
  if (bad >= 3) { console.error("세 번 연속 실패해서 멈춰요. 호출 한도를 아끼려고요."); break; }
}

// 이제 안 쓰는 파일 지우기 (모두 만들어졌을 때만)
const total = writeList();
if (total === jobs.size) for (const f of readdirSync(OUT).filter((f) => f.endsWith(".mp3") && !jobs.has(f.slice(0, -4)))) unlinkSync(join(OUT, f));
console.log(`완료 ${total}/${jobs.size}개, 이번에 ${made}개 생성, 실패 ${failed.length}개`);
if (failed.length) console.log(failed.join("\n"));
process.exitCode = total === jobs.size ? 0 : 1; // Windows에서 바로 종료하면 Node가 오류를 내서 자연히 끝나게 둠
