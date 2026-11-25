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
  const fresh = () => ({ phase: "intro", stop: 0, step: 0, di: START, cash: 10, sh: {}, preds: {}, flags: {}, sh0: null, cash0: 10, mark: START, before: 0 });
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
  function pizzaSvg() {
    let w = "";
    for (let k = 0; k < 8; k++) {
      const a0 = (k * 45 - 90) * Math.PI / 180, a1 = ((k + 1) * 45 - 90) * Math.PI / 180, am = (a0 + a1) / 2;
      const p = (a, r) => `${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)}`;
      w += `<g class="w ${k === 1 ? "pick" : ""}" style="--dx:${(Math.cos(am) * 12).toFixed(1)}px;--dy:${(Math.sin(am) * 12).toFixed(1)}px">
        <path d="M100 100 L${p(a0, 80)} A80 80 0 0 1 ${p(a1, 80)} Z" fill="#ffcf5c" stroke="#16223d" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="${(100 + Math.cos(am) * 52).toFixed(1)}" cy="${(100 + Math.sin(am) * 52).toFixed(1)}" r="8" fill="#e5383b" stroke="#16223d" stroke-width="2"/></g>`;
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

  // ---------- 그림 영상 3편 ----------
  const GUIDES = [
    { id: "g1", title: "주식이 뭐야?", scenes: [
      ["shop", "여기 맛있는 피자 가게가 있어요. 손님이 아주 많아요."],
      ["split", "가게 주인이 가게를 여러 조각으로 나눴어요. 이 한 조각을 '주식'이라고 불러요."],
      ["owner", "주식 한 조각을 사면, 나도 이 가게의 작은 주인이 돼요!"],
      ["grow", "가게가 장사를 잘하면, 내 조각의 값도 쑥쑥 올라가요."],
      ["shrink", "장사가 잘 안 되면, 조각 값이 내려갈 수도 있어요."],
    ] },
    { id: "g2", title: "값은 왜 바뀔까?", scenes: [
      ["crowdUp", "이 조각을 갖고 싶은 사람이 많아지면, 값이 올라가요."],
      ["crowdDown", "팔고 싶은 사람이 많아지면, 값이 내려가요."],
      ["news", "사람들은 뉴스를 듣고 마음이 바뀌어요. 마음이 바뀌면 값도 바뀌어요."],
      ["nobody", "그래서 내일 값이 어떻게 될지는 아무도 몰라요. 라우도 몰라요!"],
    ] },
    { id: "g3", title: "어른들은 이렇게 사요", scenes: [
      ["phone", "어른들은 스마트폰의 '증권 앱'으로 주식을 사고팔아요."],
      ["colors", "빨간색 세모는 값이 올랐다는 뜻, 파란색 세모는 내렸다는 뜻이에요."],
      ["buttons", "'사기'를 누르면 조각을 사고, '팔기'를 누르면 조각을 팔아요."],
      ["coins", "꼬마 탐험가는 동전 10개로 연습해요. 동전 하나는 10만 원이에요."],
      ["machine", "자, 이제 타임머신을 타고 2020년으로 가서, 진짜 값으로 연습해 봐요!"],
    ] },
  ];

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
      { trade: "마음대로 사고팔아 봐요. 그대로 둬도 괜찮아요.", parent: "값이 떨어졌을 때 기분이 어땠어? 기다리면 어떻게 될까?", brave: true },
    ] },
    { em: "🏠", title: "6월 · 집에 있는 여름", seq: [
      { travel: "2020-06-08", mark: true },
      { say: [
        "석 달이 지났어요. 친구들은 집에서 컴퓨터로 수업을 들었어요.",
        () => `그래서 화상 수업 가게에 손님이 엄청 많아졌어요. 1월보다 ${moved(ratio("ZM", START, S.di))}!`,
        () => `무서웠던 3월보다 택배 가게는 ${moved(ratio("AMZN", near("2020-03-16"), S.di))}. 사람들이 다시 용기를 냈어요.`,
        () => `내 동전은 지금 ${c1(total())}개예요.`,
      ], mood: "happy" },
      { trade: "가게를 바꿔 볼까요? 그대로 둬도 돼요.", parent: "집에만 있을 때 우리 가족은 뭘 많이 했지? 그건 어느 회사 거였을까?" },
    ] },
    { em: "💉", title: "11월 · 큰 뉴스가 온 날", seq: [
      { travel: "2020-11-06", mark: true },
      { say: ["가을이 됐어요. 아직도 병 때문에 여행을 마음껏 못 가요.", () => `화상 수업 가게는 1월보다 ${moved(ratio("ZM", START, S.di))}. 배 여행 가게는 ${moved(ratio("CCL", START, S.di))}.`], mood: "ok" },
      { news: { e: "💉", t: "병을 막는 백신이 거의 다 만들어졌어요!", b: "과학자들이 만든 백신이 병을 아주 잘 막는대요. 이제 곧 여행도 갈 수 있을지 몰라요." } },
      { predict: { key: "vaccine", q: "이 뉴스에 가장 기뻐할 가게는 어디일까?", opts: ["🚢✈️ 여행 가게들", "💻 화상 수업 가게"] } },
      { travel: "2020-11-09", mark: true, slow: true },
      { say: [
        () => `딱 하루 만에! 배 여행 가게는 ${moved(sinceMark("CCL"))}. 비행기 가게도 ${moved(sinceMark("AAL"))}.`,
        () => `화상 수업 가게는 ${moved(sinceMark("ZM"))}. 이제 밖에 나갈 수 있으니까요.`,
        () => (S.preds.vaccine === 0 ? "예언 성공! 같은 뉴스인데 어떤 가게는 웃고, 어떤 가게는 울었어요." : "같은 뉴스인데 어떤 가게는 웃고, 어떤 가게는 울었어요. 신기하죠?"),
      ], mood: "happy", from: "2020-11-06" },
      { trade: "마지막으로 가게를 바꿀 수 있어요!", parent: "백신 뉴스가 왜 화상 수업 가게에는 슬픈 소식이었을까?" },
    ] },
    { em: "🎆", title: "12월 · 여행 끝!", seq: [
      { travel: "2020-12-31" },
      { say: ["2020년의 마지막 날이에요. 여행이 끝났어요!", () => `내 동전 10개는… ${c1(total())}개가 됐어요!`], mood: "proud" },
      { end: true },
    ] },
  ];

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

  function renderIntro() {
    const going = S.stop > 0 || S.step > 1;
    $("#main").innerHTML = `
      <div class="hero">${ART.owl("happy")}<h1>꼬마 탐험가</h1><p>부엉이 라우와 타임머신 타고<br>진짜 주식 여행을 떠나요</p></div>
      <div class="menu">
        <button class="big main" data-act="all"><span>▶️</span><div>영상 보고 여행 가기<small>처음이라면 여기부터! 약 3분 영상 + 여행</small></div></button>
        ${GUIDES.map((g, i) => `<button class="big" data-act="guide" data-i="${i}"><span>📺</span><div>${i + 1}편 · ${g.title}<small>그림 ${g.scenes.length}장 · 라우가 읽어 줘요</small></div></button>`).join("")}
        <button class="big go" data-act="trip"><span>🚀</span><div>${going ? "여행 이어 하기" : "바로 2020년 여행 떠나기"}<small>${going ? `${STOPS[Math.min(S.stop, STOPS.length - 1)].title}부터` : "동전 10개 · 가게 5곳 · 진짜 값"}</small></div></button>
        ${going ? `<button class="big" data-act="restart"><span>🔄</span><div>여행 처음부터<small>동전 10개로 다시 시작</small></div></button>` : ""}
      </div>
      <p class="note">${SP.supported ? "🔊 소리를 켜면 라우가 읽어 줘요." : "이 브라우저는 소리 읽기를 지원하지 않아요. 엄마·아빠가 읽어 주세요."}<br>교육용 시뮬레이션이에요. 투자 권유가 아니에요.</p>`;
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
    const days = to - from, dur = st.slow ? 1800 : Math.min(4200, 900 + days * 28);
    canTrade = false;
    const fx = document.createElement("div"); fx.className = "travel"; fx.innerHTML = "<span>🕰️</span>";
    document.body.append(fx);
    bubble(`🕰️ 슝~ 시간 여행 중!<br><b>${dateKo(to)}</b>로 가요`, "happy", false);
    SP.say(st.slow ? "하루가 지나면…" : "슝, 시간 여행!");
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

  function showTrade(st, done) {
    canTrade = true;
    if (st.brave) S.before = invested();
    renderTrip();
    const draw = () => {
      const ok = !st.need || invested() >= st.need - 0.001;
      bubble(`${st.trade}${st.parent ? `<div class="parent">👨‍👩‍👧 엄마·아빠랑 이야기해요<br>"${st.parent}"</div>` : ""}<div class="row"><button class="pill" data-act="tradeok" ${ok ? "" : "disabled"}>${ok ? "다 했어요! 다음으로 ▶" : "먼저 '사기'를 한 번 눌러요"}</button></div>`, "ok", false);
    };
    draw();
    tradeRedraw = draw;
    speakThen(st.trade + (st.parent ? ` 엄마 아빠랑 이야기해요. ${st.parent}` : ""), null);
    tradeDone = () => {
      cancelTalk();
      canTrade = false;
      if (st.first) { S.sh0 = { ...S.sh }; S.cash0 = S.cash; }
      const held = SHOPS.filter((s) => val(s.sym) > 0.05).length;
      if (held >= 3) S.flags.spread = true;
      if (st.brave && invested() >= S.before - 0.05) S.flags.brave = true;
      save(); done();
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
    const stickers = [
      ["🌱", "첫 투자", !!S.sh0],
      ["🧺", "나눠 담기", !!S.flags.spread],
      ["🦁", "용감한 마음", !!S.flags.brave],
      ["🔮", "백신 예언가", S.preds.vaccine === 0],
      ["🏠", "마음 읽기", S.preds.virus === 0],
      ["🏁", "끝까지 완주", true],
    ];
    $("#main").innerHTML = `
      <div class="banner"><span class="em">🎆</span><div><b>2020년 여행 끝!</b><small>진짜 2020년 값으로 계산했어요</small></div></div>
      <div class="card"><h2>내 동전</h2><p class="total">🪙 10 → <b class="${tot >= 10 ? "up" : "down"}">${c1(tot)}</b></p>
        <div class="cmp"><div><span>🧒 내가 한 대로</span><b>${c1(tot)}개</b></div><div><span>📌 1월에 고른 그대로 뒀다면</span><b>${c1(keep)}개</b></div><div><span>🐷 저금통에만 뒀다면</span><b>10개</b></div></div></div>
      <div class="card"><h2>가게들의 1년</h2><div class="cmp">${year.map(({ s, r }) => `<div><span>${s.e} ${s.kid}</span><b class="${r >= 1 ? "up" : "down"}">${moved(r)}</b></div>`).join("")}</div></div>
      <div class="card"><h2>받은 스티커</h2><div class="stickers">${stickers.map(([e, n, ok], i) => `<div class="sticker ${ok ? "" : "no"}" style="animation-delay:${i * 0.12}s"><span>${e}</span>${n}</div>`).join("")}</div></div>
      <div class="card"><h2>👨‍👩‍👧 오늘 저녁 이야기</h2><ul>
        <li>어떤 뉴스가 가게 값을 제일 크게 바꿨을까?</li>
        <li>3월에 무서웠을 때 팔았다면 어떻게 됐을까?</li>
        <li>우리 집에서 매일 쓰는 물건은 어느 회사가 만들었을까? 그 회사도 주식이 있을까?</li></ul></div>
      <div class="card"><h2>🎓 오늘 배운 진짜 투자 말</h2><ul>
        <li><b>주식</b> = 회사의 작은 조각</li><li><b>사기·팔기</b> = 매수·매도 (증권 앱 버튼 이름)</li>
        <li><b class="up">빨강 ▲</b> 올랐어요 · <b class="down">파랑 ▼</b> 내렸어요</li><li>뉴스 → 사람들 마음 → 값</li></ul>
        <a class="big main" href="index.html"><span>📱</span><div>다음 단계: 진짜 증권 앱처럼 해 보기<small>스토리 모드 · 엄마·아빠랑 같이 (형·누나용)</small></div></a>
        <p class="muted" style="font-size:.85rem;margin:10px 0 0">실제 주식 계좌는 어린이 혼자 만들 수 없고, 부모님이 함께 만들어야 해요. 실제 투자는 꼭 어른과 함께 정해요.</p></div>
      <div class="menu" style="margin-top:14px"><button class="big go" data-act="restart"><span>🔄</span><div>다시 여행하기<small>이번엔 다르게 골라 볼까?</small></div></button></div>
      <p class="note">교육용 시뮬레이션이에요. 투자 권유가 아니에요. 지나간 값이 앞으로의 값을 알려 주지는 않아요.</p>`;
    bubble("");
    SP.say(`여행 끝! 내 동전 10개는 ${c1(tot)}개가 됐어요. 스티커를 확인해 봐요!`);
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
    const img = IMGS.has(`${g.id}-${TH.si + 1}`) ? `<img src="img/kid/${g.id}-${TH.si + 1}.webp" alt="" style="--ox:${[30, 70, 50][TH.si % 3]}%;--oy:${[40, 60, 50][TH.si % 3]}%" onload="this.parentNode.classList.add('has-img')">` : "";
    th.innerHTML = `
      <div class="th-top"><b>📺 ${TH.gi + 1}편 · ${g.title}</b><button class="iconbtn" data-act="thclose" aria-label="닫기">✕</button></div>
      <div class="th-stage"><div class="scene">${SCENES[key]()}</div>${img}</div>
      <div class="th-cap">${line}</div>
      <div class="th-dots">${g.scenes.map((_, i) => `<i class="${i === TH.si ? "on" : ""}"></i>`).join("")}</div>
      <div class="th-ctl"><button class="iconbtn" data-act="thprev" aria-label="이전" ${TH.si ? "" : "disabled"}>⏮</button><button class="iconbtn" data-act="thpause" aria-label="${TH.paused ? "재생" : "멈춤"}">${TH.paused ? "▶" : "⏸"}</button><button class="iconbtn" data-act="thnext" aria-label="다음">⏭</button></div>`;
    if (TH.paused) return;
    speakThen(line, () => { if (TH && !TH.paused) { TH.si++; playScene(); } }, { wait: 1100 });
  }
  function guideEnd() {
    const g = TH.gi, last = g + 1 >= GUIDES.length;
    if (TH.chain) {
      if (!last) { TH.gi++; TH.si = 0; return playScene(); }
      closeGuide(); return startTrip();
    }
    $("#theater").innerHTML = `<div class="th-top"><b>📺 ${g + 1}편 끝!</b><button class="iconbtn" data-act="thclose" aria-label="닫기">✕</button></div>
      <div style="display:grid;place-items:center"><div class="th-end">
        <div style="width:120px;margin:0 auto">${ART.owl("proud")}</div>
        ${last ? "" : `<button class="big main" data-act="guide" data-i="${g + 1}"><span>📺</span><div>${g + 2}편 · ${GUIDES[g + 1].title}</div></button>`}
        <button class="big go" data-act="trip"><span>🚀</span><div>2020년 여행 떠나기</div></button>
        <button class="big" data-act="guide" data-i="${g}"><span>🔁</span><div>다시 보기</div></button></div></div>`;
    SP.say(last ? "다 봤어요! 이제 여행을 떠나 볼까요?" : "잘 봤어요! 다음 편도 볼까요?");
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
    if (a === "what") { const s = shop(b.dataset.sym); return SP.say(`${s.kid}. 진짜 이름은 ${s.real}. ${s.what}`); }
  });

  // 시작: 여행 중이던 아이는 그 단계부터 (시간 여행 중이었다면 도착한 상태로)
  if (S.phase === "trip") { S.phase = "intro"; }
  if (S.phase === "end") S.phase = "intro";
  render();
})();
