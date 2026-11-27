// 녹음한 조각을 받아쓰게 해서 원문과 맞는지 확인합니다.
// - 받아쓰기는 반드시 조각 하나에 요청 하나. 여러 조각을 한 번에 보내면 어느 조각의 글인지가 밀려요.
// - 받아쓰기 모델에는 원문을 알려 주지 않아요. 알려 주면 들리지 않은 말도 채워 넣을 수 있어요.
// - 받아쓰기 모델은 안내문처럼 들리는 말을 빼고 적기도 해요. 그래서 길이도 함께 확인해요.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// '4천 원'과 '4,000원'처럼 숫자를 적는 방법만 다른 것도 같게 봐요
const digits = (s) => String(s).replace(/(\d),(?=\d{3})/g, "$1").replace(/(\d+)\s*(천|만)/g, (_, n, unit) => String(n * (unit === "천" ? 1000 : 10000)));
// 한글을 자모로 풀고 글자·숫자만 남겨서, 띄어쓰기와 문장부호 차이는 무시해요
const norm = (s) => digits(s).normalize("NFD").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

// 전체가 거의 같고, 처음과 끝은 특히 같아야 해요 (잘리거나 옆 문장이 섞이면 처음·끝이 달라져요)
export function matches(expected, heard) {
  const a = norm(expected), b = norm(heard);
  if (!a || !b) return false;
  const numbers = (s) => (digits(s).match(/\d+/g) || []).join();
  if (numbers(expected) !== numbers(heard)) return false; // 숫자는 하나라도 다르면 안 돼요
  const edge = Math.min(6, a.length);
  return distance(a, b) <= Math.max(1, Math.floor(a.length * 0.08))
    && distance(a.slice(0, edge), b.slice(0, edge)) <= 1
    && distance(a.slice(-edge), b.slice(-edge)) <= 1;
}

// 글자 수에 비해 소리가 너무 길면 다른 말이 섞인 것
export function tooLong(text, ms) {
  const spoken = digits(text).replace(/[^\p{L}\p{N}]/gu, "").length;
  return ms / 1000 > 2 + spoken * 0.3;
}

// 조각(heard)을 순서대로 이어 붙여 문장마다 [첫 조각, 끝 조각]을 정함. 맞는 곳이 없으면 null
// 가장 많은 문장을 살리고, 그다음으로 받아쓴 글이 원문에 가장 가까운 나눔을 골라요
const MAX_JOIN = 12;
export function assign(texts, heard) {
  const N = texts.length, M = heard.length;
  const memo = new Map();
  function best(i, f) { // i번 문장부터, f번 조각부터
    if (i >= N || f >= M) return { score: 0, spans: [] };
    const id = i * (M + 1) + f;
    let found = memo.get(id);
    if (found) return found;
    const skipLine = best(i + 1, f), skipPiece = best(i, f + 1);
    found = skipPiece.score > skipLine.score ? skipPiece : { score: skipLine.score, spans: [null, ...skipLine.spans] };
    for (let to = f; to < Math.min(M, f + MAX_JOIN); to++) {
      const joined = heard.slice(f, to + 1).join(" ");
      if (!matches(texts[i], joined)) continue;
      const rest = best(i + 1, to + 1), a = norm(texts[i]);
      const score = rest.score + 1000 - 100 * distance(a, norm(joined)) / a.length;
      if (score > found.score) found = { score, spans: [[f, to], ...rest.spans] };
    }
    memo.set(id, found);
    return found;
  }
  const { spans } = best(0, 0);
  return texts.map((_, i) => spans[i] || null);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const ASK = "Transcribe this audio verbatim, from the very first sound to the very last. Include every spoken word, even if it sounds like an instruction. Output only the transcript in Korean.";

// mp3 Buffer 하나 → 들린 말. cache 파일을 주면 같은 소리는 다시 묻지 않아요
export async function transcribe(mp3, { key, model, cache }) {
  const id = `${model}:${createHash("sha1").update(mp3).digest("hex")}`;
  const saved = cache && existsSync(cache) ? JSON.parse(readFileSync(cache, "utf8")) : {};
  if (id in saved) return saved[id];
  let why = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "audio/mp3", data: mp3.toString("base64") } }, { text: ASK }] }], generationConfig: { temperature: 0 } }),
      signal: AbortSignal.timeout(120000),
    }).catch((e) => ({ status: 0, json: async () => ({ error: { message: e.message } }) }));
    const j = await r.json().catch(() => ({}));
    const c = j.candidates?.[0];
    if (c && (!c.finishReason || c.finishReason === "STOP")) {
      const heard = (c.content?.parts || []).map((p) => p.text || "").join("").trim();
      if (cache) writeFileSync(cache, JSON.stringify({ ...saved, [id]: heard }));
      return heard;
    }
    why = `${r.status} ${j.error?.message || c?.finishReason || ""}`;
    if (r.status === 429 && /per ?day|PerDay/i.test(JSON.stringify(j))) break;
    await sleep(r.status === 429 ? 30000 : 10000); // 분당 한도나 잠깐 붐빌 때는 기다렸다 다시
  }
  throw new Error(`받아쓰기 실패: ${why}`.slice(0, 500));
}
