// 꼬마 탐험가 (7~9세): 그림 영상 3편으로 개념을 보고 → 2020년 실제 가격으로 동전 10개를 굴려 보는 여행
// 가격은 daily.js의 실제 일별 수정 종가. 뉴스는 실제 2020년 사건을 아이 말로 옮긴 것.
(() => {
  const D = window.RAUM_DAILY, ART = window.RAUM_ART, SP = window.RAUM_SPEAK;
  const $ = (q) => document.querySelector(q);
  const KRW = D.usdKrw || 1200, COIN = 100_000;
  const near = (d) => { const i = D.dates.findIndex((x) => x >= d); return i < 0 ? D.dates.length - 1 : i; };
  const START = near("2020-01-02");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Gemini 그림 목록: img/kid/list.js (scripts/gen-kid-images.mjs가 만듦). 없는 장면은 기본 그림(SVG)으로 보여 줘요.
  const IMGS = new Set(window.RAUM_KID_IMGS || []);

  const SHOPS = [
    { sym: "ZM", e: "💻", kid: "화상 수업 가게", real: "줌", what: "컴퓨터로 얼굴을 보며 이야기하는 프로그램을 만들어요." },
    { sym: "NFLX", e: "🎬", kid: "집에서 영화 가게", real: "넷플릭스", what: "집에서 영화랑 만화를 볼 수 있게 해 줘요." },
    { sym: "AMZN", e: "📦", kid: "택배 가게", real: "아마존", what: "인터넷으로 물건을 팔고 집까지 배달해 줘요." },
    { sym: "CCL", e: "🚢", kid: "배 여행 가게", real: "카니발", what: "커다란 배를 타고 바다 여행을 시켜 줘요." },
    { sym: "AAL", e: "✈️", kid: "비행기 가게", real: "아메리칸항공", what: "비행기로 사람들을 먼 곳에 데려다줘요." },
  ];
  const shop = (sym) => SHOPS.find((s) => s.sym === sym);

  // ---------- 상태 ----------
  const KEY = "raum-kid-v1";
  const fresh = () => ({ phase: "intro", stop: 0, step: 0, di: START, cash: 10, sh: {}, preds: {}, flags: {}, sh0: null, cash0: 10, mark: START, why: null, log: [], tradeFrom: null });
  let S = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return fresh(); } })();
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));

  const px = (sym, di = S.di) => D.prices[sym][di];
  const won = (sym, di) => Math.round(px(sym, di) * KRW);
  const val = (sym, di = S.di) => (S.sh[sym] || 0) * px(sym, di) * KRW / COIN;
  const invested = (di) => SHOPS.reduce((a, s) => a + val(s.sym, di), 0);
  const total = (di) => S.cash + invested(di);
  const c1 = (v) => (Math.round(v * 10) / 10).toLocaleString("ko-KR");
  const ratio = (sym, a, b) => px(sym, b) / px(sym, a);
  // 아이 말로 바뀐 정도: "2.5배가 됐어요" / "30% 올랐어요" / "71% 내렸어요"
  const moved = (r) => (r >= 2 ? `${Math.floor(r * 10) / 10}배가 됐어요` : r >= 1 ? `${Math.round((r - 1) * 100)}% 올랐어요` : `${Math.round((1 - r) * 100)}% 내렸어요`);
  const mood = (di = S.di) => { const v = D.vix[di]; return v < 20 ? ["😊", "맑음"] : v < 30 ? ["🙂", "조금 흐림"] : v < 45 ? ["😟", "걱정"] : ["😱", "아주 무서움"]; };
  const dateKo = (di = S.di) => { const [y, m, d] = D.dates[di].split("-").map(Number); return `${y}년 ${m}월 ${d}일`; };

  // ---------- 효과음 (짤랑) ----------
  let ac;
  function ding(up = true) {
    try {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = "triangle";
      o.frequency.setValueAtTime(up ? 880 : 600, t); o.frequency.exponentialRampToValueAtTime(up ? 1480 : 360, t + 0.14);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.3);
    } catch {}
  }

  // ---------- 말하기 + 자동 넘김 ----------
  let tok = 0;
  function speakThen(text, done, { wait = 700 } = {}) {
    const my = ++tok;
    let fired = false;
    const fin = () => { if (fired || my !== tok) return; fired = true; setTimeout(() => my === tok && done?.(), wait); };
    const plain = SP.plain(text);
    // 소리가 꺼졌거나 onend가 안 오는 브라우저를 위한 대비 시간
    const fallback = SP.on && SP.supported ? 2500 + plain.length * 160 : 1600 + plain.length * 75;
    setTimeout(fin, fallback);
    SP.say(text, { onend: (ok) => (ok ? fin() : null) });
    return () => { tok++; SP.stop(); };
  }
  function cancelTalk() { tok++; SP.stop(); }

  // ---------- 장면 그림 ----------
  const people = (list, leave = false) => `<div class="s-ppl ${leave ? "leave" : ""}">${list.map((p, i) => `<span style="--d:${0.2 + i * 0.25}s">${p}</span>`).join("")}</div>`;
  function pizzaSvg(n = 8) {
    let w = "";
    const st = 360 / n;
    for (let k = 0; k < n; k++) {
      const a0 = (k * st - 90) * Math.PI / 180, a1 = ((k + 1) * st - 90) * Math.PI / 180, am = (a0 + a1) / 2;
      const p = (a, r) => `${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)}`;
      w += `<g class="w ${k === 1 && n === 8 ? "pick" : ""}" style="--dx:${(Math.cos(am) * 12).toFixed(1)}px;--dy:${(Math.sin(am) * 12).toFixed(1)}px">
        <path d="M100 100 L${p(a0, 80)} A80 80 0 0 1 ${p(a1, 80)} Z" fill="#ffcf5c" stroke="#16223d" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="${(100 + Math.cos(am) * 52).toFixed(1)}" cy="${(100 + Math.sin(am) * 52).toFixed(1)}" r="${n > 8 ? 5 : 8}" fill="#e5383b" stroke="#16223d" stroke-width="2"/></g>`;
    }
    return `<svg class="pizza" viewBox="0 0 200 200" aria-hidden="true">${w}</svg>`;
  }
  const chart = (up) => `<svg class="chart" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><polyline stroke="${up ? "#e5383b" : "#2f6fe4"}" points="${up ? "6,88 40,74 70,80 100,56 130,60 160,30 194,12" : "6,12 40,26 70,20 100,46 130,40 160,70 194,88"}"/></svg>`;
  const phone = (cls = "") => `<div class="phone ${cls}"><div class="t">관심종목</div>
    <div class="r"><span>🍎 애플</span><b class="up">▲ 2.1%</b></div><div class="r"><span>🚢 카니발</span><b class="down">▼ 3.4%</b></div>
    <div class="r"><span>📦 아마존</span><b class="up">▲ 0.8%</b></div><div class="r"><span>✈️ 항공</span><b class="down">▼ 1.2%</b></div>
    <div class="bb"><span class="b1">사기</span><span class="b2">팔기</span></div><div class="demo">예시 화면</div></div>`;
  const SCENES = {
    shop: () => `<div class="awn"></div><div class="s-big bob">🍕</div>${people(["🧑", "👩", "👦", "👧"])}<div class="s-sign">라우 피자 가게</div>`,
    split: () => `${pizzaSvg()}<div class="s-label">이 한 조각 = 주식 1주</div>`,
    owner: () => `<div class="s-big">🧒</div><div class="drop" style="--d:.3s;top:42%;left:60%">🍕</div><div class="drop" style="--d:.9s;top:8%;left:41%">👑</div><div class="s-sign">나도 작은 주인!</div>`,
    grow: () => `<div class="awn"></div><div class="s-big bob">🍕</div>${people(["🧑", "👩", "👦", "👧", "👨", "👵"])}<div class="s-price"><s>조각 1,000원</s><b class="up">▲ 1,500원</b></div>`,
    shrink: () => `<div class="awn"></div><div class="s-big" style="filter:grayscale(.5)">🍕</div>${people(["🧑", "👩", "👦"], true)}<div class="s-price"><s>조각 1,000원</s><b class="down">▼ 700원</b></div>`,
    crowdUp: () => `${chart(true)}${people(["🙋", "🙋‍♀️", "🙋‍♂️", "🙋", "🙋‍♀️"])}<div class="s-sign">"나도 살래요!"</div>`,
    crowdDown: () => `${chart(false)}${people(["🙅", "🙅‍♀️", "🙅‍♂️", "🙅"], true)}<div class="s-sign">"난 팔래요!"</div>`,
    news: () => `<div class="s-big bob">📰</div><div class="think"><span style="--d:.6s">😨</span><span style="--d:1.1s">😍</span><span style="--d:1.6s">🤔</span></div><div class="s-sign">뉴스 → 마음 → 값</div>`,
    nobody: () => `<div style="width:42%">${ART.owl("worried")}</div><div class="think"><span style="--d:.4s">❓</span><span style="--d:.8s">❓</span></div><div class="s-sign">내일은 아무도 몰라요</div>`,
    phone: () => phone(),
    colors: () => phone("hl"),
    buttons: () => phone("btn"),
    coins: () => `<div class="coinrow">${Array.from({ length: 10 }, (_, i) => `<span style="--i:${i}">🪙</span>`).join("")}</div><div class="s-sign">동전 1개 = 10만 원</div>`,
    machine: () => `<div class="s-big spin">🕰️</div><div class="yr">2020</div>`,
  };

  // ---------- 투자 학교 장면 도우미 (모두 '장면을 그리는 함수'를 돌려줘요) ----------
  const pop = (items, sign = "") => Object.assign(() => `<div class="poprow ${items.length > 4 ? "many" : ""}">${items.map((x, i) => `<span style="--d:${0.2 + i * 0.45}s">${x}</span>`).join("")}</div>${sign ? `<div class="s-sign">${sign}</div>` : ""}`, { pic: items });
  const bill = (title, rows, tot) => () => `<div class="bill"><h3>${title}</h3>${rows.map(([a, b, c = ""], i) => `<div class="r" style="--d:${0.3 + i * 0.7}s"><span>${a}</span><b class="${c}">${b}</b></div>`).join("")}${tot ? `<div class="r tot" style="--d:${0.6 + rows.length * 0.7}s"><span>${tot[0]}</span><b class="${tot[2] || ""}">${tot[1]}</b></div>` : ""}</div>`;
  // 재무상태표: 가진 것 = 빌린 돈 + 내 돈
  const bs = (warn) => () => `<div class="bs ${warn ? "warn" : ""}"><div class="col"><i class="blk a" style="--h:100%;--d:.2s">🏪<br>가진 것</i><small>가게·오븐·돈</small></div><b class="eq">=</b><div class="col"><i class="blk d" style="--h:${warn ? 68 : 35}%;--d:.9s">🏦 빌린 돈</i><i class="blk e" style="--h:${warn ? 32 : 65}%;--d:1.4s">😊 내 돈</i><small>빌린 돈 + 내 돈</small></div></div>`;
  // 진짜 2020년 차트 (SPY = 미국 큰 회사 500곳 모음)
  const END = near("2020-12-31");
  const seg = (sym, a, b, n = 60) => Array.from({ length: n + 1 }, (_, i) => px(sym, Math.round(a + (b - a) * i / n)));
  const xy = (ys, i, h = 100, pad = 8) => { const lo = Math.min(...ys), hi = Math.max(...ys), r = hi - lo || 1; return [(i / (ys.length - 1) * 200).toFixed(1), (pad + (1 - (ys[i] - lo) / r) * (h - pad * 2)).toFixed(1)]; };
  const pts = (ys, h) => ys.map((_, i) => xy(ys, i, h).join(",")).join(" ");
  const realLine = (dip) => () => {
    const ys = seg("SPY", START, END), lo = ys.indexOf(Math.min(...ys)), [dx, dy] = xy(ys, lo);
    return `<div class="rline"><svg viewBox="0 -8 200 124" aria-hidden="true"><polyline points="${pts(ys)}" stroke="#e5383b"/>${dip ? `<circle class="dip" cx="${dx}" cy="${dy}" r="11"/>` : ""}</svg><div class="ax"><span>← 1월 (옛날)</span><span>12월 (오늘) →</span></div></div><div class="s-sign">2020년 · 미국 큰 회사 500곳 모음</div>`;
  };
  const periods = () => {
    const a = near("2020-03-09"), b = near("2020-03-16");
    const card = (ys, t, r) => `<div class="mini"><svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts(ys)}" stroke="${r >= 1 ? "#e5383b" : "#2f6fe4"}"/></svg><b class="${r >= 1 ? "up" : "down"}">${r >= 1 ? "▲" : "▼"} ${moved(r)}</b><span>${t}</span></div>`;
    return `<div class="minis">${card(seg("SPY", a, b, b - a), "3월의 한 주", ratio("SPY", a, b))}${card(seg("SPY", START, END), "2020년 1년", ratio("SPY", START, END))}</div><div class="s-sign">같은 주식, 다른 기간</div>`;
  };
  // 촛불 막대 (예시 모양): [시작, 끝, 가장 낮은, 가장 높은]
  const CAN = [[50, 58, 46, 60], [58, 55, 52, 61], [55, 64, 53, 66], [64, 70, 62, 73], [70, 66, 63, 72], [66, 60, 57, 68], [60, 68, 58, 70], [68, 76, 66, 79]], VOL = [3, 4, 5, 4, 6, 9, 7, 5];
  const candles = (vol) => () => {
    const Y = (v) => (80 - (v - 44) * 1.9).toFixed(1);
    const g = CAN.map(([o, c, l, h], i) => {
      const x = 14 + i * 24, col = c >= o ? "#e5383b" : "#2f6fe4";
      return `<g style="--d:${0.2 + i * 0.25}s"><line x1="${x}" x2="${x}" y1="${Y(h)}" y2="${Y(l)}" stroke="${col}" stroke-width="2.5"/><rect x="${x - 7}" y="${Y(Math.max(o, c))}" width="14" height="${(Math.abs(o - c) * 1.9).toFixed(1)}" fill="${col}" stroke="#16223d" stroke-width="1.5" rx="2"/>${vol ? `<rect x="${x - 7}" y="${118 - VOL[i] * 3.2}" width="14" height="${VOL[i] * 3.2}" fill="${col}" opacity=".5"/>` : ""}</g>`;
    }).join("");
    return `<svg class="candles" viewBox="0 0 200 ${vol ? 120 : 86}" aria-hidden="true">${g}${vol ? `<line x1="0" x2="200" y1="88" y2="88" stroke="#c8d3e6" stroke-dasharray="3 3"/>` : ""}</svg><div class="s-sign">${vol ? "아래 작은 막대 = 거래량" : "빨강 = 오른 날 · 파랑 = 내린 날"}</div>`;
  };
  const saw = (l, r, t) => () => `<div class="saw" style="--t:${t}deg"><div class="bar"><span>${l}</span><span>${r}</span></div><div class="piv"></div></div>`;
  // 호가창: 위 파랑 = 팔래요, 아래 빨강 = 살래요 (deal이면 1,000원에서 만나 체결)
  const book = (deal) => () => {
    const sell = [[1030, "🙋"], [1020, "🙋🙋"], deal ? [1000, "🙋"] : [1010, "🙋🙋🙋"]], buy = [[1000, "🙋‍♂️🙋‍♂️🙋‍♂️"], [990, "🙋‍♂️🙋‍♂️"], [980, "🙋‍♂️"]];
    const row = ([p, who], c, i, hit) => `<div class="hr ${c} ${hit ? "hit" : ""}" style="--d:${0.2 + i * 0.22}s"><span>${who}</span><b>${p.toLocaleString("ko-KR")}원</b></div>`;
    return `<div class="hoga"><div class="lab down">▼ 이 값에 팔래요</div>${sell.map((r, i) => row(r, "s", i, deal && i === 2)).join("")}${deal ? `<div class="deal">🤝 1,000원에 체결!</div>` : ""}${buy.map((r, i) => row(r, "b", i + 3, deal && i === 0)).join("")}<div class="lab up">▲ 이 값에 살래요</div></div>`;
  };
  // 막대 그래프: [[이름, 값, up|down]]
  const bars = (items, sign = "") => () => {
    const mx = Math.max(...items.map((x) => x[1]));
    return `<div class="bars">${items.map(([l, v, c = ""], i) => `<div class="bc"><b class="${c}">${c1(v)}</b><i class="${c}" style="--h:${(v / mx * 100).toFixed(0)}%;--d:${0.2 + i * 0.3}s"></i><span>${l}</span></div>`).join("")}</div>${sign ? `<div class="s-sign">${sign}</div>` : ""}`;
  };
  const cut = () => `<div class="cut">${pizzaSvg(4)}<b>➡️</b>${pizzaSvg(16)}</div><div class="s-sign">조각 수만 늘었어요</div>`;
  // 진짜 2020년 숫자 (어른도 잘 모르는 투자 비밀에서 씀)
  const ccl = (() => { const p = D.prices.CCL; let lo = START; for (let i = START; i <= END; i++) if (p[i] < p[lo]) lo = i; return { drop: Math.round((1 - p[lo] / p[START]) * 100), need: Math.round((p[START] / p[lo] - 1) * 100), x: Math.floor(p[START] / p[lo] * 10) / 10 }; })();
  const dca = (() => { let sh = 0; for (let m = 1; m <= 12; m++) sh += 1 / px("SPY", near(`2020-${String(m).padStart(2, "0")}-01`)); return { lump: 12 * ratio("SPY", START, END), month: sh * px("SPY", END) }; })();
  const exch = (a, b, sign = "") => () => `<div class="exch"><span>${a}</span><b>⇄</b><span>${b}</span></div>${sign ? `<div class="s-sign">${sign}</div>` : ""}`;

  // ---------- 그림 영상: 처음 3편 + 라우의 투자 학교 ----------
  // quiz: { q, a: 정답, no: [오답...], why } — 혼자 볼 때 영상 끝에 한 문제
  const BASIC = 3;
  const GUIDES = [
    { id: "g1", e: "🍕", title: "주식이 뭐야?", quiz: { q: "주식 한 조각을 사면 나는?", a: "👑 가게의 작은 주인", no: ["🛒 가게 손님", "🧑‍🍳 가게 직원"], why: "조각을 가지면 가게의 작은 주인이 돼요." }, scenes: [
      ["shop", "여기 맛있는 피자 가게가 있어요. 손님이 아주 많아요."],
      ["split", "가게 주인이 가게를 여러 조각으로 나눴어요. 이 한 조각을 '주식'이라고 불러요."],
      ["owner", "주식 한 조각을 사면, 나도 이 가게의 작은 주인이 돼요!"],
      ["grow", "가게가 장사를 잘하면, 내 조각의 값도 쑥쑥 올라가요."],
      ["shrink", "장사가 잘 안 되면, 조각 값이 내려갈 수도 있어요."],
    ] },
    { id: "g2", e: "🙋", title: "값은 왜 바뀔까?", quiz: { q: "사고 싶은 사람이 많아지면 값은?", a: "▲ 올라가요", no: ["▼ 내려가요", "➖ 그대로예요"], why: "갖고 싶은 사람이 많으면 값이 올라가요." }, scenes: [
      ["crowdUp", "이 조각을 갖고 싶은 사람이 많아지면, 값이 올라가요."],
      ["crowdDown", "팔고 싶은 사람이 많아지면, 값이 내려가요."],
      ["news", "사람들은 뉴스를 듣고 마음이 바뀌어요. 마음이 바뀌면 값도 바뀌어요."],
      ["nobody", "그래서 내일 값이 어떻게 될지는 아무도 몰라요. 라우도 몰라요!"],
    ] },
    { id: "g3", e: "📱", title: "어른들은 이렇게 사요", quiz: { q: "증권 앱에서 빨간 ▲는 무슨 뜻일까?", a: "값이 올랐어요", no: ["값이 내렸어요", "가게가 쉬어요"], why: "빨강 ▲는 올랐어요, 파랑 ▼는 내렸어요." }, scenes: [
      ["phone", "어른들은 스마트폰의 '증권 앱'으로 주식을 사고팔아요."],
      ["colors", "빨간색 세모는 값이 올랐다는 뜻, 파란색 세모는 내렸다는 뜻이에요."],
      ["buttons", "'사기'를 누르면 조각을 사고, '팔기'를 누르면 조각을 팔아요."],
      ["coins", "꼬마 탐험가는 동전 10개로 연습해요. 동전 하나는 10만 원이에요."],
      ["machine", "자, 이제 타임머신을 타고 2020년으로 가서, 진짜 값으로 연습해 봐요!"],
    ] },
    // ----- 라우의 투자 학교 -----
    { id: "g4", e: "🍋", title: "가게는 어떻게 돈을 벌까?", quiz: { q: "판 돈이 10,000원, 쓴 돈이 7,000원이면 이익은?", a: "3,000원", no: ["17,000원", "7,000원"], why: "판 돈에서 쓴 돈을 빼면 이익이에요. 10,000 − 7,000 = 3,000원!" }, scenes: [
      [pop(["🍋", "🥤", "🦉"], "라우 레모네이드"), "라우가 레모네이드 가게를 열었어요. 한 컵에 천 원에 팔아요."],
      [bill("오늘 판 돈", [["🥤 컵 10개 팔았어요", "+10,000원", "up"]], ["🛒 매출", "10,000원"]), "오늘 10컵을 팔아서 만 원을 받았어요. 이렇게 물건을 팔아서 받은 돈을 '매출'이라고 해요."],
      [bill("오늘 쓴 돈", [["🍋 레몬", "−3,000원", "down"], ["🍬 설탕·컵", "−2,000원", "down"], ["🧑‍🍳 도와준 친구", "−1,000원", "down"]], ["💸 비용", "6,000원"]), "그런데 레몬이랑 설탕이랑 컵을 사느라 돈을 썼어요. 장사하느라 쓴 돈은 '비용'이라고 해요."],
      [bill("남은 돈", [["🛒 매출", "10,000원"], ["💸 비용", "−6,000원", "down"]], ["😊 이익", "4,000원", "up"]), "판 돈에서 쓴 돈을 빼고 남은 돈, 이게 바로 '이익'이에요. 오늘 이익은 4천 원!"],
      [bill("☔ 비 오는 날", [["🛒 매출 (3컵)", "3,000원"], ["💸 비용", "−6,000원", "down"]], ["😓 적자", "−3,000원", "down"]), "비가 와서 3컵밖에 못 팔면? 쓴 돈이 더 많아요. 이렇게 손해 본 걸 '적자'라고 해요."],
      [pop(["😊", "➡️", "📈"], "이익이 커지면 주식 값도 쑥!"), "이익이 해마다 커지는 가게는 사람들이 갖고 싶어 해요. 그래서 주식 값도 오르기 쉬워요."],
    ] },
    { id: "g5", e: "📒", title: "회사 성적표, 재무제표", quiz: { q: "가게가 이익을 조각 주인에게 나눠 주는 돈은?", a: "🎁 배당", no: ["😓 적자", "🛒 매출"], why: "이익을 주주에게 나눠 주는 돈을 '배당'이라고 해요." }, scenes: [
      [pop(["📒", "📒", "📒"], "회사 성적표 = 재무제표"), "회사도 학교처럼 성적표를 받아요. 회사 성적표를 '재무제표'라고 불러요. 중요한 장이 세 장 있어요."],
      [bill("1장 · 손익계산서", [["🛒 1년 동안 판 돈", "100만 원"], ["💸 1년 동안 쓴 돈", "−80만 원", "down"]], ["😊 남은 돈 (이익)", "20만 원", "up"]), "첫 번째 장은 '손익계산서'예요. 1년 동안 얼마를 팔고, 얼마를 쓰고, 얼마가 남았는지 적어요."],
      [bs(false), "두 번째 장은 '재무상태표'예요. 가게가 가진 것이 모두 얼마인지, 그중 빌린 돈은 얼마고 진짜 내 돈은 얼마인지 적어요."],
      [bs(true), "가진 것은 빌린 돈과 내 돈을 더한 거예요. 빌린 돈이 너무 많은 가게는 갚기 힘들 수 있으니 조심해요."],
      [pop(["👛", "⬅️", "💵", "➡️", "🧾"], "3장 · 현금흐름표"), "세 번째 장은 '현금흐름표'예요. 진짜 지갑에 돈이 들어오고 나간 걸 적어요. 지갑이 텅 비면 가게 문을 열 수 없어요."],
      [pop(["😊", "🎁", "🧒"], "이익 나눠 주기 = 배당"), "이익이 남으면, 어떤 회사는 조각 주인들에게 돈을 조금씩 나눠 줘요. 이걸 '배당'이라고 해요."],
      [pop(["👨‍👩‍👧", "📒", "🔍"], "사기 전에 성적표 읽기"), "어른들은 주식을 사기 전에 이 성적표를 꼭 읽어 봐요. 증권 앱에서도 볼 수 있어요."],
    ] },
    { id: "g6", e: "📈", title: "차트 읽는 법", quiz: { q: "빨간 촛불 막대는 무슨 뜻일까?", a: "🔴 그날 값이 올랐어요", no: ["🔵 그날 값이 내렸어요", "🕯️ 정전이 됐어요"], why: "시작보다 끝 값이 높으면 빨강, 낮으면 파랑이에요." }, scenes: [
      [realLine(false), "차트는 값의 일기장이에요. 왼쪽은 옛날, 오른쪽은 오늘. 선이 올라가면 값이 오른 거예요. 이건 진짜 2020년 차트예요."],
      [realLine(true), "선이 뚝 떨어진 곳 보이죠? 2020년 3월, 모두가 무서웠던 때예요. 그 뒤로 다시 올라갔어요."],
      [periods, "3월의 한 주만 보면 뚝 떨어졌지만, 1년을 다 보면 올랐어요. 기간을 바꾸면 같은 주식도 다르게 보여요."],
      [candles(false), "증권 앱에는 촛불처럼 생긴 막대도 있어요. 빨간 막대는 그날 시작보다 끝 값이 높았던 날, 파란 막대는 낮았던 날이에요."],
      [candles(true), "아래 작은 막대는 '거래량'이에요. 그날 조각을 얼마나 많이 사고팔았는지 보여 줘요. 높을수록 바빴던 날이에요."],
      [pop(["📈", "🔮", "❓"], "차트 = 지나간 일기"), "하지만 차트는 지나간 일만 알려 줘요. 내일 값은 차트도 몰라요!"],
    ] },
    { id: "g7", e: "⚖️", title: "비싼 가게, 싼 가게", quiz: { q: "조각 1개가 2,000원, 조각이 10개면 가게 전체 값은?", a: "20,000원", no: ["2,000원", "12,000원"], why: "조각 값 × 조각 수 = 시가총액. 2,000 × 10 = 20,000원!" }, scenes: [
      [bill("가게 전체 값", [["🍕 조각 하나", "1,000원"], ["🔢 조각 수", "× 8개"]], ["🏪 시가총액", "8,000원", "up"]), "가게 전체 값은 조각 값에 조각 수를 곱하면 돼요. 천 원짜리 조각이 8개면 8천 원! 이걸 '시가총액'이라고 해요."],
      [pop(["🐜", "🆚", "🐘"], "조각 값 ≠ 가게 크기"), "조각 값이 비싸다고 큰 가게는 아니에요. 조각이 몇 개인지까지 곱해야 진짜 크기를 알 수 있어요."],
      [bill("몇 년 벌어야 가게 값이 될까?", [["🏪 가게 전체 값", "8,000원"], ["😊 1년 이익", "÷ 800원"]], ["🔢 PER", "10", "up"]), "가게 값이 1년 이익의 몇 배인지 재 볼까요? 8천 원 나누기 8백 원은 10. 이걸 'PER'이라고 해요. 이익으로 10년을 모아야 가게 값이 된다는 뜻이에요."],
      [bill("두 가게 비교", [["🍕 피자 가게 PER", "10"], ["🍦 아이스크림 가게 PER", "50", "up"]]), "PER이 높으면 이익에 비해 비싼 가게, 낮으면 이익에 비해 싼 가게예요."],
      [pop(["💻", "🚀", "✨"], "비싼 이유 = 기대"), "2020년 화상 수업 가게는 이익에 비해 아주 아주 비쌌어요. 사람들이 앞으로 크게 자랄 거라고 기대했거든요. 기대가 틀리면 값이 크게 내려갈 수도 있어요."],
    ] },
    { id: "g8", e: "🏦", title: "금리가 뭐야?", quiz: { q: "금리가 오르면 주식 값은 보통 어떻게 될까?", a: "▼ 내려가기 쉬워요", no: ["▲ 올라가기 쉬워요", "➖ 상관없어요"], why: "은행 이자가 많아지면 주식을 팔고 은행에 맡기는 사람이 늘어요." }, scenes: [
      [pop(["🐷", "➡️", "🏦", "🎀"], "맡긴 돈 + 이자"), "돈을 은행에 맡기면, 은행이 고맙다고 돈을 조금 더 줘요. 이걸 '이자'라고 해요."],
      [bill("은행에 1년 맡기면", [["💰 맡긴 돈", "10,000원"], ["🏦 금리 3%", "+300원", "up"]], ["🗓️ 1년 뒤", "10,300원", "up"]), "이자를 얼마나 줄지 정한 비율이 '금리'예요. 금리가 3%면, 만 원을 맡겼을 때 1년 뒤에 300원을 더 줘요."],
      [saw("🏦 금리 ▲", "📈 주식 ▼", 12), "금리가 오르면 '은행에만 둬도 괜찮네!' 하는 사람이 많아져요. 그래서 주식을 팔고 은행으로 가서, 주식 값이 내려가기 쉬워요."],
      [saw("🏦 금리 ▼", "📈 주식 ▲", -12), "금리가 내리면 반대예요. 은행 이자가 적으니까 사람들이 주식을 더 사서, 주식 값이 오르기 쉬워요."],
      [pop(["🏪", "💸", "😓"], "빌린 돈의 이자도 쑥"), "가게가 돈을 빌렸다면, 금리가 오를수록 갚을 이자도 많아져요. 그래서 가게가 힘들어져요."],
      [realLine(true), "2020년 3월, 미국은 힘든 가게들을 도우려고 금리를 거의 0까지 내렸어요. 그 뒤로 주식 값이 다시 올라갔어요."],
    ] },
    { id: "g9", e: "💱", title: "환율이 뭐야?", quiz: { q: "1달러가 1,200원에서 1,300원이 되면, 내 미국 주식은 원으로?", a: "▲ 더 커져요", no: ["▼ 더 작아져요", "➖ 그대로예요"], why: "주식 값이 그대로여도 달러가 비싸지면 원으로는 더 많아져요." }, scenes: [
      [exch("💵<small>달러</small>", "🪙<small>원</small>", "미국 돈 ⇄ 우리나라 돈"), "나라마다 쓰는 돈이 달라요. 미국은 '달러', 우리나라는 '원'을 써요."],
      [exch("💵<small>1달러</small>", "🪙<small>1,200원</small>", "이 바꾸는 값 = 환율"), "1달러를 원으로 바꾸면 얼마인지, 이 값을 '환율'이라고 해요. 꼬마 탐험가 여행에서는 1달러를 1,200원으로 정했어요."],
      [pop(["🪙", "➡️", "💵", "➡️", "📦"], "원 → 달러 → 미국 주식"), "택배 가게 같은 미국 회사 주식은 달러로 사요. 그래서 원을 달러로 바꿔서 사야 해요."],
      [bill("주식 값은 그대로인데…", [["📦 내 미국 주식", "100달러"], ["💱 1달러 = 1,200원", "12만 원"], ["💱 1달러 = 1,300원", "13만 원", "up"]]), "주식 값이 그대로여도, 1달러가 1,300원이 되면 원으로는 13만 원이 돼요! 환율도 내 돈을 바꿔요."],
      [pop(["🚢", "📦", "😊"], "환율 ▲ = 수출 회사 웃음"), "환율이 오르면 외국에 물건을 많이 파는 우리나라 회사는 좋아해요. 대신 외국에서 사 오는 물건은 비싸져요."],
      [pop(["😱", "💵", "📈"], "무서울 땐 달러 인기"), "2020년 3월, 모두가 무서웠을 때는 사람들이 달러를 갖고 싶어 해서, 1달러가 1,280원쯤까지 올랐어요."],
    ] },
    { id: "g10", e: "🍦", title: "물가와 저금통", quiz: { q: "물가가 오르면 저금통 돈으로 살 수 있는 건?", a: "▼ 줄어들어요", no: ["▲ 늘어나요", "➖ 똑같아요"], why: "물건 값이 오르면 같은 돈으로 살 수 있는 게 줄어요." }, scenes: [
      [bill("아이스크림 값 (예시)", [["🍦 몇 년 전", "1,000원"], ["🍦 지금", "1,300원", "up"]]), "몇 년 전에 천 원이던 아이스크림이 지금은 더 비싸졌어요. 물건 값을 '물가'라고 해요. 물가는 조금씩 올라요."],
      [pop(["🐷", "🪙", "🍦", "❌"], "천 원으로는 이제 못 사요"), "저금통 속 천 원은 그대로인데 아이스크림은 비싸졌어요. 그럼 천 원으로 살 수 있는 게 줄어들어요. 이걸 '인플레이션'이라고 해요."],
      [pop(["🌱", "🪙", "🌳"], "돈도 자라게 하기"), "그래서 어른들은 돈이 물가보다 조금이라도 더 자라도록, 은행 이자나 투자를 생각해요."],
      [pop(["🐷", "➕", "🌳"], "안전한 저금통 + 자라는 투자"), "하지만 투자는 줄어들 수도 있어요. 꼭 써야 할 돈은 저금통에, 오래 둘 돈은 투자에. 섞어서 쓰는 게 지혜예요."],
    ] },
    { id: "g11", e: "🧺", title: "똑똑한 투자 습관", quiz: { q: "가장 똑똑한 투자 습관은?", a: "🧺 여러 회사에 나눠 담기", no: ["🥚 한 회사에 몽땅 넣기", "🗣️ 친구 말만 듣고 사기"], why: "나눠 담으면 한 가게가 힘들어도 다른 가게가 버텨 줘요." }, scenes: [
      [pop(["🥚", "🥚", "🧺", "💥"], "한 바구니에 다 담으면?"), "달걀을 한 바구니에 다 담으면, 바구니가 떨어질 때 모두 깨져요. 여러 가게에 나눠 담는 걸 '분산 투자'라고 해요."],
      [pop(["🧺", "🍎", "📦", "🎬", "🚢"], "한 바구니에 여러 회사 = ETF"), "여러 회사를 한 번에 조금씩 담은 바구니도 있어요. 'ETF'나 '펀드'라고 해요. 차트에서 본 '큰 회사 500곳 모음'도 이런 바구니예요."],
      [pop(["🌱", "⏳", "🌳"], "오래 기다리기"), "좋은 회사는 나무처럼 천천히 자라요. 하루하루 값에 마음 졸이지 말고 오래 기다리는 게 중요해요."],
      [pop(["🔍", "🏪", "💡"], "내가 아는 회사"), "무엇을 파는지 내가 설명할 수 있는 회사를 골라요. 모르는 회사는 사지 않아요."],
      [pop(["🙅", "💳", "❌"], "빌린 돈으로 하지 않기"), "빌린 돈으로 투자하지 않아요. 없어져도 괜찮은 돈으로만 해요."],
      [pop(["👨‍👩‍👧", "🤝", "🦉"], "엄마·아빠와 함께"), "진짜 투자는 꼭 엄마 아빠랑 같이 정해요. 라우랑 약속!"],
    ] },
    // ----- 어른도 잘 모르는 투자 비밀 -----
    { id: "g12", e: "🤝", title: "주문은 어떻게 될까?", quiz: { q: "내가 정한 값에만 사는 주문은?", a: "🎯 지정가", no: ["🏃 시장가", "🎲 아무거나 주문"], why: "지정가는 내가 정한 값이 될 때까지 기다려요." }, scenes: [
      [pop(["🙋", "🤝", "🙋‍♂️"], "사는 사람 + 파는 사람"), "주식은 가게에서 사는 게 아니라, 조각을 팔고 싶은 다른 사람에게서 사요. 사는 사람과 파는 사람이 만나야 거래가 돼요."],
      [book(false), "증권 앱의 '호가창'에는 줄이 두 개 있어요. 위쪽 파란 줄은 '이 값에 팔래요', 아래쪽 빨간 줄은 '이 값에 살래요' 하는 사람들이에요."],
      [book(true), "파는 값과 사는 값이 딱 맞으면 거래가 돼요. 이걸 '체결'이라고 해요."],
      [bill("주문은 두 가지", [["🏃 시장가", "지금 바로 사기"], ["🎯 지정가", "정한 값에 사기"]]), "'시장가'는 지금 있는 값에 바로 사는 주문, '지정가'는 내가 정한 값이 될 때까지 기다리는 주문이에요."],
      [pop(["🏃", "💸", "😮"], "급하면 비싸게 살 수도"), "시장가는 빠르지만, 파는 사람이 적으면 생각보다 비싸게 살 수 있어요. 그래서 값을 정해서 주문하는 게 더 안전해요."],
    ] },
    { id: "g13", e: "🧾", title: "사고팔 때마다 조금씩", quiz: { q: "주식을 아주 자주 사고팔면?", a: "💸 수수료가 많이 쌓여요", no: ["🎁 선물을 받아요", "➖ 아무 일도 없어요"], why: "한 번은 조금이어도, 자주 하면 금방 쌓여요." }, scenes: [
      [pop(["📱", "🪙", "🏢"], "사고팔 때 = 수수료"), "주식을 사고팔 때마다 증권 회사에 돈을 조금씩 내요. 이걸 '수수료'라고 해요."],
      [pop(["🪙", "➡️", "🏛️", "🏫"], "나라에 내는 돈 = 세금"), "팔 때나 돈을 많이 벌었을 때는 나라에 '세금'도 내요. 나라는 그 돈으로 학교와 길을 만들어요."],
      [bill("하루에 10번 사고팔면 (예시)", [["🔁 한 번에 떼는 돈", "동전 0.05개"], ["✖️ 하루에 10번", "× 10"]], ["😓 하루에 사라진 돈", "동전 0.5개", "down"]), "한 번은 아주 조금이지만, 자주 사고팔면 금방 쌓여요. 하루에 열 번이면 동전 반 개가 사라져요."],
      [pop(["🐢", "🌳", "😊"], "자주 사고팔지 않기"), "그래서 자주 사고파는 사람보다, 잘 골라서 오래 들고 있는 사람이 새는 돈이 적어요."],
    ] },
    { id: "g14", e: "🍰", title: "반 토막의 비밀", quiz: { q: "50% 내린 주식이 제자리로 오려면 몇 % 올라야 할까?", a: "100%", no: ["50%", "10%"], why: "5개가 10개가 되려면 두 배, 100% 올라야 해요." }, scenes: [
      [bars([["처음", 10], ["반 토막", 5, "down"]], "동전 10개 → 5개"), "동전 10개가 반으로 줄어서 5개가 됐어요. 50% 내렸어요."],
      [bars([["반 토막", 5, "down"], ["50% 오르면", 7.5, "up"], ["처음", 10]], "50% 올라도 7.5개"), "그럼 다시 50% 오르면 10개가 될까요? 아니에요! 5개의 반은 2.5개라서 7.5개밖에 안 돼요."],
      [bars([["반 토막", 5, "down"], ["100% 오르면", 10, "up"]], "두 배가 돼야 제자리"), "제자리로 돌아오려면 두 배, 100%나 올라야 해요. 내려가기는 쉽고, 다시 올라오기는 어려워요."],
      [bill("2020년 배 여행 가게 (진짜 기록)", [["📉 1월 → 4월", `${ccl.drop}% 내렸어요`, "down"], ["🧗 다시 1월 값이 되려면", `${ccl.need}% 올라야 해요`, "up"]]), `2020년 배 여행 가게는 ${ccl.drop}%나 내렸어요. 다시 1월 값이 되려면 ${ccl.x}배가 되어야 해요. 그해에는 돌아오지 못했어요.`],
      [pop(["🛡️", "🧺", "🌳"], "크게 잃지 않는 게 먼저"), "그래서 투자를 잘하는 사람들은 '크게 벌기'보다 '크게 잃지 않기'를 먼저 생각해요. 나눠 담기가 그래서 중요해요."],
    ] },
    { id: "g15", e: "⛄", title: "눈덩이 복리", quiz: { q: "늘어난 돈이 또 자라는 걸 뭐라고 할까?", a: "⛄ 복리", no: ["🎁 배당", "💱 환율"], why: "이자에 또 이자가 붙는 걸 복리라고 해요." }, scenes: [
      [pop(["❄️", "➡️", "⛄"], "굴릴수록 커지는 눈덩이"), "눈덩이를 굴리면 처음엔 조금씩, 나중엔 아주 빨리 커져요. 돈도 그렇게 자랄 수 있어요."],
      [bill("해마다 10%씩 자라면 (예시)", [["🗓️ 1년 뒤", "10개 → 11개"], ["🗓️ 2년 뒤", "11개 → 12.1개"]], ["💡 늘어난 동전", "1개 → 1.1개", "up"]), "동전 10개가 1년에 10% 자라면 11개. 다음 해에는 11개의 10%인 1.1개가 늘어요. 늘어난 동전도 또 자라요. 이걸 '복리'라고 해요."],
      [bars([10, 11, 12.1, 13.3, 14.6, 16.1, 17.7, 19.5].map((v, i) => [`${i}년`, v, i ? "up" : ""]), "7년이면 거의 2배"), "이렇게 7년쯤 지나면 거의 두 배가 돼요. 오래 기다릴수록 눈덩이는 더 빨리 커져요."],
      [pop(["🧒", "⏳", "👵"], "일찍 시작할수록 유리"), "그래서 일찍 시작해서 오래 기다리는 사람이 유리해요. 시간이 제일 큰 친구예요."],
      [pop(["💳", "⛄", "😱"], "빚도 눈덩이처럼"), "조심! 빌린 돈의 이자도 눈덩이처럼 커져요. 그래서 빚은 빨리 갚는 게 좋아요."],
    ] },
    { id: "g16", e: "📅", title: "매달 조금씩 사기", quiz: { q: "값이 쌀 때 같은 동전으로 사면 조각은?", a: "▲ 더 많이 사요", no: ["▼ 더 적게 사요", "➖ 똑같아요"], why: "값이 싸면 같은 돈으로 조각을 더 많이 살 수 있어요." }, scenes: [
      [pop(["🤔", "📅", "❓"], "언제 사야 제일 쌀까?"), "'언제 사야 제일 쌀까?' 어른들도 맨날 고민해요. 하지만 그건 아무도 몰라요."],
      [pop(["📅", "🪙", "📅", "🪙", "📅", "🪙"], "매달 동전 1개씩"), "그래서 날짜를 정해 놓고 매달 조금씩 사는 방법이 있어요. 이걸 '적립식 투자'라고 해요."],
      [bill("같은 동전 1개로", [["📈 값이 비쌀 때", "조각 조금"], ["📉 값이 쌀 때", "조각 많이", "up"]]), "같은 동전 1개로, 값이 비쌀 땐 조각을 조금, 쌀 땐 많이 사게 돼요. 저절로 싼 조각을 더 많이 모아요."],
      [bars([["1월에 한꺼번에", dca.lump, dca.lump >= dca.month ? "up" : ""], ["매달 1개씩", dca.month, dca.month > dca.lump ? "up" : ""]], "2020년 · 동전 12개"), `2020년에 동전 12개를 1월에 한꺼번에 넣었다면 연말에 ${c1(dca.lump)}개, 매달 1개씩 넣었다면 ${c1(dca.month)}개가 됐어요. 무서운 3월에도 꾸준히 산 덕분이에요.`],
      [pop(["😌", "📅", "🌳"], "마음이 편한 방법"), "해마다 결과는 다를 수 있어요. 그래도 매달 꾸준히 사면 언제 살지 고민하지 않아도 돼서 마음이 편해요."],
    ] },
    { id: "g17", e: "🔪", title: "조각을 더 잘게 자르면?", quiz: { q: "조각을 4개로 잘게 자르면 내 것 전체 값은?", a: "➖ 그대로예요", no: ["▲ 4배가 돼요", "▼ 4분의 1이 돼요"], why: "조각 수만 늘고, 피자 크기는 그대로예요." }, scenes: [
      [cut, "피자를 4조각에서 16조각으로 더 잘게 잘랐어요. 피자 크기는 그대로예요."],
      [bill("액면분할", [["🍕 큰 조각 1개", "4,000원"], ["🔪 4개로 자르면", "1,000원 × 4개"]], ["🍕 내 것 전체", "그대로 4,000원"]), "주식도 조각을 더 잘게 자를 수 있어요. 이걸 '액면분할'이라고 해요. 조각 값은 싸지지만 내 것 전체 값은 그대로예요."],
      [pop(["🍎", "🔪", "🍎", "🍎", "🍎", "🍎"], "2020년 8월 · 애플 4대1 분할"), "2020년 8월, 애플은 조각 하나를 네 개로 나눴어요. 500달러쯤 하던 조각이 125달러쯤 하는 조각 4개가 됐어요."],
      [pop(["🏪", "🔔", "🎉"], "시장에 처음 조각 내놓기 = 상장"), "가게가 처음으로 주식 시장에 조각을 내놓는 걸 '상장'이라고 해요. 화상 수업 가게는 2019년에 상장했어요."],
      [pop(["👀", "🏷️", "🤔"], "싸 보이는 것 ≠ 싼 것"), "조각 값이 싸 보인다고 가게가 싼 건 아니에요. 조각 수까지 곱한 가게 전체 값을 봐야 해요."],
    ] },
    { id: "g18", e: "🧠", title: "마음의 함정", quiz: { q: "'이 주식은 무조건 올라!'라는 말을 들으면?", a: "🚫 믿지 않아요", no: ["🏃 바로 따라 사요", "💳 돈을 빌려서 사요"], why: "내일 값은 아무도 몰라요. '무조건'이라는 말은 조심해요." }, scenes: [
      [pop(["😢", "⚖️", "😊"], "잃은 슬픔이 더 커요"), "만 원을 잃은 슬픔은 만 원을 얻은 기쁨보다 두 배쯤 크게 느껴진대요. 그래서 사람들은 잃는 걸 아주 싫어해요."],
      [pop(["📉", "😤", "🔒"], "'본전 오면 팔래!'"), "그래서 값이 내리면 '본전이 될 때까지 절대 안 팔래!' 하고 버티다가, 더 크게 잃기도 해요."],
      [pop(["🏃", "🏃‍♀️", "🏃‍♂️", "😰"], "남들 따라 사기"), "친구들이 다 산다고 급하게 따라 사면, 이미 많이 오른 비싼 값에 사기 쉬워요."],
      [pop(["📱", "🗣️", "🚫"], "'무조건 오른대!' = 조심"), "'이건 무조건 오른다'는 말은 믿지 않아요. 내일 값은 아무도 모르니까요. 그런 말을 하는 사람을 조심해요."],
      [bill("팔기 전에는 아직 숫자", [["📊 평가손익", "지금 값으로 계산"], ["✅ 실현손익", "진짜 팔아서 생김", "up"]]), "팔기 전에 앱에 보이는 이익이나 손해는 아직 숫자일 뿐이에요. 이걸 '평가손익'이라고 해요. 팔아야 진짜, '실현손익'이 돼요."],
      [pop(["📝", "🤔", "🙂"], "사기 전에 이유 한 줄"), "사기 전에 '왜 사는지' 한 줄 적어 봐요. 마음이 흔들릴 때 그 이유를 다시 읽으면 도움이 돼요."],
    ] },
    { id: "g19", e: "🕘", title: "주식 시장의 규칙", quiz: { q: "우리나라 주식이 하루에 오를 수 있는 가장 높은 값은?", a: "🔺 상한가", no: ["🔻 하한가", "🎈 풍선가"], why: "하루에 30%까지 오를 수 있고, 그 끝 값을 상한가라고 해요." }, scenes: [
      [pop(["🕘", "🏛️", "🕞"], "평일 아침 9시 ~ 오후 3시 반"), "우리나라 주식 시장은 보통 평일 아침 9시에 열고 오후 3시 반에 닫아요. 주말과 공휴일에는 쉬어요."],
      [pop(["🌙", "🗽", "📈"], "미국 시장은 우리 밤에"), "미국 시장은 지구 반대편에 있어서, 우리나라가 밤일 때 열려요."],
      [bill("하루에 움직일 수 있는 끝 (우리나라)", [["🔺 상한가", "+30%까지", "up"], ["🔻 하한가", "−30%까지", "down"]]), "우리나라 주식은 하루에 30%보다 더 오르거나 내릴 수 없어요. 가장 높은 값을 '상한가', 가장 낮은 값을 '하한가'라고 해요."],
      [bill("우리 반 평균 점수처럼", [["🧒 지우", "90점"], ["👧 하린", "70점"], ["👦 도윤", "80점"]], ["📊 반 평균", "80점", "up"]), "'지수'는 반 평균 점수 같은 거예요. 많은 회사의 값을 모아서, 시장 전체가 올랐는지 내렸는지 알려 줘요."],
      [realLine(false), "우리나라 대표 지수는 '코스피', 미국은 'S&P 500'이에요. 꼬마 탐험가에서 본 '큰 회사 500곳 모음'이 바로 S&P 500이에요."],
    ] },
  ];
  const SCHOOL = 11; // GUIDES[3..10] = 투자 학교, [11..] = 어른도 잘 모르는 투자 비밀
  const gIdx = (id) => GUIDES.findIndex((g) => g.id === id);

  // 투자 말 사전: [말, 그림, 뜻, 영상]
  const WORDS = [
    ["주식", "🍕", "회사를 잘게 나눈 조각", "g1"], ["주주", "👑", "주식을 가진 작은 주인", "g1"],
    ["매수 · 매도", "🔴", "사기 · 팔기 (증권 앱 버튼)", "g3"], ["증권 앱", "📱", "주식을 사고파는 앱", "g3"],
    ["매출", "🛒", "물건을 팔아서 받은 돈", "g4"], ["비용", "💸", "장사하느라 쓴 돈", "g4"],
    ["이익", "😊", "판 돈에서 쓴 돈을 빼고 남은 돈", "g4"], ["적자", "😓", "쓴 돈이 더 많아서 손해 본 것", "g4"],
    ["재무제표", "📒", "회사의 성적표", "g5"], ["손익계산서", "🧾", "1년 동안 벌고, 쓰고, 남은 돈", "g5"],
    ["재무상태표", "⚖️", "가진 것 = 빌린 돈 + 내 돈", "g5"], ["현금흐름표", "👛", "진짜 지갑에 들어오고 나간 돈", "g5"],
    ["배당", "🎁", "이익을 주주에게 나눠 주는 돈", "g5"], ["차트", "📈", "값의 일기장", "g6"],
    ["캔들 (봉)", "🕯️", "빨강은 오른 날, 파랑은 내린 날", "g6"], ["거래량", "📊", "그날 사고판 조각 수", "g6"],
    ["시가총액", "🏪", "조각 값 × 조각 수 = 회사 전체 값", "g7"], ["PER", "🔢", "회사 값이 1년 이익의 몇 배인지", "g7"],
    ["이자", "🎀", "돈을 맡기면 은행이 더 주는 돈", "g8"], ["금리", "🏦", "이자를 얼마나 줄지 정한 비율", "g8"],
    ["환율", "💱", "다른 나라 돈과 바꾸는 값", "g9"], ["달러", "💵", "미국 돈", "g9"],
    ["물가", "🍦", "물건 값", "g10"], ["인플레이션", "🎈", "물가가 올라 돈의 힘이 줄어드는 것", "g10"],
    ["분산 투자", "🧺", "여러 바구니에 나눠 담기", "g11"], ["ETF · 펀드", "🧺", "여러 회사를 한 번에 담은 바구니", "g11"],
    ["장기 투자", "🌳", "오래 기다리기", "g11"],
    ["호가창", "📋", "'살래요 · 팔래요' 줄이 보이는 표", "g12"], ["시장가 · 지정가", "🎯", "지금 바로 사기 · 정한 값에 사기", "g12"],
    ["체결", "🤝", "사는 값과 파는 값이 만나 거래가 된 것", "g12"], ["수수료", "🧾", "사고팔 때 증권 회사에 내는 돈", "g13"],
    ["세금", "🏛️", "나라에 내는 돈", "g13"], ["반 토막", "🍰", "50% 내리면 100% 올라야 제자리", "g14"],
    ["복리", "⛄", "늘어난 돈이 또 자라는 것", "g15"], ["적립식 투자", "📅", "매달 조금씩 사기", "g16"],
    ["액면분할", "🔪", "조각을 더 잘게 자르기 (전체 값은 그대로)", "g17"], ["상장", "🔔", "가게가 시장에 조각을 처음 내놓는 것", "g17"],
    ["평가손익", "📊", "팔기 전, 지금 값으로 계산한 이익·손해", "g18"], ["실현손익", "✅", "진짜 팔아서 생긴 이익·손해", "g18"],
    ["밸류에이션", "✖️", "가게 실력에 비해 값을 얼마로 쳐주는지", "g7"], ["인덱스", "🧺", "정한 방법으로 여러 회사를 모아 잰 것 (예: S&P 500)", "g19"],
    ["상한가 · 하한가", "🔺", "하루에 오르내릴 수 있는 끝 (우리나라 ±30%)", "g19"], ["지수", "📊", "시장 전체의 평균 점수 (코스피, S&P 500)", "g19"],
  ];

  // 영상 본 기록 (여행을 처음부터 해도 남아요): { g4: "seen" | "quiz" }
  const LKEY = "raum-kid-learn";
  let L = (() => { try { return JSON.parse(localStorage.getItem(LKEY)) || {}; } catch { return {}; } })();
  const saveL = () => localStorage.setItem(LKEY, JSON.stringify(L));
  let view = "home"; // 첫 화면: home | words

  // ---------- 2020년 여행 대본 ----------
  // 단계: say(줄 목록) · travel(날짜) · news · predict · trade
  const sinceMark = (sym) => ratio(sym, S.mark, S.di);
  const STOPS = [
    { em: "⛄", title: "1월 · 평범한 겨울", seq: [
      { travel: "2020-01-02" },
      { say: ["타임머신 도착! 여기는 2020년 1월이에요.", "가게 다섯 곳이 있어요. 모두 진짜 있는 회사예요.", "가게 그림을 누르면 무슨 가게인지 알려 줄게요.", "동전 10개를 가게에 놓아 볼까요? '사기'를 누르면 그 가게 조각을 사요."], mood: "happy" },
      { trade: "마음에 드는 가게에서 '사기'를 눌러요. 여러 가게에 나눠 사도 돼요!", need: 1, parent: "이 가게를 고른 이유가 뭐야?", first: true },
    ] },
    { em: "🦠", title: "1월 말 · 이상한 뉴스", seq: [
      { travel: "2020-01-23" },
      { news: { e: "🦠", t: "먼 나라 도시에 병이 퍼졌어요", b: "중국 우한이라는 큰 도시에 처음 보는 병이 퍼졌어요. 그래서 도시의 문을 닫았대요." } },
      { predict: { key: "virus", q: "이 뉴스를 들은 사람들은 어떻게 할까?", opts: ["🏠 집에 더 있을래", "✈️ 그래도 여행 갈래", "🤷 잘 모르겠어"] } },
      { say: ["좋은 생각이에요! 정답은 아직 아무도 몰라요.", "시간을 보내서 어떻게 됐는지 볼까요?"], mood: "ok" },
    ] },
    { em: "😱", title: "3월 · 무서운 봄", seq: [
      { travel: "2020-03-16", mark: true },
      { say: [
        "병이 전 세계로 퍼졌어요. 학교도 문을 닫았어요.",
        "사람들이 너무 무서워서 주식을 마구 팔았어요. 그래서 값이 뚝 떨어졌어요.",
        () => `시장 기분은 ${mood()[0]} ${mood()[1]}! 2020년에서 가장 무서운 날이에요.`,
        () => `배 여행 가게는 1월보다 ${moved(ratio("CCL", START, S.di))}. 그런데 화상 수업 가게는 ${moved(ratio("ZM", START, S.di))}!`,
        () => `내 동전 10개는 지금 ${c1(total())}개가 됐어요.`,
      ], mood: "scared" },
      { predict: { key: "fear", q: "무서울 때, 너라면 어떻게 할래?", opts: ["🙈 다 팔고 저금통에 넣을래", "🧘 그냥 기다릴래", "🛒 싸졌으니 더 살래"] } },
      { trade: "바꾸고 싶으면 사고팔고, 아니면 그대로 둬요. 둘 다 괜찮아요.", parent: "값이 떨어졌을 때 기분이 어땠어? 가게가 하는 일도 달라졌을까?" },
    ] },
    { em: "🏠", title: "6월 · 집에 있는 여름", seq: [
      { travel: "2020-06-08", mark: true },
      { say: [
        "석 달이 지났어요. 친구들은 집에서 컴퓨터로 수업을 들었어요.",
        () => `그래서 화상 수업 가게에 손님이 엄청 많아졌어요. 1월보다 ${moved(ratio("ZM", START, S.di))}!`,
        () => `무서웠던 3월보다 택배 가게는 ${moved(ratio("AMZN", near("2020-03-16"), S.di))}. 사람들이 다시 용기를 냈어요.`,
        "미국은 3월에 금리를 거의 0까지 내렸어요. 은행 이자가 적어지자 사람들이 다시 주식을 샀어요.",
        () => `내 동전은 지금 ${c1(total())}개예요.`,
      ], mood: "happy" },
      { trade: "가게를 바꿔 볼까요? 그대로 둬도 돼요.", parent: "집에만 있을 때 우리 가족은 뭘 많이 했지? 그건 어느 회사 거였을까?" },
    ] },
    { em: "💉", title: "11월 · 큰 뉴스가 온 날", seq: [
      { travel: "2020-11-06", mark: true },
      { say: ["가을이 됐어요. 아직도 병 때문에 여행을 마음껏 못 가요.", () => `화상 수업 가게는 1월보다 ${moved(ratio("ZM", START, S.di))}. 배 여행 가게는 ${moved(ratio("CCL", START, S.di))}.`], mood: "ok" },
      { news: { e: "💉", t: "병을 막는 백신이 거의 다 만들어졌어요!", b: "과학자들이 만든 백신이 병을 아주 잘 막는대요. 이제 곧 여행도 갈 수 있을지 몰라요." } },
      { predict: { key: "vaccine", q: "이 뉴스는 어느 가게의 장사를 바꿀 것 같아?", opts: ["🚢✈️ 여행 가게들", "💻 화상 수업 가게", "🔀 둘 다", "🤷 아직 모르겠어"] } },
      { travel: "2020-11-09", mark: true },
      { say: [
        () => `다음 거래하는 날, 배 여행 가게는 ${moved(sinceMark("CCL"))}. 비행기 가게는 ${moved(sinceMark("AAL"))}. 화상 수업 가게는 ${moved(sinceMark("ZM"))}.`,
        "같은 뉴스인데 가게마다 값이 다르게 움직였어요. 사람들이 앞으로의 장사를 다르게 생각한 것으로 볼 수 있어요.",
        "이렇게 크게 움직이는 날은 미리 알기 어려워요. 하루 움직임만 보고는 좋은 가게인지도 알 수 없어요.",
      ], mood: "happy", from: "2020-11-06" },
      { trade: "마지막으로 가게를 바꿀 수 있어요!", parent: "백신 뉴스가 왜 화상 수업 가게에는 슬픈 소식이었을까?" },
    ] },
    { em: "🎆", title: "12월 · 여행 끝!", seq: [
      { travel: "2020-12-31" },
      { say: ["2020년의 마지막 날이에요. 여행이 끝났어요!", () => `내 동전 10개는… ${c1(total())}개가 됐어요!`], mood: "proud" },
      { end: true },
    ] },
  ];

  // ---------- 겪어 보기 체험 (kid-lab.js) ----------
  const LAB = window.RAUM_KID_LAB({
    $, c1,
    say: (text) => { cancelTalk(); SP.say(text); },
    done: (id) => { L[id] = "seen"; saveL(); },
    seen: (id) => !!L[id],
    show: () => { cancelTalk(); view = "lab"; S.phase = "intro"; save(); render(); scrollTo(0, 0); },
  });

  // ---------- 그리기 ----------
  function renderTop() {
    const inTrip = S.phase === "trip" || S.phase === "end";
    const [m] = mood();
    $("#top").innerHTML = `
      <a class="iconbtn" href="index.html" aria-label="라움스톡 처음 화면">🏠</a>
      ${inTrip ? `<span class="chip cal" id="cal">📅 ${dateKo().replace("2020년 ", "")}</span><span class="chip" title="시장 기분">${m}</span>` : `<span class="chip">🧒 꼬마 탐험가</span>`}
      <span class="sp"></span>
      ${inTrip ? `<span class="chip">🪙 ${c1(total())}</span>` : ""}
      ${SP.supported ? `<button class="iconbtn ${SP.on ? "" : "off"}" data-act="sound" aria-label="소리 ${SP.on ? "끄기" : "켜기"}">${SP.on ? "🔊" : "🔇"}</button>` : ""}`;
  }

  function spark(sym) {
    const a = Math.max(0, START - 60), b = S.di, n = 40, ys = [];
    for (let i = 0; i <= n; i++) ys.push(px(sym, Math.round(a + (b - a) * i / n)));
    const lo = Math.min(...ys, px(sym, START)), hi = Math.max(...ys, px(sym, START)), r = hi - lo || 1;
    const base = px(sym, START), up = ys.at(-1) >= base, by = (24 - (base - lo) / r * 22).toFixed(1), sx = ((START - a) / (b - a) * 100).toFixed(1);
    return `<svg class="spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="100" y1="${by}" y2="${by}" stroke="#c8d3e6" stroke-dasharray="3 3"/><line x1="${sx}" x2="${sx}" y1="0" y2="26" stroke="#ffc83d" stroke-width="1.5"/><polyline fill="none" stroke="${up ? "#e5383b" : "#2f6fe4"}" stroke-width="2.5" stroke-linejoin="round" points="${ys.map((y, i) => `${(i / n * 100).toFixed(1)},${(24 - (y - lo) / r * 22).toFixed(1)}`).join(" ")}"/></svg>`;
  }

  let canTrade = false;
  function renderTrip() {
    const st = STOPS[S.stop] || STOPS.at(-1);
    const rows = SHOPS.map((s) => {
      const r = ratio(s.sym, START, S.di), v = val(s.sym);
      const cls = r >= 1 ? "up" : "down";
      return `<div class="shop" data-shop="${s.sym}">
        <button class="em" data-act="what" data-sym="${s.sym}" aria-label="${s.kid} 설명 듣기">${s.e}</button>
        <div><div class="nm">${s.kid}</div><div class="rl">${s.real} · ${s.sym}</div>
          <div class="px"><span>조각 ${won(s.sym).toLocaleString("ko-KR")}원</span><b class="${cls}">${r >= 1 ? "▲" : "▼"} ${Math.abs(Math.round((r - 1) * 100))}%</b></div>${spark(s.sym)}</div>
        <div class="mine"><b>🪙 ${v > 0.005 ? c1(v) : 0}</b>
          <div class="btns"><button class="buy" data-act="buy" data-sym="${s.sym}" ${canTrade && S.cash > 0.005 ? "" : "disabled"}>사기</button><button class="sell" data-act="sell" data-sym="${s.sym}" ${canTrade && v > 0.005 ? "" : "disabled"}>팔기</button></div></div>
      </div>`;
    }).join("");
    const left = Math.max(0, S.cash);
    $("#main").innerHTML = `
      <div class="banner"><span class="em">${st.em}</span><div><b>${st.title}</b><small>▲▼는 1월 2일보다 바뀐 만큼 · 노란 선이 1월 2일</small></div></div>
      <div class="shops">${rows}</div>
      <div class="piggy"><span class="em">🐷</span><div><b>저금통 🪙 ${c1(left)}</b><br><small class="muted">아직 안 쓴 동전이에요. 저금통 동전은 늘지도 줄지도 않아요.</small></div></div>
      <p class="note">값은 2020년 진짜 기록이에요 (1달러 = 1,200원). 조각은 소수점까지 살 수 있다고 생각해요. 교육용 연습이에요.</p>`;
  }

  const tile = (g, i) => `<button class="tile ${L[g.id] ? "done" : ""}" data-act="guide" data-i="${i}"><span>${g.e}</span><b>${i + 1}편${L[g.id] === "quiz" ? " · 퀴즈 ⭐" : ""}</b>${g.title}${L[g.id] ? "<i>✅</i>" : ""}</button>`;
  function renderIntro() {
    if (view === "words") return renderWords();
    if (view === "lab") return LAB.render();
    const going = S.stop > 0 || S.step > 1;
    const stars = GUIDES.filter((g) => L[g.id] === "quiz").length;
    $("#main").innerHTML = `
      <div class="hero">${ART.owl("happy")}<h1>꼬마 탐험가</h1><p>부엉이 라우와 타임머신 타고<br>진짜 주식 여행을 떠나요</p></div>
      <div class="menu">
        <button class="big main" data-act="all"><span>▶️</span><div>영상 보고 여행 가기<small>처음이라면 여기부터! 약 3분 영상 + 여행</small></div></button>
        <button class="big go" data-act="trip"><span>🚀</span><div>${going ? "여행 이어 하기" : "바로 2020년 여행 떠나기"}<small>${going ? `${STOPS[Math.min(S.stop, STOPS.length - 1)].title}부터` : "동전 10개 · 가게 5곳 · 진짜 값"}</small></div></button>
        ${going ? `<button class="big" data-act="restart"><span>🔄</span><div>여행 처음부터<small>동전 10개로 다시 시작</small></div></button>` : ""}
      </div>
      <h2 class="sec">🔍 겪어 보기 <small>진짜 기록으로 한 걸음씩</small></h2>
      ${LAB.buttons()}
      <h2 class="sec">📺 처음 3편 <small>주식 · 값 · 증권 앱</small></h2>
      <div class="tiles">${GUIDES.slice(0, BASIC).map((g, i) => tile(g, i)).join("")}</div>
      <h2 class="sec" id="school">🏫 라우의 투자 학교 <small>⭐ 퀴즈 ${stars}/${GUIDES.length}</small></h2>
      <p class="muted" style="margin:0 4px 10px;font-size:.9rem">이익 · 재무제표 · 차트 · 시가총액 · 금리 · 환율 · 물가 · 투자 습관. 한 편씩 보고 퀴즈를 풀어요.</p>
      <div class="tiles">${GUIDES.slice(BASIC, SCHOOL).map((g, i) => tile(g, i + BASIC)).join("")}</div>
      <h2 class="sec">🔐 어른도 잘 모르는 투자 비밀</h2>
      <p class="muted" style="margin:0 4px 10px;font-size:.9rem">주문 · 수수료 · 반 토막 · 복리 · 매달 사기 · 분할 · 마음의 함정 · 시장 규칙. 엄마·아빠도 같이 봐요!</p>
      <div class="tiles">${GUIDES.slice(SCHOOL).map((g, i) => tile(g, i + SCHOOL)).join("")}</div>
      <div class="menu"><button class="big" data-act="words"><span>📖</span><div>투자 말 사전<small>${WORDS.length}개 낱말 · 누르면 라우가 읽어 줘요</small></div></button></div>
      <p class="note">${SP.supported ? "🔊 소리를 켜면 라우가 읽어 줘요." : "이 브라우저는 소리 읽기를 지원하지 않아요. 엄마·아빠가 읽어 주세요."}<br>교육용 시뮬레이션이에요. 투자 권유가 아니에요.</p>`;
  }

  function renderWords() {
    $("#main").innerHTML = `
      <div class="banner"><span class="em">📖</span><div><b>투자 말 사전</b><small>낱말을 누르면 읽어 줘요 · 📺는 그 영상 보기</small></div></div>
      <div class="words">${WORDS.map(([w, e, m, g], i) => `<div class="word"><button data-act="word" data-i="${i}"><span>${e}</span><div><b>${w}</b><small>${m}</small></div></button><button class="iconbtn" data-act="guide" data-i="${gIdx(g)}" aria-label="${GUIDES[gIdx(g)].title} 영상 보기">📺</button></div>`).join("")}</div>
      <div class="menu"><button class="big" data-act="home"><span>⬅️</span><div>처음 화면으로</div></button></div>`;
  }

  function render() {
    renderTop();
    if (S.phase === "intro") { renderIntro(); bubble(""); }
    else if (S.phase === "trip") renderTrip();
    else if (S.phase === "end") renderEnd();
  }

  // ---------- 말풍선 ----------
  function bubble(html, m = "ok", talk = false) {
    const box = $("#bubble .in");
    if (!html) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="bub">${ART.owl(m).replace('class="art owl', `class="art owl${talk ? " talk" : ""}`)}<div class="say">${html}</div></div>`;
  }

  // ---------- 여행 진행 ----------
  const step = () => STOPS[S.stop]?.seq[S.step];
  function next() { S.step++; if (S.step >= STOPS[S.stop].seq.length) { S.stop++; S.step = 0; } save(); run(); }

  function run() {
    const st = step();
    canTrade = false;
    if (!st) return;
    if (st.travel) return travel(st, next);
    render();
    if (st.say) return sayLines(st, next);
    if (st.news) return showNews(st.news, next);
    if (st.predict) return showPredict(st.predict, next);
    if (st.trade) return showTrade(st, next);
    if (st.end) { S.phase = "end"; save(); cancelTalk(); bubble(""); return render(); }
  }

  function sayLines(st, done) {
    const lines = st.say.map((l) => (typeof l === "function" ? l() : l));
    let i = 0;
    const show = () => {
      if (i >= lines.length) return done();
      const line = lines[i];
      bubble(`${line}<div class="row"><button class="pill ghost" data-act="skip">다음 ▶</button></div>`, st.mood, true);
      skipFn = () => { i++; show(); };
      speakThen(line, () => { i++; show(); });
    };
    show();
  }
  let skipFn = null;

  function travel(st, done) {
    const to = near(st.travel), from = S.di;
    if (st.mark) S.mark = from;
    cancelTalk();
    if (to <= from || reduce) { S.di = Math.max(to, S.di); render(); return done(); }
    const days = to - from, dur = Math.min(4200, 900 + days * 28);
    canTrade = false;
    const fx = document.createElement("div"); fx.className = "travel"; fx.innerHTML = "<span>🕰️</span>";
    document.body.append(fx);
    bubble(`🕰️ 슝~ 시간 여행 중!<br><b>${dateKo(to)}</b>로 가요`, "happy", false);
    SP.say("슝, 시간 여행!");
    ding(true);
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      S.di = Math.round(from + days * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
      render();
      if (k < 1) requestAnimationFrame(tick);
      else { S.di = to; fx.remove(); save(); render(); done(); }
    };
    requestAnimationFrame(tick);
  }

  function showNews(n, done) {
    cancelTalk();
    const ov = $("#overlay");
    ov.hidden = false;
    ov.innerHTML = `<div class="newscard" role="dialog" aria-label="뉴스"><span class="em">${n.e}</span><span class="tag">📢 속보</span><h2>${n.t}</h2><p>${n.b}</p><button class="pill" data-act="newsok">알겠어요!</button></div>`;
    newsDone = () => { cancelTalk(); ov.hidden = true; ov.innerHTML = ""; done(); };
    bubble("", "ok");
    SP.say(`속보! ${n.t} ${n.b}`);
  }
  let newsDone = null;

  function showPredict(p, done) {
    bubble(`<b>${p.q}</b><div class="opts">${p.opts.map((o, i) => `<button data-act="pred" data-i="${i}">${o}</button>`).join("")}</div>`, "ok", false);
    speakThen(`${p.q} ${p.opts.join(". ")}`, null);
    predDone = (i) => { cancelTalk(); S.preds[p.key] = i; ding(true); save(); done(); };
  }
  let predDone = null;

  // 이유는 맞고 틀림이 없어요. 생각하고, 나중에 다시 보는 것이 목표예요.
  const FIRST_WHY = ["🏪 무엇을 파는지 알아서", "💰 앞으로 돈을 잘 벌 것 같아서", "🧺 여러 가게에 나눠 담으려고", "📈 값이 오를 것 같아서"];
  const CHANGE_WHY = ["🏪 가게의 장사가 달라진 것 같아서", "📈 값이 올라서", "📉 값이 내려서", "🧺 나눠 담으려고"];
  const CHECK = ["👍 아직 맞는 것 같아", "🤔 달라진 것 같아", "🤷 잘 모르겠어"];
  const changed = (from) => SHOPS.some((s) => Math.abs((S.sh[s.sym] || 0) - (from[s.sym] || 0)) * px(s.sym) * KRW / COIN > 0.01);

  function ask(q, opts, done) {
    canTrade = false;
    tradeRedraw = null;
    renderTrip();
    bubble(`<b>${q}</b><div class="opts">${opts.map((o, i) => `<button data-act="pred" data-i="${i}">${o}</button>`).join("")}</div>`, "ok", false);
    speakThen(`${q} ${opts.join(". ")}`, null);
    predDone = (i) => { cancelTalk(); predDone = null; done(i); };
  }

  function showTrade(st, done) {
    canTrade = true;
    S.tradeFrom ||= { ...S.sh }; // 새로고침해도 이 단계에서 바꿨는지 알 수 있게 저장
    save();
    renderTrip();
    const draw = () => {
      const ok = !st.need || invested() >= st.need - 0.001;
      const label = st.first ? (ok ? "다 골랐어요 ▶" : "먼저 '사기'를 한 번 눌러요") : changed(S.tradeFrom) ? "다 바꿨어요 ▶" : "🧘 그대로 두고 다음으로 ▶";
      bubble(`${st.trade}${st.parent ? `<div class="parent">👨‍👩‍👧 엄마·아빠랑 이야기해요<br>"${st.parent}"</div>` : ""}<div class="row"><button class="pill" data-act="tradeok" ${ok ? "" : "disabled"}>${label}</button></div>`, "ok", false);
    };
    draw();
    tradeRedraw = draw;
    speakThen(st.trade + (st.parent ? ` 엄마 아빠랑 이야기해요. ${st.parent}` : ""), null);
    tradeDone = () => {
      cancelTalk();
      tradeDone = null;
      const didChange = changed(S.tradeFrom);
      const finish = () => {
        if (st.first) { S.sh0 = { ...S.sh }; S.cash0 = S.cash; }
        if (SHOPS.filter((s) => val(s.sym) > 0.05).length >= 3) S.flags.spread = true;
        S.tradeFrom = null;
        save(); done();
      };
      if (st.first) return ask("이 가게를 고른 가장 큰 이유는 뭐야?", FIRST_WHY, (i) => { S.why = i; finish(); });
      const entry = { stop: S.stop, change: null, check: null };
      const recheck = () => {
        const end = () => { S.log = [...S.log.filter((x) => x.stop !== entry.stop), entry]; finish(); };
        if (S.why === null) return end();
        ask(`처음 이유는 "${FIRST_WHY[S.why]}"였어. 지금도 맞을까?`, CHECK, (i) => { entry.check = i; end(); });
      };
      if (didChange) return ask("왜 바꿨어?", CHANGE_WHY, (i) => { entry.change = i; recheck(); });
      recheck();
    };
  }
  let tradeDone = null, tradeRedraw = null;

  function trade(sym, buy) {
    const p = px(sym) * KRW;
    if (buy) {
      const amt = Math.min(1, S.cash);
      if (amt < 0.005) return;
      S.sh[sym] = (S.sh[sym] || 0) + amt * COIN / p; S.cash -= amt;
    } else {
      const v = val(sym), amt = Math.min(1, v);
      if (amt < 0.005) return;
      S.sh[sym] -= amt * COIN / p; S.cash += amt;
      if (val(sym) < 0.01) { S.cash += val(sym); S.sh[sym] = 0; }
    }
    if (S.cash < 0.0001) S.cash = 0;
    ding(buy);
    save(); renderTop(); renderTrip();
    $(`[data-shop="${sym}"]`)?.classList.add("pop");
    tradeRedraw?.();
  }

  // ---------- 결과 ----------
  function renderEnd() {
    const end = S.di, tot = total(end);
    const keep = S.sh0 ? S.cash0 + SHOPS.reduce((a, s) => a + (S.sh0[s.sym] || 0) * px(s.sym, end) * KRW / COIN, 0) : 10;
    const year = SHOPS.map((s) => ({ s, r: ratio(s.sym, START, end) })).sort((a, b) => b.r - a.r);
    // 스티커는 맞혔는지, 벌었는지가 아니라 '어떻게 했는지'에 줘요
    const stickers = [
      ["📝", "이유 생각하기", S.why !== null],
      ["🔁", "이유 다시 보기", S.log.some((x) => x.check !== null)],
      ["🧺", "나눠 담기", !!S.flags.spread],
      ["🏁", "끝까지 살펴보기", true],
    ];
    const thoughts = [
      ...(S.why === null ? [] : [["1월에 고른 이유", FIRST_WHY[S.why]]]),
      ...S.log.map((x) => [STOPS[x.stop].title, [x.change === null ? "🧘 그대로 뒀어" : `🔄 바꾼 이유: ${CHANGE_WHY[x.change]}`, x.check === null ? "" : `처음 이유는? ${CHECK[x.check]}`].filter(Boolean).join("<br>")]),
    ];
    $("#main").innerHTML = `
      <div class="banner"><span class="em">🎆</span><div><b>2020년 여행 끝!</b><small>진짜 2020년 값으로 계산했어요</small></div></div>
      ${thoughts.length ? `<div class="card"><h2>📝 내가 생각한 것들</h2><div class="thoughts">${thoughts.map(([k, v]) => `<div><small>${k}</small>${v}</div>`).join("")}</div></div>` : ""}
      <div class="card"><h2>받은 스티커</h2><div class="stickers">${stickers.map(([e, n, ok], i) => `<div class="sticker ${ok ? "" : "no"}" style="animation-delay:${i * 0.12}s"><span>${e}</span>${n}</div>`).join("")}</div></div>
      <div class="card"><h2>내 동전 10개는?</h2>
        <div class="cmp"><div><span>🧒 내가 한 대로</span><b>${c1(tot)}개</b></div><div><span>📌 1월에 고른 그대로 뒀다면</span><b>${c1(keep)}개</b></div><div><span>🐷 저금통에만 뒀다면</span><b>10개</b></div></div>
        <p class="luck">🍀 동전이 많다고 꼭 잘 고른 건 아니에요. <b>잘 생각해도 내릴 수 있고, 그냥 골라도 오를 수 있어요.</b> 결과에는 운도 섞여 있어요.</p></div>
      <div class="card"><h2>가게들의 1년</h2><div class="cmp">${year.map(({ s, r }) => `<div><span>${s.e} ${s.kid}</span><b class="${r >= 1 ? "up" : "down"}">${moved(r)}</b></div>`).join("")}</div></div>
      <div class="card"><h2>🔍 다음은 직접 비교해 보기</h2>${LAB.buttons()}</div>
      <div class="card"><h2>👨‍👩‍👧 오늘 저녁 이야기</h2><ul>
        <li>내가 고른 이유 중에 가게를 보고 정한 것은 뭐였을까?</li>
        <li>값이 내렸을 때, 가게가 하는 일도 달라졌을까?</li>
        <li>우리 집에서 매일 쓰는 물건은 어느 회사가 만들었을까? 그 회사도 주식이 있을까?</li></ul></div>
      <div class="card"><h2>🎓 오늘 배운 진짜 투자 말</h2><ul>
        <li><b>주식</b> = 회사의 작은 조각</li><li><b>사기·팔기</b> = 매수·매도 (증권 앱 버튼 이름)</li>
        <li><b class="up">빨강 ▲</b> 올랐어요 · <b class="down">파랑 ▼</b> 내렸어요</li><li>뉴스 → 사람들 마음 → 값</li></ul>
        <button class="big" data-act="school" style="margin-top:8px"><span>🏫</span><div>라우의 투자 학교에서 더 배우기<small>이익 · 재무제표 · 차트 · 금리 · 환율 · 물가 · 투자 습관</small></div></button>
        <button class="big" data-act="words" style="margin-top:8px"><span>📖</span><div>투자 말 사전<small>${WORDS.length}개 낱말</small></div></button>
        <a class="big main" href="index.html"><span>📱</span><div>다음 단계: 진짜 증권 앱처럼 해 보기<small>스토리 모드 · 엄마·아빠랑 같이 (형·누나용)</small></div></a>
        <p class="muted" style="font-size:.85rem;margin:10px 0 0">실제 주식 계좌는 어린이 혼자 만들 수 없고, 부모님이 함께 만들어야 해요. 실제 투자는 꼭 어른과 함께 정해요.</p></div>
      <div class="menu" style="margin-top:14px"><button class="big go" data-act="restart"><span>🔄</span><div>다시 여행하기<small>이번엔 다르게 골라 볼까?</small></div></button></div>
      <p class="note">교육용 시뮬레이션이에요. 투자 권유가 아니에요. 지나간 값이 앞으로의 값을 알려 주지는 않아요.</p>`;
    bubble("");
    SP.say("여행 끝! 이번 여행에서 내가 생각한 것들을 다시 살펴봐요.");
  }

  // ---------- 그림 영상 극장 ----------
  let TH = null; // { gi, si, chain, paused }
  function openGuide(gi, chain = false) {
    cancelTalk();
    TH = { gi, si: 0, chain, paused: false };
    $("#theater").hidden = false;
    playScene();
  }
  function closeGuide() { cancelTalk(); TH = null; $("#theater").hidden = true; $("#theater").innerHTML = ""; }
  function playScene() {
    const g = GUIDES[TH.gi], th = $("#theater");
    if (TH.si >= g.scenes.length) return guideEnd();
    const [key, line] = g.scenes[TH.si];
    const art = typeof key === "function" ? key() : SCENES[key]();
    const img = IMGS.has(`${g.id}-${TH.si + 1}`) ? `<img src="img/kid/${g.id}-${TH.si + 1}.webp" alt="" style="--ox:${[30, 70, 50][TH.si % 3]}%;--oy:${[40, 60, 50][TH.si % 3]}%" onload="this.parentNode.classList.add('has-img')">` : "";
    th.innerHTML = `
      <div class="th-top"><b>📺 ${TH.gi + 1}편 · ${g.title}</b><button class="iconbtn" data-act="thclose" aria-label="닫기">✕</button></div>
      <div class="th-stage"><div class="scene">${art}</div>${img}</div>
      <div class="th-cap">${line}</div>
      <div class="th-dots">${g.scenes.map((_, i) => `<i class="${i === TH.si ? "on" : ""}"></i>`).join("")}</div>
      <div class="th-ctl"><button class="iconbtn" data-act="thprev" aria-label="이전" ${TH.si ? "" : "disabled"}>⏮</button><button class="iconbtn" data-act="thpause" aria-label="${TH.paused ? "재생" : "멈춤"}">${TH.paused ? "▶" : "⏸"}</button><button class="iconbtn" data-act="thnext" aria-label="다음">⏭</button></div>`;
    if (TH.paused) return;
    speakThen(line, () => { if (TH && !TH.paused) { TH.si++; playScene(); } }, { wait: 1100 });
  }
  function guideEnd() {
    const g = TH.gi, G = GUIDES[g], last = g + 1 >= GUIDES.length;
    if (!L[G.id]) { L[G.id] = "seen"; saveL(); }
    if (TH.chain) {
      if (g + 1 < BASIC) { TH.gi++; TH.si = 0; return playScene(); }
      closeGuide(); return startTrip();
    }
    if (G.quiz && !TH.quiz) return showQuiz();
    $("#theater").innerHTML = `<div class="th-top"><b>📺 ${g + 1}편 끝!</b><button class="iconbtn" data-act="thclose" aria-label="닫기">✕</button></div>
      <div style="display:grid;place-items:center"><div class="th-end">
        <div style="width:120px;margin:0 auto">${ART.owl("proud")}</div>
        ${last ? "" : `<button class="big main" data-act="guide" data-i="${g + 1}"><span>${GUIDES[g + 1].e}</span><div>${g + 2}편 · ${GUIDES[g + 1].title}</div></button>`}
        <button class="big go" data-act="trip"><span>🚀</span><div>2020년 여행 떠나기</div></button>
        <button class="big" data-act="guide" data-i="${g}"><span>🔁</span><div>다시 보기</div></button>
        <button class="big" data-act="thclose"><span>🏫</span><div>투자 학교로 돌아가기</div></button></div></div>`;
    SP.say(last ? "투자 학교를 다 봤어요! 정말 멋져요." : "잘 봤어요! 다음 편도 볼까요?");
  }

  // 영상 끝 퀴즈 한 문제 (보기 순서는 매번 섞어요)
  function showQuiz() {
    const G = GUIDES[TH.gi], q = G.quiz;
    const opts = [q.a, ...q.no].map((t, i) => ({ t, ok: i === 0 })).sort(() => Math.random() - 0.5);
    TH.quiz = { opts, picked: -1 };
    const draw = () => {
      const p = TH.quiz.picked, done = p >= 0, right = done && opts[p].ok;
      $("#theater").innerHTML = `<div class="th-top"><b>❓ ${TH.gi + 1}편 퀴즈</b><button class="iconbtn" data-act="thclose" aria-label="닫기">✕</button></div>
        <div style="display:grid;place-items:center"><div class="quiz">
          <div style="width:110px;margin:0 auto">${ART.owl(done ? (right ? "proud" : "worried") : "ok")}</div>
          <h2>${q.q}</h2>
          ${opts.map((o, i) => `<button class="opt ${done && o.ok ? "ok" : ""} ${done && i === p && !o.ok ? "no" : ""}" data-act="quiz" data-i="${i}" ${done ? "disabled" : ""}>${o.t}</button>`).join("")}
          ${done ? `<div class="res">${right ? "⭐ 정답!" : `아쉬워요! 정답은 <b>${q.a}</b>`}<br>${q.why}</div><button class="big main" data-act="quizok"><span>▶️</span><div>다음</div></button>` : ""}
        </div></div>`;
    };
    TH.quiz.draw = draw;
    draw();
    speakThen(`퀴즈! ${q.q} ${opts.map((o) => o.t).join(". ")}`, null);
  }
  function answerQuiz(i) {
    const Q = TH?.quiz;
    if (!Q || Q.picked >= 0) return;
    cancelTalk();
    Q.picked = i;
    const ok = Q.opts[i].ok, G = GUIDES[TH.gi];
    if (ok) { L[G.id] = "quiz"; saveL(); }
    ding(ok);
    Q.draw();
    SP.say(`${ok ? "정답!" : `아쉬워요. 정답은 ${G.quiz.a}.`} ${G.quiz.why}`);
  }

  function startTrip() {
    closeGuide();
    S.phase = "trip";
    save();
    run();
  }

  // ---------- 입력 ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === "sound") { SP.setOn(!SP.on); return renderTop(); }
    if (a.startsWith("lab")) return LAB.act(a, b.dataset);
    if (a === "all") return openGuide(0, true);
    if (a === "guide") return openGuide(+b.dataset.i);
    if (a === "trip") return startTrip();
    if (a === "restart") { cancelTalk(); S = fresh(); S.phase = "trip"; save(); return run(); }
    if (a === "thclose") { closeGuide(); return render(); }
    if (a === "thpause") { TH.paused = !TH.paused; if (TH.paused) cancelTalk(); return playScene(); }
    if (a === "thnext") { cancelTalk(); TH.si++; return playScene(); }
    if (a === "thprev") { cancelTalk(); TH.si = Math.max(0, TH.si - 1); return playScene(); }
    if (a === "skip") { cancelTalk(); return skipFn?.(); }
    if (a === "newsok") return newsDone?.();
    if (a === "pred") return predDone?.(+b.dataset.i);
    if (a === "tradeok") return tradeDone?.();
    if (a === "buy" || a === "sell") return trade(b.dataset.sym, a === "buy");
    if (a === "quiz") return answerQuiz(+b.dataset.i);
    if (a === "quizok") return guideEnd();
    if (a === "words") { cancelTalk(); view = "words"; S.phase = "intro"; save(); render(); return scrollTo(0, 0); }
    if (a === "home") { cancelTalk(); view = "home"; render(); return scrollTo(0, 0); }
    if (a === "school") { cancelTalk(); view = "home"; S.phase = "intro"; save(); render(); return $("#school")?.scrollIntoView({ behavior: "smooth" }); }
    if (a === "word") { const [w, , m] = WORDS[+b.dataset.i]; return SP.say(`${w}. ${m}`); }
    if (a === "what") { const s = shop(b.dataset.sym); return SP.say(`${s.kid}. 진짜 이름은 ${s.real}. ${s.what}`); }
  });

  // 시작: 여행 중이던 아이는 그 단계부터 (시간 여행 중이었다면 도착한 상태로)
  if (S.phase === "trip") { S.phase = "intro"; }
  if (S.phase === "end") S.phase = "intro";
  render();
})();
