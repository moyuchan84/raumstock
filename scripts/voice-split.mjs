// 여러 문장을 한 번에 녹음한 소리를 나눕니다.
// 쉼의 길이만으로는 문장 사이와 문장 안을 구별할 수 없어요. 그래서 여기서는 쉼마다 잘게 자르기만 하고,
// 어느 조각들이 어느 문장인지는 voice-check.mjs가 받아쓴 글로 정해요.
const FRAME = 0.02; // 초
const MIN_GAP = 0.35; // 여기보다 긴 쉼에서 자름(초)
const PAD = 0.15; // 잘라 낸 앞뒤에 남기는 여유(초). MIN_GAP의 절반보다 작아야 옆 조각과 겹치지 않아요

// samples: Int16Array, rate: Hz → 소리 조각마다 [시작 칸, 끝 칸] (여유 없음)
export function fragments(samples, rate) {
  const size = Math.round(rate * FRAME);
  const loud = [];
  for (let i = 0; i < samples.length; i += size) {
    let sum = 0;
    const end = Math.min(samples.length, i + size);
    for (let k = i; k < end; k++) sum += samples[k] * samples[k];
    loud.push(Math.sqrt(sum / (end - i)));
  }
  const level = [...loud].sort((a, b) => a - b)[Math.floor(loud.length * 0.95)] || 0;
  const threshold = Math.max(60, level * 0.03);
  const out = [];
  let from = -1, to = -1; // 지금 조각의 첫 칸과 마지막으로 소리가 난 칸 다음
  const close = () => out.push([from * size, Math.min(samples.length, to * size)]);
  loud.forEach((v, i) => {
    if (v <= threshold) return;
    if (from < 0) from = i;
    else if ((i - to) * FRAME >= MIN_GAP - 1e-9) { close(); from = i; }
    to = i + 1;
  });
  if (from >= 0) close();
  return out;
}

// 조각 범위에 앞뒤 여유를 붙임
export function padded([a, b], samples, rate) {
  const pad = Math.round(PAD * rate);
  return samples.subarray(Math.max(0, a - pad), Math.min(samples.length, b + pad));
}

// 순서를 지키며 문장을 묶음으로 나눔
export function batches(items, maxLines, maxChars) {
  const out = [];
  let cur = [], chars = 0;
  for (const item of items) {
    if (cur.length && (cur.length >= maxLines || chars + item[1].length > maxChars)) { out.push(cur); cur = []; chars = 0; }
    cur.push(item);
    chars += item[1].length;
  }
  if (cur.length) out.push(cur);
  return out;
}
