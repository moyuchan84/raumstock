// 꼬마 탐험가 '겪어 보기': ① 실력과 값표 ② 싼 걸까 비싼 걸까 ③ 하나와 바구니 ④ 언제 팔까
// 원칙: 맞히기 점수·보상 없음. 고른 것은 맞고 틀림 없이 다음 화면에서 함께 살펴봄.
// 숫자는 daily.js · stages-real.js(실제 수정 종가)와 fin.js(SEC 10-K 연간 수치)에서 계산.
// 사례는 '규칙마다 결과가 갈리는 것'을 보여 주려고 일부러 고른 기간이라, 화면에도 그렇게 적음.
window.RAUM_KID_LAB = ({ $, c1, say, done, seen, show }) => {
  const D = window.RAUM_DAILY, F = window.RAUM_FIN, H = window.RAUM_HIST;
  const at = (d) => D.dates.findIndex((x) => x >= d);
  const START = at("2020-01-02"), END = D.dates.length - 1;
  const NAMES = {
    ZM: ["💻", "화상 수업 가게", "줌"], AMZN: ["📦", "택배 가게", "아마존"], AAPL: ["🍎", "스마트폰 가게", "애플"],
    NFLX: ["🎬", "집에서 영화 가게", "넷플릭스"], CCL: ["🚢", "배 여행 가게", "카니발"], AAL: ["✈️", "비행기 가게", "아메리칸항공"], XOM: ["🛢️", "석유 가게", "엑슨모빌"],
  };
  const STORES = Object.keys(NAMES);
  const label = (s) => `${NAMES[s][0]} ${NAMES[s][1]}`;
  const pct = (r) => `${r >= 1 ? "▲" : "▼"} ${Math.abs(Math.round((r - 1) * 100))}%`;
  const dir = (r) => (r >= 1 ? "up" : "down");
  const md = (d) => { const [y, m, day] = d.split("-").map(Number); return `${y}년 ${m}월 ${day}일`; };

  // ---------- 그림 조각 ----------
  const card = (inner) => `<div class="card">${inner}</div>`;
  const rows = (list) => `<div class="cmp">${list.map(([a, b, c = ""]) => `<div class="${c}"><span>${a}</span><b>${b}</b></div>`).join("")}</div>`;
  const table = (head, body) => `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const note = (t) => `<p class="note">${t}</p>`;
  // 선 그래프: lines = [{ ys, color }], mark = [시작 칸, 끝 칸] 노란 띠, base = 점선
  function graph(lines, { mark, base, left, right } = {}) {
    const all = lines.flatMap((l) => l.ys).concat(base === undefined ? [] : [base]);
    const lo = Math.min(...all), r = Math.max(...all) - lo || 1, n = lines[0].ys.length - 1;
    const X = (i) => (i / n * 200).toFixed(1), Y = (v) => (96 - (v - lo) / r * 92).toFixed(1);
    return `<div class="lgraph"><svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">${mark ? `<rect x="${X(mark[0])}" y="0" width="${(X(mark[1]) - X(mark[0])).toFixed(1)}" height="100" fill="#ffc83d" opacity=".35"/>` : ""}${base === undefined ? "" : `<line x1="0" x2="200" y1="${Y(base)}" y2="${Y(base)}" stroke="#8c99b8" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`}${lines.map((l) => `<polyline fill="none" stroke="${l.color}" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${l.ys.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/>`).join("")}</svg><div class="ax"><span>${left}</span><span>${right}</span></div></div>`;
  }
  // 이익 막대 두 개 (단위: 억 달러)
  function profit(sym) {
    const a = F[sym].prev.net * 10, b = F[sym].now.net * 10, mx = Math.max(a, b);
    const bar = (t, v) => `<div class="pbar"><span>${t}</span><i style="width:${Math.max(3, v / mx * 100).toFixed(0)}%"></i><b>${v < 1 ? `${Math.round(v * 10000).toLocaleString("ko-KR")}만` : `${c1(v)}억`} 달러</b></div>`;
    return card(`<h2>🏪 가게 실력: 1년 이익</h2>${bar("지난 회계연도", a)}${bar("다음 회계연도", b)}<p class="small">회계연도(${F[sym].fy}) 순이익 · 회사가 낸 성적표(10-K)</p>`);
  }

  // ---------- ① 가게 실력과 값표 ----------
  const GAP = [
    { sym: "AMZN", from: "2020-02-19", to: "2020-03-12", why: "이때는 병이 퍼지면서 <b>시장 전체</b>가 크게 내렸어요." },
    { sym: "AAPL", from: "2020-02-12", to: "2020-03-23", why: "이때도 <b>시장 전체</b>가 크게 내렸어요. 좋은 가게의 값도 함께 내릴 수 있어요." },
    { sym: "ZM", from: "2020-10-19", to: "2020-12-31", why: "11월 백신 소식 등으로 '앞으로도 이만큼 빨리 자랄까?' 하는 생각이 달라졌다고 흔히 설명해요. 값이 움직인 이유를 딱 하나로 알 수는 없어요." },
  ];
  const gapPages = GAP.flatMap(({ sym, from, to, why }) => {
    const a = at(from), b = to === "2020-12-31" ? END : at(to), p = D.prices[sym], drop = Math.round((1 - p[b] / p[a]) * 100);
    const grew = F[sym].now.net / F[sym].prev.net;
    const grewText = grew >= 2 ? `약 ${Math.round(grew)}배로 늘었어요` : `${Math.round((grew - 1) * 100)}% 늘었어요`;
    return [
      () => ({
        title: `${label(sym)}의 실력`,
        body: profit(sym),
        text: `${NAMES[sym][1]}(${NAMES[sym][2]})의 1년 이익은 ${grewText}.`,
        ask: { key: `gap-${sym}`, q: "이 무렵에 값표(주식 값)는 어땠을까?", opts: ["📈 계속 올랐을 것 같아", "📉 중간에 크게 내렸을 수도 있어", "🤷 이익만 봐서는 모르겠어"], reply: () => "생각해 봤으면 됐어요. 실제 값을 같이 봐요." },
      }),
      () => ({
        title: `${label(sym)}의 값표`,
        body: card(`<h2>🏷️ 값표: 2020년 주식 값</h2>${graph([{ ys: p.slice(START, END + 1), color: "#2f6fe4" }], { mark: [a - START, b - START], left: "1월", right: "12월" })}${rows([[`${md(from)} → ${md(to)}`, `<span class="down">▼ ${drop}%</span>`], ["2020년 1년 전체", `<span class="${dir(p[END] / p[START])}">${pct(p[END] / p[START])}</span>`]])}`) + card(`<p>${why}</p><p class="small">⏰ 1년 이익 전체는 회계연도가 끝난 뒤에 발표돼요. 노란 기간에 사람들은 이 숫자를 아직 다 알지 못했어요.</p>`),
        text: `그런데 노란 기간에는 값이 ${drop}퍼센트 내렸어요. 가게의 1년 이익이 늘어난 해에도 값은 크게 내릴 수 있어요.`,
      }),
    ];
  });
  const LAB_GAP = [
    () => ({ title: "두 가지를 따로 보기", body: card(rows([["🏪 가게 실력", "장사해서 남긴 이익"], ["🏷️ 값표", "사람들이 사고파는 주식 값"]])), text: "가게 실력과 값표는 서로 다른 거예요. 늘 나란히 걷지는 않아요. 진짜 가게 세 곳을 살펴봐요." }),
    ...gapPages,
    () => ({ title: "알게 된 것", body: card(rows([["🏪 이익이 늘어난 해에도", "🏷️ 값은 내릴 수 있어요"], ["📉 값이 내렸다고", "가게가 꼭 나빠진 건 아니에요"], ["🙂 하지만", "정말 나빠졌을 수도 있어요"]])) + note("이 세 가게의 기간은 차이를 잘 보여 주려고 일부러 골랐어요. 내린 값이 늘 다시 오르는 것은 아니에요."), text: "값이 내리면 먼저 물어봐요. 가게가 하는 장사도 달라졌을까?" }),
  ];

  // ---------- ② 싼 걸까, 비싼 걸까 ----------
  const BASE = { e: 10, v: 200 };
  const QUAD = [
    { t: "값이 내렸고, 이익은 그대로", e: 10, v: 140, msg: "같은 실력의 가게를 더 낮은 배수로 살 수 있게 됐어요. 이익이 앞으로도 유지된다면 전보다 싸졌다고 볼 수 있어요." },
    { t: "값이 내렸는데, 이익은 더 많이 줄었어요", e: 5, v: 140, msg: "값표는 내렸지만 배수는 오히려 커졌어요. 값이 내렸다고 싸진 게 아닐 수 있어요." },
    { t: "값이 올랐는데, 이익은 더 많이 늘었어요", e: 20, v: 300, msg: "값표는 올랐지만 배수는 작아졌어요. 올랐어도 전보다 싸졌을 수 있어요." },
    { t: "값이 올랐고, 이익은 그대로", e: 10, v: 300, msg: "같은 실력인데 배수만 커졌어요. 사람들의 기대가 더 커졌어요. 기대대로 안 되면 값이 내릴 수 있어요." },
  ];
  const times = (o) => Math.round(o.v / o.e);
  const quadCard = (q) => card(`${table(["", "전", "후"], [["🏪 1년 이익", `${BASE.e}`, `<b>${q.e}</b>`], ["🏷️ 가게 전체 값", `${BASE.v}`, `<b>${q.v}</b>`]])}<p class="small">연습용으로 만든 예시 숫자예요.</p>`);
  const peAt = (sym) => D.prices[sym][START] / F[sym].eps;
  const multi = (sym) => (D.prices[sym][END] / D.prices[sym][START]) / (F[sym].now.net / F[sym].prev.net);
  const LAB_CHEAP = [
    () => ({ title: "몇 배로 쳐줄까?", body: card(rows([["🏪 1년 이익", "10"], ["🏷️ 가게 전체 값", "200"], ["✖️ 몇 배 (밸류에이션)", "200 ÷ 10 = 20배"]])), text: "값표만 보면 싼지 비싼지 알 수 없어요. 가게 실력에 비해 몇 배로 쳐주는지 봐요. 이걸 밸류에이션이라고 하고, 이익으로 잰 것이 PER이에요." }),
    ...QUAD.map((q, i) => () => ({
      title: q.t, body: quadCard(q),
      text: `처음에는 이익의 ${times(BASE)}배였어요. 지금은 어떨까요?`,
      ask: { key: `quad-${i}`, q: "몇 배는 어떻게 됐을까?", opts: ["▲ 커졌을 것 같아", "▼ 작아졌을 것 같아"], reply: () => `${q.v} ÷ ${q.e} = <b>${times(q)}배</b>. 20배에서 ${times(q) > times(BASE) ? "커졌어요" : "작아졌어요"}.<br>${q.msg}` },
    })),
    () => ({
      title: "진짜 기록: 둘 다 올랐는데",
      body: card(table(["2020년", "🏷️ 값", "🏪 이익", "✖️ 배수"], ["AMZN", "AAPL"].map((s) => [label(s), pct(D.prices[s][END] / D.prices[s][START]), pct(F[s].now.net / F[s].prev.net), multi(s) >= 1.1 ? "<b>많이 커짐</b>" : "<b>조금 작아짐</b>"]))) + note("값은 2020년 1월 → 12월, 이익은 회계연도끼리 비교한 대략의 계산이에요 (주식 수 변화는 뺐어요). 이익은 나중에 발표된 숫자예요."),
      text: "택배 가게와 스마트폰 가게는 값이 비슷하게 올랐어요. 그런데 택배 가게는 이익이 더 많이 늘어서 배수가 조금 작아졌고, 스마트폰 가게는 이익이 조금 늘어서 배수가 많이 커졌어요.",
    }),
    () => ({
      title: "배수가 낮으면 안전할까?",
      body: card(`<h2>2020년 1월에는</h2>${table(["가게", "그때 PER", "2020년 값", "다음 성적표"], ["AAL", "CCL"].map((s) => [label(s), `약 ${Math.round(peAt(s))}배`, `<span class="${dir(D.prices[s][END] / D.prices[s][START])}">${pct(D.prices[s][END] / D.prices[s][START])}</span>`, "적자"]))}<p>낮은 배수라 싸 보였지만, 여행이 멈추면서 <b>이익이 적자로 바뀌었어요.</b> 적자면 PER을 계산할 수 없어요.</p>`) + note("이런 큰 병은 미리 알기 어려웠어요. 배수가 낮으면 늘 나쁘고 높으면 늘 좋다는 뜻이 아니에요."),
      text: "배수는 지나간 이익으로 계산해요. 앞으로의 이익이 달라지면, 싸 보이던 가게가 싸지 않았던 것이 될 수 있어요.",
    }),
    () => ({
      title: "싼지 알아보는 네 가지 질문",
      body: card(rows([["1️⃣ 왜", "값이 왜 바뀌었을까?"], ["2️⃣ 실력", "이익과 빚은 어떻게 됐을까?"], ["3️⃣ 배수", "예전이나 비슷한 가게와 비교하면?"], ["4️⃣ 앞으로", "내 생각이 틀리면 어떻게 될까?"]])) + card(`<p>네 가지를 다 살펴봐도 <b>확실히 알 수는 없어요.</b> 어른 전문가끼리도 생각이 달라요. 그래서 같은 값에도 사는 사람과 파는 사람이 있어요.</p>`),
      text: "싸졌나? 아직 쌀까? 한 숫자로는 알 수 없어요. 네 가지 질문을 차례로 해 봐요.",
    }),
  ];

  // ---------- ③ 하나와 바구니 ----------
  const walk = (sym) => D.prices[sym].slice(START, END + 1).map((v) => 10 * v / D.prices[sym][START]);
  const stat = (sym) => {
    const ys = walk(sym);
    return { ys, end: ys.at(-1), low: Math.min(...ys), wild: ys.filter((v, i) => i && Math.abs(v / ys[i - 1] - 1) >= 0.05).length };
  };
  const LIMITS = [9, 7, 5];
  const LAB_BASKET = [
    () => ({ title: "하나와 바구니", body: card(rows([["🏪 개별 주식", "가게 한 곳의 조각"], ["🧺 S&P 500", "미국 큰 회사 약 500곳을 모아 잰 인덱스"], ["🛒 인덱스 ETF", "그 인덱스를 따라 담은 바구니 (예: SPY)"]])) + note("S&P 500은 모든 회사를 똑같이 담지 않아요. 가게 전체 값이 큰 회사를 더 많이 담아요."), text: "가게 한 곳만 갖는 것과, 약 500곳을 담은 바구니를 갖는 것은 어떻게 다를까요? 같은 길을 두 번 걸어 봐요." }),
    () => ({ title: "가게 하나 고르기", body: "", text: "2020년에 바구니와 나란히 걸어 볼 가게를 하나 골라요.", ask: { key: "shop", q: "어느 가게랑 비교할까?", opts: STORES.map(label), reply: (i) => `${label(STORES[i])}를 골랐어요.` } }),
    () => ({ title: "먼저 마음 정하기", body: card(`<p>동전 10개를 넣고 1년 동안 지켜본다고 해 봐요.</p>`), text: "결과를 보기 전에 정해 봐요. 동전이 몇 개까지 줄어도 놀라지 않고 기다릴 수 있을까요?", ask: { key: "limit", q: "몇 개까지 줄어도 괜찮아?", opts: LIMITS.map((n) => `🪙 ${n}개까지`), reply: (i) => `${LIMITS[i]}개라고 정했어요. 이제 두 길을 걸어 봐요.` } }),
    (P) => {
      const sym = STORES[P.shop ?? 0], limit = LIMITS[P.limit ?? 1], a = stat(sym), b = stat("SPY");
      const over = (x) => (x.low < limit ? `정한 ${limit}개보다 더 내려갔어요` : `정한 ${limit}개 아래로는 안 갔어요`);
      return {
        title: "같은 2020년, 두 길",
        body: card(`${graph([{ ys: a.ys, color: "#e8590c" }, { ys: b.ys, color: "#1f9e7f" }], { base: limit, left: "1월", right: "12월" })}<p class="legend"><span style="color:#e8590c">━ ${label(sym)}</span> <span style="color:#1f9e7f">━ 🧺 바구니</span> <span class="muted">┅ 내가 정한 선</span></p>${table(["동전 10개", label(sym), "🧺 바구니"], [["연말", `${c1(a.end)}개`, `${c1(b.end)}개`], ["가장 적었을 때", `${c1(a.low)}개`, `${c1(b.low)}개`], ["하루 5% 넘게 출렁인 날", `${a.wild}일`, `${b.wild}일`]])}`) + card(`<p>🏪 가게 길: ${over(a)}.<br>🧺 바구니 길: ${over(b)}.</p><p class="small">연말 결과만 보지 말고, 가는 동안 얼마나 흔들렸는지도 함께 봐요.</p>`),
        text: `동전 10개가 가게 길에서는 가장 적을 때 ${c1(a.low)}개, 바구니 길에서는 ${c1(b.low)}개였어요.`,
      };
    },
    () => {
      const list = [...STORES, "SPY"].map((s) => ({ s, ...stat(s) })).sort((x, y) => y.end - x.end);
      return { title: "일곱 가게를 모두 보면", body: card(table(["2020년", "연말", "가장 적을 때", "출렁인 날"], list.map((x) => [x.s === "SPY" ? "<b>🧺 바구니</b>" : label(x.s), `${c1(x.end)}개`, `${c1(x.low)}개`, `${x.wild}일`]))) + note("이 일곱 곳은 우리가 고른 유명한 회사예요. 모든 회사를 대표하지 않고, 2020년 한 해의 결과예요."), text: "어떤 가게는 바구니보다 훨씬 많이 올랐고, 어떤 가게는 훨씬 많이 내렸어요. 어느 쪽일지는 미리 알기 어려워요." };
    },
    () => ({ title: "좋은 점과 아쉬운 점", body: card(`<h2>🏪 개별 주식</h2><p>👍 잘 고르면 바구니보다 훨씬 많이 자랄 수 있어요.<br>👎 한 가게에 일이 생기면 크게 줄 수 있어요. 가게를 계속 살펴봐야 해요.</p>`) + card(`<h2>🧺 인덱스 바구니</h2><p>👍 여러 회사에 나눠 담겨서 한 가게의 영향이 작아요.<br>👎 시장 전체가 내리면 <b>바구니도 크게 내려요.</b> 가장 잘한 가게만큼 오르기는 어려워요. 바구니를 관리하는 비용도 조금 있어요.</p>`), text: "바구니는 안전 상자가 아니에요. 덜 몰아서 담는 방법이에요." }),
  ];

  // ---------- ④ 언제 팔까 ----------
  // 가격 묶음: 2020은 daily.js, 나머지는 stages-real.js의 시작 칸부터
  function series(set, sym) {
    if (set === "2020") return { p: D.prices[sym].slice(START), d: D.dates.slice(START) };
    return { p: H[set].prices[sym].slice(H[set].start), d: H[set].dates.slice(H[set].start) };
  }
  const RULES = ["💰 모두 팔기", "✂️ 절반만 팔기", "🌳 그대로 두기"];
  // 하루 마지막 값이 10개 → 12개(+20%)에 처음 닿은 날 규칙대로. 판 돈은 저금통에.
  function target(set, sym) {
    const { p, d } = series(set, sym), r = (i) => 10 * p[i] / p[0], end = r(p.length - 1), h = p.findIndex((v) => v >= p[0] * 1.2);
    return { ys: p.map((_, i) => r(i)), d, hit: h, out: h < 0 ? [end, end, end] : [r(h), r(h) / 2 + end / 2, end], top: Math.max(...p.map((_, i) => r(i))) };
  }
  // 마지막으로 산 값보다 10% 내리면 모두 팔고, 판 값보다 10% 오르면 다시 삼
  function flip(set, sym) {
    const { p } = series(set, sym);
    let cash = 0, sh = 10 / p[0], ref = p[0], n = 0;
    for (const v of p) {
      if (sh && v <= ref * 0.9) { cash = sh * v; sh = 0; ref = v; n++; }
      else if (!sh && v >= ref * 1.1) { sh = cash / v; cash = 0; ref = v; n++; }
    }
    return { hold: 10 * p.at(-1) / p[0], traded: cash + sh * p.at(-1), n };
  }
  const SELL = [
    { set: "h2023", sym: "NVDA", name: "🎮 그래픽 칩 회사 (엔비디아)", msg: "목표에서 판 뒤에도 훨씬 더 올랐어요. 여기서는 그대로 둔 쪽이 더 많았어요." },
    { set: "h2021", sym: "TSLA", name: "🚗 전기차 회사 (테슬라)", msg: "목표를 넘긴 뒤 다시 내려왔어요. 여기서는 판 쪽이 더 많았어요." },
    { set: "2020", sym: "ZM", name: "💻 화상 수업 가게 (줌)", msg: "그대로 두면 연말에 훨씬 많았지만, 가장 높을 때보다는 크게 내려왔어요. 가장 높은 날은 지나고 나서야 알 수 있어요." },
    { set: "2020", sym: "CCL", name: "🚢 배 여행 가게 (카니발)", msg: "목표에 한 번도 닿지 않았어요. '오르면 팔기' 약속만 있으면, 내릴 때는 할 일을 정하지 않은 거예요." },
  ];
  const sellPage = (c) => (P) => {
    const t = target(c.set, c.sym), mine = P.rule ?? 2, ko = (d) => { const [y, m] = d.split("-").map(Number); return `${y}년 ${m}월`; };
    return {
      title: c.name,
      body: card(`${graph([{ ys: t.ys, color: "#2f6fe4" }], { base: 12, left: ko(t.d[0]), right: ko(t.d.at(-1)) })}<p class="legend muted">┅ 목표 12개 · ${t.hit < 0 ? "목표에 닿지 않았어요" : `${md(t.d[t.hit])}에 처음 닿았어요`} · 가장 높을 때 ${c1(t.top)}개</p>${rows(RULES.map((r, i) => [`${r}${i === mine ? " <em>내 약속</em>" : ""}`, `${c1(t.out[i])}개`, i === mine ? "mine" : ""]))}`),
      text: c.msg,
    };
  };
  const FLIPS = [["h2000", "QQQ", "🧺 미국 기술 회사 바구니 · 2000년 상반기"], ["h2009", "GS", "🏦 큰 투자 은행 · 2009년 상반기"], ["2020", "CCL", "🚢 배 여행 가게 · 2020년"], ["h2008", "AIG", "☂️ 큰 보험 회사 · 2008년 가을"]];
  const LAB_SELL = [
    () => ({ title: "파는 건 더 어려워요", body: card(`<p>어른들은 <b>"파는 건 예술"</b>이라고 말하기도 해요. 언제 팔면 되는지 늘 맞는 공식이 없다는 뜻이에요.</p>`), text: "사는 것만큼, 어쩌면 더 어려운 게 파는 거예요. 진짜 기록으로 여러 번 겪어 봐요." }),
    () => ({ title: "먼저 약속 정하기", body: card(`<p>동전 10개로 샀어요. 목표는 <b>12개(20% 오름)</b>예요.</p>`), text: "목표에 닿으면 어떻게 할지 먼저 정해요. 네 가지 이야기에 같은 약속을 써 볼 거예요.", ask: { key: "rule", q: "목표에 닿으면?", opts: RULES, reply: (i) => `약속: <b>${RULES[i]}</b>. 맞고 틀린 답은 없어요.` } }),
    ...SELL.map(sellPage),
    () => ({
      title: "네 이야기를 나란히",
      body: card(table(["가게", ...RULES.map((r) => r.slice(r.indexOf(" ") + 1))], SELL.map((c) => [c.name.replace(/ \(.*/, ""), ...target(c.set, c.sym).out.map((v) => `${c1(v)}개`)]))) + note("서로 다른 결과를 보여 주려고 일부러 고른 네 기간이에요. 어느 약속이 몇 번 이기는지를 말해 주지 않아요. 세금·수수료는 빼고, 판 돈은 그대로 두었다고 계산했어요."),
      text: "어떤 때는 팔기가, 어떤 때는 두기가 더 많았어요. 늘 이기는 약속은 없었어요.",
    }),
    () => ({
      title: "자주 사고팔면 더 좋을까?",
      body: card(`<p>이런 규칙으로 해 봐요: <b>10% 내리면 모두 팔고, 판 값보다 10% 오르면 다시 사기</b></p>${table(["이야기", "그대로", "사고팔기", "거래"], FLIPS.map(([set, sym, name]) => { const f = flip(set, sym); return [name, `${c1(f.hold)}개`, `${c1(f.traded)}개`, `${f.n}번`]; }))}<p>🚢 ☂️ 크게 내려간 곳에서는 판 쪽이 훨씬 덜 잃었어요. 거래 1번은 <b>한 번 팔고 다시 사지 않았다</b>는 뜻이에요.<br>🧺 🏦 오르락내리락하거나 다시 오른 곳에서는 사고판 쪽이 더 적었어요. <b>싸게 팔고 비싸게 다시 사게 됐기 때문이에요.</b></p>`) + note("일부러 고른 기간이에요. 수수료·세금을 넣으면 거래할 때마다 결과가 더 줄 수 있어요."),
      text: "오래 가지고 있다고 늘 좋은 것도 아니고, 자주 사고판다고 늘 좋은 것도 아니에요.",
    }),
    () => ({
      title: "목표에 닿으면 = 다시 확인할 때",
      body: card(`<p>목표 값은 <b>무조건 팔라는 신호가 아니라, 다시 살펴보라는 알림</b>으로 쓸 수 있어요.</p>${rows([["1️⃣ 처음 이유", "내가 산 이유가 아직 맞아?"], ["2️⃣ 값표", "가게 실력에 비해 너무 높아지진 않았어?"], ["3️⃣ 쓸 돈", "곧 이 돈을 써야 해?"], ["4️⃣ 몰림", "한 가게가 내 돈에서 너무 커졌어?"]])}`) + card(`<p>답에 따라 <b>그대로 두기 · 일부 팔기 · 모두 팔기</b>를 고를 수 있어요. 목표에 못 닿아도, <b>산 이유가 틀렸다면</b> 다시 정해야 해요.</p>`),
      text: "팔지 말지는 값만 보지 말고 네 가지를 확인하고 정해요.",
    }),
    () => ({ title: "사기 전에 적어 두기", body: card(`<p>값이 크게 움직이면 마음이 흔들려요. 그래서 <b>사기 전에</b> 적어 두면 도움이 돼요.</p>`), text: "마지막으로, 언제 다시 확인할지 하나 골라 봐요.", ask: { key: "plan", q: "나는 이럴 때 꼭 다시 확인할래", opts: ["🏪 가게 장사가 달라졌을 때", "🎯 목표 값에 닿았을 때", "🗓️ 정해 둔 날이 됐을 때"], reply: () => "좋아요. 셋 다 확인할 때로 정해도 돼요. 가족과 함께 '왜 샀는지, 언제 다시 볼지'를 적어 봐요." } }),
  ];

  const LABS = [
    { id: "lab1", e: "🏷️", title: "가게 실력과 값표", sub: "이익이 늘어도 값이 내릴까?", pages: LAB_GAP },
    { id: "lab2", e: "✖️", title: "싼 걸까, 비싼 걸까?", sub: "내리면 싼 것? 오르면 비싼 것?", pages: LAB_CHEAP },
    { id: "lab3", e: "🧺", title: "하나와 바구니", sub: "개별 주식과 S&P 500", pages: LAB_BASKET },
    { id: "lab4", e: "🚪", title: "언제 팔까?", sub: "목표에 닿으면 어떻게 하지?", pages: LAB_SELL },
  ];

  // ---------- 화면 ----------
  let cur = null; // { lab, i, picks }
  const page = () => LABS[cur.lab].pages[cur.i](cur.picks);
  const spoken = () => { const g = page(), a = g.ask, p = a && cur.picks[a.key]; return !a ? g.text : p === undefined ? `${g.text} ${a.q}` : a.reply(p); };

  const buttons = () => `<div class="menu">${LABS.map((l, i) => `<button class="big" data-act="labopen" data-i="${i}"><span>${l.e}</span><div>${i + 1}. ${l.title}${seen(l.id) ? " ✅" : ""}<small>${l.sub}</small></div></button>`).join("")}</div>`;

  function render() {
    const l = LABS[cur.lab], g = page(), a = g.ask, p = a ? cur.picks[a.key] : undefined, last = cur.i === l.pages.length - 1, waiting = a && p === undefined;
    $("#main").innerHTML = `
      <div class="banner"><span class="em">${l.e}</span><div><b>${g.title}</b><small>${l.title} · ${cur.i + 1} / ${l.pages.length}</small></div></div>
      <p class="lead">${g.text}</p>
      ${g.body}
      ${a ? card(`<h2>${a.q}</h2><div class="opts">${a.opts.map((o, i) => `<button data-act="labpick" data-i="${i}" class="${p === i ? "on" : ""}" aria-pressed="${p === i}">${o}</button>`).join("")}</div>${waiting ? "" : `<p class="reply">${a.reply(p)}</p>`}`) : ""}
      <div class="lnav">
        <button class="pill ghost" data-act="${cur.i ? "labprev" : "home"}">◀ ${cur.i ? "이전" : "처음 화면"}</button>
        <button class="iconbtn" data-act="labsay" aria-label="읽어 주기">🔊</button>
        ${last ? `<button class="pill" data-act="labend" ${waiting ? "disabled" : ""}>${cur.lab + 1 < LABS.length ? "다음 체험 ▶" : "마치기 ✔"}</button>` : `<button class="pill" data-act="labnext" ${waiting ? "disabled" : ""}>다음 ▶</button>`}
      </div>
      ${cur.i ? `<button class="pill ghost lhome" data-act="home">🏠 체험 목록으로</button>` : ""}
      <p class="note">교육용 연습이에요. 투자 권유가 아니에요. 지나간 값이 앞으로의 값을 알려 주지는 않아요.</p>`;
  }

  function go(lab, i, picks = {}) { cur = { lab, i, picks }; show(); say(spoken()); }

  function act(a, data) {
    if (a === "labopen") return go(+data.i, 0);
    if (!cur) return;
    if (a === "labsay") return say(spoken());
    if (a === "labnext") return go(cur.lab, cur.i + 1, cur.picks);
    if (a === "labprev") return go(cur.lab, cur.i - 1, cur.picks);
    if (a === "labpick") {
      cur.picks[page().ask.key] = +data.i;
      render();
      return say(spoken());
    }
    if (a === "labend") {
      done(LABS[cur.lab].id);
      if (cur.lab + 1 < LABS.length) return go(cur.lab + 1, 0);
      show(); // 목록 화면은 kid.js의 home 동작으로
      return document.querySelector('[data-act="home"]')?.click();
    }
  }

  return { buttons, render, act };
};
