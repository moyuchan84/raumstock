// 여러 문장을 한 번에 녹음한 소리를 '긴 쉼'에서 잘라 문장별로 나눕니다.
// 조금이라도 의심스러우면 오류를 던져요. 잘못 자른 대사를 저장하느니 묶음을 버리는 편이 나아요.
const FRAME = 0.02; // 초
const MIN_GAP = 1.2; // 문장 사이로 인정하는 가장 짧은 쉼(초)
const CLEAR = 1.35; // 고른 쉼은 문장 안의 가장 긴 쉼보다 이 배수 이상 길어야 해요
const PAD = 0.15; // 잘라 낸 앞뒤에 남기는 여유(초)

// samples: Int16Array, rate: Hz, texts: 읽은 문장(순서대로) → 문장마다 [시작 칸, 끝 칸]
export function splitBySilence(samples, rate, texts) {
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
  const voiced = loud.map((v) => v > threshold);
  const first = voiced.indexOf(true), last = voiced.lastIndexOf(true);
  if (first < 0) throw new Error("소리가 없어요");

  const gaps = []; // 말 사이의 조용한 구간
  for (let i = first, from = -1; i <= last; i++) {
    if (!voiced[i]) { if (from < 0) from = i; }
    else if (from >= 0) { gaps.push({ from, to: i, sec: (i - from) * FRAME }); from = -1; }
  }
  const need = texts.length - 1;
  const bySize = [...gaps].sort((a, b) => b.sec - a.sec);
  if (bySize.length < need) throw new Error(`쉼이 모자라요 (${bySize.length}/${need})`);
  const chosen = bySize.slice(0, need);
  if (need) {
    const shortest = chosen.at(-1).sec, rest = bySize[need]?.sec || 0;
    if (shortest < MIN_GAP) throw new Error(`문장 사이 쉼이 너무 짧아요 (${shortest.toFixed(2)}초)`);
    if (shortest < rest * CLEAR) throw new Error(`문장 사이와 문장 안의 쉼을 구별하기 어려워요 (${shortest.toFixed(2)}초 / ${rest.toFixed(2)}초)`);
  }

  chosen.sort((a, b) => a.from - b.from);
  const parts = [first, ...chosen.map((g) => g.to)].map((from, i) => [from, i < need ? chosen[i].from : last + 1]);

  // 길이 검사: 글자 수에 비해 너무 길거나 짧은 조각이 있으면 문장이 밀렸거나 빠진 것
  const secs = parts.map(([a, b]) => (b - a) * FRAME);
  const weight = texts.map((t) => t.replace(/[^\p{L}\p{N}]/gu, "").length + 4);
  if (texts.length > 2) {
    const per = secs.map((s, i) => s / weight[i]);
    const mid = [...per].sort((a, b) => a - b)[Math.floor(per.length / 2)];
    per.forEach((v, i) => {
      if (v < mid * 0.55 || v > mid * 1.9) throw new Error(`길이가 글과 맞지 않아요: ${i + 1}번째 "${texts[i].slice(0, 30)}" ${secs[i].toFixed(1)}초`);
    });
  }

  const pad = Math.round(PAD * rate);
  return parts.map(([a, b]) => [Math.max(0, a * size - pad), Math.min(samples.length, b * size + pad)]);
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
