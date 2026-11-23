// 라움스톡 컨셉 프로토타입 — 비밀의 해 탐험 (실제 데이터 리플레이)
(() => {
  const D = window.RAUM_DATA;
  const S = window.RAUM_SCENARIO;
  const PRE = D.preWeeks;
  const LAST = D.dates.length - 1 - PRE; // 마지막 차례 번호
  const START_CASH = 10_000_000;
  const SAVE_KEY = "raumstock-proto-v1";

  // ---------- 상품 ----------
  const CATS = [
    { id: "stock", name: "주식", lv: 1, desc: "회사의 작은 조각이에요. 회사가 잘되면 조각의 값도 올라요." },
    { id: "etf", name: "바구니(ETF)", lv: 2, desc: "여러 회사 주식을 한 바구니에 담은 상품이에요. 한 회사가 망쳐도 덜 흔들려요." },
    { id: "bond", name: "채권", lv: 3, desc: "나라에 돈을 빌려주고 이자를 받는 약속이에요. 금리가 내려가면 값이 올라요." },
    { id: "cmd", name: "금·원유", lv: 3, desc: "세상을 움직이는 재료예요. 불안할 땐 금, 공장이 바쁠 땐 원유를 찾아요." },
    { id: "etn", name: "ETN", lv: 5, locked: true, desc: "증권회사가 '이 지수만큼 돌려줄게' 하고 쓴 약속증서예요. 증권회사가 약속을 못 지킬 위험도 있어요." },
    { id: "fut", name: "선물", lv: 5, locked: true, desc: "'다음 달에 이 가격에 사고팔자'는 미래 약속이에요. 작은 돈으로 크게 움직여서 아주 위험해요." },
  ];
  const ASSETS = [
    { sym: "ZM", cat: "stock", name: "줌", icon: "📹", what: "화상회의 앱을 만드는 회사" },
    { sym: "AMZN", cat: "stock", name: "아마존", icon: "📦", what: "세계에서 가장 큰 온라인 쇼핑 회사" },
    { sym: "NFLX", cat: "stock", name: "넷플릭스", icon: "🎬", what: "영화·드라마를 볼 수 있는 영상 서비스" },
    { sym: "AAPL", cat: "stock", name: "애플", icon: "📱", what: "아이폰과 맥북을 만드는 회사" },
    { sym: "AAL", cat: "stock", name: "아메리칸항공", icon: "✈️", what: "미국의 큰 비행기 회사" },
    { sym: "CCL", cat: "stock", name: "카니발", icon: "🛳️", what: "바다 위 호텔, 크루즈 여행 회사" },
    { sym: "XOM", cat: "stock", name: "엑슨모빌", icon: "🛢️", what: "석유를 캐고 파는 큰 회사" },
    { sym: "SPY", cat: "etf", name: "미국 대표 500 바구니", icon: "🧺", what: "미국 큰 회사 500곳을 모두 담은 바구니 (S&P500)" },
    { sym: "QQQ", cat: "etf", name: "기술 회사 100 바구니", icon: "💻", what: "애플·아마존 같은 기술 회사 100곳 (나스닥100)" },
    { sym: "EWY", cat: "etf", name: "한국 대표 바구니", icon: "🇰🇷", what: "삼성전자 같은 한국 큰 회사들 (달러로 거래)" },
    { sym: "XLE", cat: "etf", name: "에너지 회사 바구니", icon: "⚡", what: "석유·가스 회사들만 모은 바구니" },
    { sym: "TLT", cat: "bond", name: "미국 국채 20년+", icon: "🏛️", what: "20년 넘게 빌려주는 약속. 금리에 아주 민감해요" },
    { sym: "SHY", cat: "bond", name: "미국 국채 1~3년", icon: "🏦", what: "짧게 빌려주는 약속. 값이 거의 안 흔들려요" },
    { sym: "GLD", cat: "cmd", name: "금", icon: "🥇", what: "불안할 때 사람들이 찾는 안전자산" },
    { sym: "USO", cat: "cmd", name: "원유", icon: "🛢️", what: "자동차·비행기·공장의 밥, 석유 (원유 선물을 따라가요)" },
  ];
  const BY_SYM = Object.fromEntries(ASSETS.map((a) => [a.sym, a]));
  const REASONS = ["뉴스를 봤어요", "차트를 봤어요", "경제 날씨", "그냥 느낌"];

  // 뉴스 → 차례 번호 (그 날짜가 포함된 주)
  const turnOfDate = (date) => {
    for (let i = PRE; i < D.dates.length; i++) if (D.dates[i] >= date) return i - PRE;
    return LAST;
  };
  const NEWS = S.news.map((n) => ({ ...n, turn: turnOfDate(n.date) }));
  const newsAt = (t) => NEWS.filter((n) => n.turn === t);

  // ---------- 상태 ----------
  const fresh = () => ({ turn: 0, cash: START_CASH, pos: {}, cost: {}, preds: {}, points: 0, history: [], unlocked: 1, introDone: false, done: false, tab: "stock" });
  let st = load() || fresh();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(st));
    } catch {}
  }

  // ---------- 계산 ----------
  const idx = (t) => PRE + t;
  const usd = (sym, t = st.turn) => D.prices[sym][idx(t)];
  const won = (sym, t = st.turn) => Math.round(usd(sym, t) * D.usdKrw);
  const chg = (sym, t = st.turn) => (t + PRE > 0 ? D.prices[sym][idx(t)] / D.prices[sym][idx(t) - 1] - 1 : 0);
  const holdValue = (t = st.turn) => Object.entries(st.pos).reduce((s, [k, q]) => s + q * won(k, t), 0);
  const total = (t = st.turn) => st.cash + holdValue(t);
  const level = () => 1 + (st.points >= 3 || st.turn >= 3 ? 1 : 0) + (st.points >= 8 || st.turn >= 6 ? 1 : 0);
  const catOpen = (c) => !c.locked && level() >= c.lv;

  const short = (n) => (n >= 1e4 ? (n / 1e4).toFixed(n >= 1e6 ? 0 : 1) + "만" : fmt(n));
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
  const pct = (x, d = 1) => (x > 0 ? "+" : "") + (x * 100).toFixed(d) + "%";
  const dirCls = (x) => (x > 0.0005 ? "up" : x < -0.0005 ? "down" : "flat");
  const arrow = (x) => (x > 0.0005 ? "▲" : x < -0.0005 ? "▼" : "■");
  const monthLabel = (t) => {
    const m = Number(D.dates[idx(t)].slice(5, 7));
    const d = Number(D.dates[idx(t)].slice(8, 10));
    return `비밀의 해 ${m}월 ${Math.ceil(d / 7)}주`;
  };

  function mood(vix) {
    if (vix < 15) return { face: "😊", word: "평온해요", note: "사람들이 마음을 놓고 있어요" };
    if (vix < 20) return { face: "🙂", word: "괜찮아요", note: "조금 조심하는 정도예요" };
    if (vix < 30) return { face: "😟", word: "불안해요", note: "걱정하는 사람이 늘었어요" };
    if (vix < 45) return { face: "😨", word: "무서워요", note: "많은 사람이 겁을 먹었어요" };
    return { face: "😱", word: "공포!", note: "모두가 한꺼번에 팔려고 해요" };
  }

  // ---------- 차트 ----------
  function lineChart(values, { w = 440, h = 200, pins = [], startAt = null, pad = { l: 8, r: 58, t: 14, b: 26 } } = {}) {
    const lo = Math.min(...values), hi = Math.max(...values);
    const span = hi - lo || hi * 0.1 || 1;
    const y0 = lo - span * 0.08, y1 = hi + span * 0.08;
    const X = (i) => pad.l + (i / Math.max(values.length - 1, 1)) * (w - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (h - pad.t - pad.b);
    const pts = values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    const last = values.length - 1;
    const up = values[last] >= values[0];
    const ticks = [lo, (lo + hi) / 2, hi];
    const grid = ticks
      .map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${w - pad.r + 8}" y="${Y(v) + 4}" class="tick">${short(v)}</text>`)
      .join("");
    const start = startAt != null && startAt <= last
      ? `<line x1="${X(startAt)}" x2="${X(startAt)}" y1="${pad.t}" y2="${h - pad.b}" class="startline"/><text x="${X(startAt) + 4}" y="${pad.t + 10}" class="tick">탐험 시작</text>`
      : "";
    const pinSvg = pins
      .filter((p) => p.i <= last)
      .map((p) => `<g class="pin"><title>${p.label}</title><circle cx="${X(p.i)}" cy="${Y(values[p.i])}" r="6"/><text x="${X(p.i)}" y="${Y(values[p.i]) + 3.5}" text-anchor="middle">${p.n}</text></g>`)
      .join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="chart ${up ? "c-up" : "c-down"}" role="img" aria-label="가격 그래프">
      ${grid}${start}
      <polygon points="${X(0)},${h - pad.b} ${pts.join(" ")} ${X(last)},${h - pad.b}" class="area"/>
      <polyline points="${pts.join(" ")}" class="line"/>
      ${pinSvg}
      <circle cx="${X(last)}" cy="${Y(values[last])}" r="5" class="end"/>
      <text x="${pad.l}" y="${h - 6}" class="tick">${values.length - 1}주 전</text>
      <text x="${w - pad.r}" y="${h - 6}" class="tick" text-anchor="end">이번 주</text>
    </svg>`;
  }
  function spark(sym) {
    const a = Math.max(0, idx(st.turn) - 11);
    const vals = D.prices[sym].slice(a, idx(st.turn) + 1);
    const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * 70).toFixed(1)},${(22 - ((v - lo) / sp) * 20).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 72 24" class="spark ${vals.at(-1) >= vals[0] ? "c-up" : "c-down"}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
  }

  const show = (id) => { const d = document.getElementById(id); d.showModal(); d.scrollTop = 0; };

  // ---------- 렌더 ----------
  const $ = (s) => document.querySelector(s);

  function render() {
    const t = st.turn;
    const ind = D.indicators[idx(t)];
    const prev = D.indicators[idx(t) - 1];
    const tot = total();
    const r = tot / START_CASH - 1;

    $("#turnLabel").textContent = `${t + 1}주차 / ${LAST + 1}`;
    $("#monthLabel").textContent = monthLabel(t);
    $("#totalVal").textContent = fmt(tot) + "원";
    const rEl = $("#totalRet");
    rEl.textContent = `${arrow(r)} ${pct(r)}`;
    rEl.className = "ret " + dirCls(r);
    $("#lvVal").textContent = `Lv.${level()}`;
    $("#ptVal").textContent = `${st.points}점`;
    $("#progressBar").style.width = `${(t / LAST) * 100}%`;
    $("#nextBtn").textContent = t >= LAST ? "탐험 결과 보기" : "다음 주로 ▶";

    // 경제 날씨
    const m = mood(ind.vix);
    const tile = (label, value, delta, note, invert = false) => {
      const cls = delta == null ? "flat" : dirCls(invert ? -delta : delta);
      const dtxt = delta == null || Math.abs(delta) < 0.005 ? "그대로" : `${arrow(delta)} ${Math.abs(delta).toFixed(2)}`;
      return `<div class="tile"><span class="t-label">${label}</span><span class="t-val">${value}</span><span class="t-delta ${cls}">${dtxt}</span><span class="t-note">${note}</span></div>`;
    };
    $("#weather").innerHTML =
      `<div class="tile mood"><span class="t-label">시장 기분</span><span class="t-face" aria-hidden="true">${m.face}</span><span class="t-val">${m.word}</span><span class="t-note">공포지수 ${ind.vix.toFixed(0)} · ${m.note}</span></div>` +
      tile("미국 기준금리", ind.fed.toFixed(2) + "%", prev ? ind.fed - prev.fed : null, "돈을 빌리는 값") +
      tile("미국 10년 국채금리", ind.y10.toFixed(2) + "%", prev ? ind.y10 - prev.y10 : null, "월 평균, 채권값과 반대로 움직여요") +
      tile("유가 (1배럴)", "$" + ind.oil.toFixed(2), prev ? ind.oil - prev.oil : null, ind.oilMin < 0 ? `이번 주 한때 $${ind.oilMin.toFixed(2)}!` : "석유 한 통(159L) 값");

    // 신문
    const items = newsAt(t);
    $("#paperDate").textContent = monthLabel(t);
    $("#news").innerHTML = items.length
      ? items
          .map(
            (n) => `<article class="news ${n.kind}">
              <span class="badge">${n.kind === "official" ? "공식 발표" : "뉴스"}</span>
              <h3>${n.headline}</h3><p>${n.body}</p></article>`
          )
          .join("")
      : `<p class="quiet">이번 주는 큰 뉴스가 없어요. 이럴 땐 차트와 경제 날씨를 살펴보세요. 조용한 주에도 가격은 움직여요.</p>`;

    // 부모님 카드
    const ask = items.find((n) => n.ask)?.ask || GENERIC_ASKS[t % GENERIC_ASKS.length];
    $("#askText").textContent = ask;

    // 시장 탭
    $("#tabs").innerHTML = CATS.map((c) => {
      const open = catOpen(c);
      return `<button class="tab ${st.tab === c.id ? "on" : ""}" data-tab="${c.id}" ${open ? "" : "aria-disabled=\"true\""}>${open ? "" : "🔒 "}${c.name}</button>`;
    }).join("");
    const cat = CATS.find((c) => c.id === st.tab);
    if (!catOpen(cat)) {
      $("#market").innerHTML = `<div class="locked"><p class="lk-title">🔒 ${cat.name}</p><p>${cat.desc}</p>
        <p class="lk-how">${cat.locked ? "다음 업데이트에서 Lv.5가 되면 열려요. 이번 탐험에서는 뉴스로 먼저 만나 보세요." : `Lv.${cat.lv}가 되면 열려요. 예측을 하고 맞히면 점수가 쌓여요.`}</p></div>`;
    } else {
      $("#market").innerHTML =
        `<p class="cat-desc">${cat.desc}</p>` +
        ASSETS.filter((a) => a.cat === cat.id)
          .map((a) => {
            const c = chg(a.sym);
            const pred = st.preds[t]?.[a.sym];
            const own = st.pos[a.sym] || 0;
            return `<button class="row" data-sym="${a.sym}">
              <span class="r-icon" aria-hidden="true">${a.icon}</span>
              <span class="r-name"><b>${a.name}</b><small>${a.what}</small>${own ? `<em class="own">${own}주 가지고 있어요</em>` : ""}</span>
              ${spark(a.sym)}
              <span class="r-px"><b>${fmt(won(a.sym))}원</b><small class="${dirCls(c)}">${arrow(c)} ${pct(c)}</small></span>
              ${pred ? `<span class="r-pred ${pred.dir > 0 ? "up" : "down"}" title="이번 주 예측">${pred.dir > 0 ? "▲" : "▼"}</span>` : `<span class="r-pred none" aria-hidden="true"></span>`}
            </button>`;
          })
          .join("");
    }

    // 내 지갑
    const held = Object.entries(st.pos).filter(([, q]) => q > 0);
    const hv = holdValue();
    const segs = [["cash", st.cash], ...CATS.map((c) => [c.id, held.filter(([s]) => BY_SYM[s].cat === c.id).reduce((x, [s, q]) => x + q * won(s), 0)])].filter(([, v]) => v > 0);
    const catName = { cash: "현금", ...Object.fromEntries(CATS.map((c) => [c.id, c.name])) };
    $("#mixBar").innerHTML = segs.map(([k, v]) => `<span class="seg seg-${k}" style="flex:${v}" title="${catName[k]} ${fmt(v)}원"></span>`).join("");
    $("#mixLegend").innerHTML = segs.map(([k, v]) => `<span><i class="dot seg-${k}"></i>${catName[k]} ${((v / tot) * 100).toFixed(0)}%</span>`).join("");
    $("#cashVal").textContent = fmt(st.cash) + "원";
    $("#holdVal").textContent = fmt(hv) + "원";
    $("#holdings").innerHTML = held.length
      ? held
          .map(([s, q]) => {
            const a = BY_SYM[s];
            const v = q * won(s);
            const pr = v / st.cost[s] - 1;
            return `<button class="hold" data-sym="${s}"><span aria-hidden="true">${a.icon}</span><span class="h-name">${a.name}<small>${q}주</small></span><span class="h-val">${fmt(v)}원<small class="${dirCls(pr)}">${arrow(pr)} ${pct(pr)}</small></span></button>`;
          })
          .join("")
      : `<p class="quiet">아직 산 게 없어요. 시장에서 관심 있는 회사를 눌러 보세요.</p>`;
    save();
  }

  const GENERIC_ASKS = [
    "우리 동네에서 요즘 손님이 많아진 가게와 줄어든 가게는 어디일까?",
    "한 회사에 모든 돈을 넣으면 어떤 점이 좋고 어떤 점이 위험할까?",
    "가격이 많이 떨어진 물건은 '싸다'고 할 수 있을까?",
    "엄마·아빠가 어릴 때와 지금, 가장 많이 바뀐 물건값은 뭘까?",
    "기다리는 것도 투자일까? 오래 기다려서 좋았던 경험이 있어?",
  ];

  // ---------- 종목 상세 ----------
  let sheetSym = null, qty = 1, predDraft = null;
  function openSheet(sym) {
    sheetSym = sym;
    qty = 1;
    const p = st.preds[st.turn]?.[sym];
    predDraft = p ? { ...p, reasons: [...p.reasons] } : { dir: 0, reasons: [] };
    renderSheet();
    show("sheet");
  }
  function renderSheet() {
    const a = BY_SYM[sheetSym];
    const cat = CATS.find((c) => c.id === a.cat);
    const c = chg(a.sym);
    const values = D.prices[a.sym].slice(0, idx(st.turn) + 1).map((v) => v * D.usdKrw);
    let n = 0;
    const pins = NEWS.filter((x) => x.turn <= st.turn && x.hint[a.sym]).map((x) => ({ i: idx(x.turn), n: ++n, label: x.headline, x }));
    const own = st.pos[a.sym] || 0;
    const price = won(a.sym);
    const maxBuy = Math.floor(st.cash / price);
    const maxQ = Math.max(maxBuy, own, 1);
    qty = Math.min(Math.max(1, qty), maxQ);
    const done = st.preds[st.turn]?.[a.sym];
    $("#sheetBody").innerHTML = `
      <header class="s-head">
        <span class="s-icon" aria-hidden="true">${a.icon}</span>
        <div><p class="eyebrow">${cat.name} · ${a.sym}</p><h2>${a.name}</h2><p class="s-what">${a.what}</p></div>
        <button class="x" data-close aria-label="닫기">✕</button>
      </header>
      <div class="s-price"><b>${fmt(price)}원</b><span class="${dirCls(c)}">지난주보다 ${arrow(c)} ${pct(c)}</span></div>
      <div class="chart-wrap">${lineChart(values, { pins, startAt: PRE })}</div>
      ${pins.length ? `<ol class="pins">${pins.map((p) => `<li><b>${p.n}</b> ${p.label}</li>`).join("")}</ol>` : `<p class="quiet small">이 회사와 관련된 큰 뉴스는 아직 없어요.</p>`}

      <section class="predict">
        <h3>다음 주에는 어떻게 될까?</h3>
        <div class="seg2">
          <button data-dir="1" class="${predDraft.dir > 0 ? "on up" : ""}">▲ 오를 것 같아</button>
          <button data-dir="-1" class="${predDraft.dir < 0 ? "on down" : ""}">▼ 내릴 것 같아</button>
        </div>
        <p class="small">왜 그렇게 생각해? (여러 개 골라도 돼요)</p>
        <div class="chips">${REASONS.map((r) => `<button data-reason="${r}" class="chip ${predDraft.reasons.includes(r) ? "on" : ""}">${r}</button>`).join("")}</div>
        <button class="btn-soft" data-savepred ${predDraft.dir ? "" : "disabled"}>${done ? "예측 고치기" : "예측 남기기"}</button>
      </section>

      <section class="trade">
        <div class="qty">
          <button data-q="-1" aria-label="한 주 빼기">−</button>
          <output id="qtyOut">${qty}주</output>
          <button data-q="1" aria-label="한 주 더하기">＋</button>
        </div>
        <p class="small">${fmt(qty * price)}원 · 내 현금 ${fmt(st.cash)}원 · 가진 것 ${own}주</p>
        <div class="trade-btns">
          <button class="btn buy" data-buy ${qty > maxBuy ? "disabled" : ""}>사기</button>
          <button class="btn sell" data-sell ${qty > own ? "disabled" : ""}>팔기</button>
        </div>
        <p id="tradeMsg" class="small" aria-live="polite"></p>
      </section>`;
  }

  function trade(side) {
    const s = sheetSym, price = won(s);
    if (side > 0) {
      if (qty * price > st.cash) return;
      st.cash -= qty * price;
      st.pos[s] = (st.pos[s] || 0) + qty;
      st.cost[s] = (st.cost[s] || 0) + qty * price;
    } else {
      const own = st.pos[s] || 0;
      if (qty > own) return;
      st.cost[s] = st.cost[s] * ((own - qty) / own);
      st.pos[s] = own - qty;
      st.cash += qty * price;
      if (!st.pos[s]) { delete st.pos[s]; delete st.cost[s]; }
    }
    const msg = `${BY_SYM[s].name} ${qty}주를 ${side > 0 ? "샀어요" : "팔았어요"}.`;
    renderSheet();
    $("#tradeMsg").textContent = msg;
    render();
  }

  // ---------- 다음 주 ----------
  function nextWeek() {
    if (st.turn >= LAST) return showFinal();
    const t = st.turn;
    const before = total(t);
    st.history[t] = { total: before, syms: Object.keys(st.pos), cats: [...new Set(Object.keys(st.pos).map((s) => BY_SYM[s].cat))] };
    const lvBefore = level();
    st.turn = t + 1;
    const after = total(st.turn);

    // 예측 채점
    const checks = Object.entries(st.preds[t] || {}).map(([sym, p]) => {
      const c = chg(sym, st.turn);
      const ok = Math.sign(c) === p.dir;
      const pts = (p.reasons.length ? 1 : 0) + (ok ? 2 : 0);
      st.points += pts;
      return { sym, p, c, ok, pts };
    });

    // 가장 많이 움직인 것
    const open = ASSETS.filter((a) => catOpen(CATS.find((c) => c.id === a.cat)));
    const movers = open.map((a) => ({ a, c: chg(a.sym, st.turn) })).sort((x, y) => y.c - x.c);
    const why = newsAt(t).filter((n) => n.why);
    const d = after - before;

    $("#resultBody").innerHTML = `
      <p class="eyebrow">${monthLabel(st.turn)} 결과</p>
      <h2 class="${dirCls(d)}">${d === 0 ? "내 돈은 그대로예요" : `내 돈이 ${fmt(Math.abs(d))}원 ${d > 0 ? "늘었어요" : "줄었어요"}`}</h2>
      <p class="small">${fmt(before)}원 → <b>${fmt(after)}원</b> ${Object.keys(st.pos).length ? "" : "(모두 현금이라 그대로예요)"}</p>
      ${checks.length ? `<section><h3>내 예측</h3><ul class="checks">${checks.map((x) => `<li class="${x.ok ? "ok" : "no"}"><span>${x.ok ? "⭕" : "❌"}</span> ${BY_SYM[x.sym].name}: ${x.p.dir > 0 ? "오른다" : "내린다"} → 실제 <b class="${dirCls(x.c)}">${pct(x.c)}</b> <em>+${x.pts}점</em></li>`).join("")}</ul></section>` : `<p class="tip">다음엔 종목을 눌러 '예측'을 남겨 보세요. 이유를 고르면 1점, 맞히면 2점!</p>`}
      <section><h3>이번 주 가장 많이 움직인 것</h3><ul class="movers">
        ${[movers[0], movers[1], movers.at(-2), movers.at(-1)].filter(Boolean).map((m) => `<li><span aria-hidden="true">${m.a.icon}</span> ${m.a.name} <b class="${dirCls(m.c)}">${arrow(m.c)} ${pct(m.c)}</b></li>`).join("")}
      </ul></section>
      ${why.length ? `<section class="why"><h3>왜 그랬을까?</h3>${why.map((n) => `<p><b>${n.headline}</b><br>${n.why}</p>`).join("")}</section>` : ""}
      <button class="btn" data-close>계속하기</button>`;
    render();
    show("result");
    const lvAfter = level();
    if (lvAfter > lvBefore) pendingUnlock = lvAfter;
  }

  let pendingUnlock = null;
  function showUnlock(lv) {
    const cs = CATS.filter((c) => c.lv === lv && !c.locked);
    $("#unlockBody").innerHTML = `<p class="eyebrow">Lv.${lv} 달성!</p><h2>새 상품이 열렸어요</h2>
      ${cs.map((c) => `<div class="unlock-card"><h3>${c.name}</h3><p>${c.desc}</p></div>`).join("")}
      <button class="btn" data-close data-gotab="${cs[0].id}">구경하러 가기</button>`;
    show("unlock");
  }

  // ---------- 탐험 결과 ----------
  function showFinal() {
    st.done = true;
    st.history[st.turn] = { total: total(), syms: Object.keys(st.pos), cats: [...new Set(Object.keys(st.pos).map((s) => BY_SYM[s].cat))] };
    const fin = total();
    const r = fin / START_CASH - 1;
    const spyR = usd("SPY", LAST) / usd("SPY", 0) - 1;
    const allPreds = Object.entries(st.preds).flatMap(([t, o]) => (Number(t) < st.turn ? Object.entries(o).map(([s, p]) => ({ ok: Math.sign(chg(s, Number(t) + 1)) === p.dir, why: p.reasons.length > 0 })) : []));
    const acc = allPreds.length ? allPreds.filter((p) => p.ok).length / allPreds.length : 0;
    const invested = st.history.filter((h) => h && h.syms.length);
    const avgCats = invested.length ? invested.reduce((s, h) => s + h.cats.length, 0) / invested.length : 0;
    const heldAt = (t, syms) => (st.history[t]?.syms || []).some((s) => syms.includes(s));
    const T = (date) => turnOfDate(date);
    const badges = [
      { on: [T("2020-02-28"), T("2020-03-13"), T("2020-03-20")].every((t) => heldAt(t, ASSETS.filter((a) => a.cat === "stock" || a.cat === "etf").map((a) => a.sym))), icon: "⛈️", name: "폭풍 속 버티기", how: "가장 무서웠던 3월에도 주식을 팔지 않고 버텼어요" },
      { on: heldAt(T("2020-02-28"), ["TLT", "SHY"]) || heldAt(T("2020-03-06"), ["TLT", "SHY"]), icon: "🏛️", name: "금리 박사", how: "금리가 내려가기 전에 채권을 가지고 있었어요" },
      { on: heldAt(T("2020-03-27"), ["ZM", "AMZN", "NFLX"]), icon: "🏠", name: "집콕 시대 발견", how: "사람들이 집에 머물 때 뜨는 회사를 찾아냈어요" },
      { on: heldAt(T("2020-11-06"), ["AAL", "CCL"]), icon: "💉", name: "백신 탐정", how: "백신 소식 전에 여행 회사를 가지고 있었어요" },
      { on: allPreds.length >= 10 && acc >= 0.6, icon: "🔮", name: "예측왕", how: "10번 넘게 예측하고 60% 넘게 맞혔어요" },
      { on: avgCats >= 2.5, icon: "🧺", name: "분산 박사", how: "평균 2~3가지 넘는 종류에 나눠 담았어요" },
    ];
    const stars = (x) => "★".repeat(x) + "☆".repeat(3 - x);
    const sPerf = r >= spyR ? 3 : r >= 0 ? 2 : 1;
    const sRisk = avgCats >= 2.5 ? 3 : avgCats >= 1.5 ? 2 : 1;
    const sMind = allPreds.length >= 10 && acc >= 0.55 ? 3 : allPreds.length >= 5 ? 2 : 1;
    const series = st.history.map((h) => h?.total ?? null);
    const filled = series.map((v, i) => v ?? series.slice(0, i).reverse().find((x) => x != null) ?? START_CASH);
    $("#finalBody").innerHTML = `
      <p class="eyebrow">탐험 끝!</p>
      <h2>${S.reveal.headline}</h2>
      <p>${S.reveal.body}</p>
      <div class="final-nums">
        <div><span>내 결과</span><b class="${dirCls(r)}">${pct(r)}</b><small>${fmt(fin)}원</small></div>
        <div><span>500 바구니만 샀다면</span><b class="${dirCls(spyR)}">${pct(spyR)}</b></div>
      </div>
      <div class="chart-wrap">${lineChart(filled, { h: 150 })}</div>
      <ul class="stars">
        <li><span>📈 성과</span><b>${stars(sPerf)}</b></li>
        <li><span>🛡️ 나눠 담기</span><b>${stars(sRisk)}</b><small>평균 ${avgCats.toFixed(1)}종류</small></li>
        <li><span>🧠 생각하는 힘</span><b>${stars(sMind)}</b><small>예측 ${allPreds.length}번 · 정답률 ${(acc * 100).toFixed(0)}%</small></li>
      </ul>
      <h3>받은 배지</h3>
      <ul class="badges">${badges.map((b) => `<li class="${b.on ? "got" : ""}"><span aria-hidden="true">${b.icon}</span><b>${b.name}</b><small>${b.how}</small></li>`).join("")}</ul>
      <p class="small">가격은 2020년의 실제 종가(1달러=1,200원으로 계산)예요. 실제 투자 추천이 아니에요.</p>
      <div class="trade-btns"><button class="btn" data-restart>처음부터 다시 탐험</button><button class="btn-soft" data-close>닫기</button></div>`;
    save();
    show("final");
  }

  // ---------- 이벤트 ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const dlg = b.closest("dialog");
    if (b.dataset.tab) {
      st.tab = b.dataset.tab;
      return render();
    }
    if (b.dataset.sym) return openSheet(b.dataset.sym);
    if (b.id === "nextBtn") return st.done ? showFinal() : nextWeek();
    if (b.id === "startBtn") {
      st.introDone = true;
      save();
      return $("#intro").close();
    }
    if (b.id === "resetBtn" || b.dataset.restart !== undefined) {
      st = fresh();
      st.introDone = true;
      document.querySelectorAll("dialog[open]").forEach((d) => d.close());
      return render();
    }
    if (b.dataset.dir) {
      predDraft.dir = Number(b.dataset.dir);
      return renderSheet();
    }
    if (b.dataset.reason) {
      const r = b.dataset.reason;
      predDraft.reasons = predDraft.reasons.includes(r) ? predDraft.reasons.filter((x) => x !== r) : [...predDraft.reasons, r];
      return renderSheet();
    }
    if (b.dataset.savepred !== undefined) {
      (st.preds[st.turn] ||= {})[sheetSym] = { dir: predDraft.dir, reasons: predDraft.reasons };
      renderSheet();
      $("#tradeMsg").textContent = "예측을 남겼어요. 다음 주에 확인해요!";
      return render();
    }
    if (b.dataset.q) {
      qty = Math.max(1, qty + Number(b.dataset.q));
      return renderSheet();
    }
    if (b.dataset.buy !== undefined) return trade(1);
    if (b.dataset.sell !== undefined) return trade(-1);
    if (b.dataset.close !== undefined && dlg) {
      if (b.dataset.gotab) {
        st.tab = b.dataset.gotab;
        render();
      }
      dlg.close();
    }
  });
  $("#result").addEventListener("close", () => {
    if (pendingUnlock) {
      const lv = pendingUnlock;
      pendingUnlock = null;
      showUnlock(lv);
    } else if (st.turn >= LAST) showFinal();
  });
  // 바깥 클릭으로 닫기 (상세 화면만)
  $("#sheet").addEventListener("click", (e) => {
    if (e.target.id === "sheet") $("#sheet").close();
  });

  window.claude?.hot?.snapshot?.(() => st);
  const start = (data) => {
    if (data && data.turn != null) st = data;
    render();
    if (!st.introDone) show("intro");
  };
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? null);
})();
