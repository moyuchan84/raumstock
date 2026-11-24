// 라움스톡 컨셉 프로토타입 — 비밀의 해 탐험 (실제 데이터 리플레이)
(() => {
  const D = window.RAUM_DATA;
  const S = window.RAUM_SCENARIO;
  const ART = window.RAUM_ART;
  const FIN = window.RAUM_FIN || {};
  const LESSONS = window.RAUM_LEARN || [];
  const PRE = D.preWeeks;
  const LAST = D.dates.length - 1 - PRE; // 마지막 차례 번호
  const SAVE_KEY = "raumstock-proto-v2";

  // 빌린 돈(신용) 규칙 — learn.js "빌린 돈" 수업과 같은 숫자
  const LEVER_EXTRA = 1.5; // 내 돈의 1.5배까지 더 빌림 (증거금 40%)
  const LOAN_RATE = 0.08; // 연 이자
  const CALL_RATIO = 1.4; // 담보비율 140% 아래면 반대매매
  const WARN_RATIO = 1.7;
  const FREEZE_TURNS = 4; // 반대매매 뒤 빌리기 금지 기간

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
    { sym: "SPY", cat: "etf", name: "미국 대표 500 바구니", icon: "🧺", what: "미국 큰 회사 500곳을 모두 담은 바구니 (S&P500)", inside: "500개 회사가 들어 있지만 애플·마이크로소프트·아마존처럼 큰 회사일수록 더 많이 담겨 있어요." },
    { sym: "QQQ", cat: "etf", name: "기술 회사 100 바구니", icon: "💻", what: "애플·아마존 같은 기술 회사 100곳 (나스닥100)", inside: "기술 회사에 몰려 있어서 500 바구니보다 더 크게 오르내려요. 바구니여도 한쪽에 쏠리면 분산 효과가 작아져요." },
    { sym: "EWY", cat: "etf", name: "한국 대표 바구니", icon: "🇰🇷", what: "삼성전자 같은 한국 큰 회사들 (달러로 거래)", inside: "삼성전자가 가장 큰 부분을 차지해요. 달러로 거래돼서 원·달러 환율도 함께 영향을 줘요." },
    { sym: "XLE", cat: "etf", name: "에너지 회사 바구니", icon: "⚡", what: "석유·가스 회사들만 모은 바구니", inside: "엑슨모빌·셰브런 같은 큰 석유 회사가 큰 부분을 차지해요. 석유값과 함께 움직여요." },
    { sym: "TLT", cat: "bond", name: "미국 국채 20년+", icon: "🏛️", what: "20년 넘게 빌려주는 약속. 금리에 아주 민감해요", inside: "금리가 1%p 움직이면 값이 반대로 약 17% 움직여요(듀레이션 약 17). 오래 빌려줄수록 시소가 커요." },
    { sym: "SHY", cat: "bond", name: "미국 국채 1~3년", icon: "🏦", what: "짧게 빌려주는 약속. 값이 거의 안 흔들려요", inside: "금리가 1%p 움직여도 값은 약 2%만 움직여요. 현금처럼 기다리는 자리로 써요." },
    { sym: "GLD", cat: "cmd", name: "금", icon: "🥇", what: "불안할 때 사람들이 찾는 안전자산", inside: "금고에 있는 금의 일부를 가진 것과 비슷해요. 이자나 배당은 없지만 돈값이 떨어지거나 세상이 불안할 때 버텨요." },
    { sym: "USO", cat: "cmd", name: "원유", icon: "🛢️", what: "자동차·비행기·공장의 밥, 석유 (원유 선물을 따라가요)", inside: "원유를 직접 갖는 게 아니라 원유 '선물'을 사서 들고 있어요. 만기마다 다음 달 선물로 갈아타야 해서 원유값과 다르게 움직이기도 해요." },
  ];
  const BY_SYM = Object.fromEntries(ASSETS.map((a) => [a.sym, a]));
  const REASONS = ["뉴스를 봤어요", "차트를 봤어요", "경제 날씨", "회사 성적표", "계절 지도", "그냥 느낌"];

  // ---------- 자산배분 ----------
  const CLASSES = [
    { id: "stock", name: "주식·바구니", rep: "SPY", seg: "stock" },
    { id: "long", name: "장기 채권", rep: "TLT", seg: "bond" },
    { id: "short", name: "단기 채권", rep: "SHY", seg: "short" },
    { id: "gold", name: "금", rep: "GLD", seg: "cmd" },
    { id: "oil", name: "원유", rep: "USO", seg: "oil" },
  ];
  const classOf = (sym) => ({ TLT: "long", SHY: "short", GLD: "gold", USO: "oil" })[sym] || "stock";
  const PRESETS = [
    { id: "6040", name: "60/40 기본형", w: { stock: 0.6, long: 0.4 }, say: "주식 60%와 채권 40%. 가장 오래된 기본형이에요." },
    { id: "perm", name: "영구 포트폴리오", w: { stock: 0.25, long: 0.25, gold: 0.25, short: 0.25 }, say: "주식·장기채·금·현금(단기채) 25%씩. 어떤 일이 와도 하나는 버티게요." },
    { id: "aw", name: "사계절(올웨더)", w: { stock: 0.3, long: 0.4, short: 0.15, gold: 0.075, oil: 0.075 }, say: "경제의 네 계절 모두를 버티도록 만든 비율이에요. (중기채 15%는 단기채로 대신 계산)" },
    { id: "8020", name: "공격형 80/20", w: { stock: 0.8, long: 0.2 }, say: "주식을 많이 담아 크게 자라는 대신 많이 흔들려요." },
  ];

  // ---------- 시장의 4계절 ----------
  const SEASONS = {
    spring: { name: "봄", tag: "금융장세", icon: "🌸", good: "성장하는 회사·장기 채권", rule: "금리 ↓ · 실적 아직 나쁨" },
    summer: { name: "여름", tag: "실적장세", icon: "☀️", good: "경기에 민감한 회사(여행·에너지)", rule: "금리 바닥 · 실적 ↑" },
    autumn: { name: "가을", tag: "역금융장세", icon: "🍂", good: "현금·단기 채권", rule: "금리 ↑ · 실적 아직 좋음" },
    winter: { name: "겨울", tag: "역실적장세", icon: "❄️", good: "국채·금·현금", rule: "실적 ↓ · 금리 내리기 시작" },
  };

  // 뉴스 → 차례 번호 (그 날짜가 포함된 주)
  const turnOfDate = (date) => {
    for (let i = PRE; i < D.dates.length; i++) if (D.dates[i] >= date) return i - PRE;
    return LAST;
  };
  const NEWS = S.news.map((n) => ({ ...n, turn: turnOfDate(n.date) })).sort((a, b) => a.date.localeCompare(b.date));
  const newsAt = (t) => NEWS.filter((n) => n.turn === t);
  const SEASON_STARTS = (S.seasons || []).map((s) => ({ ...s, turn: s.from < D.dates[PRE] ? 0 : turnOfDate(s.from) }));
  const seasonAt = (t) => SEASON_STARTS.filter((s) => s.turn <= t).at(-1) || { id: "summer", why: "" };

  // ---------- 상태 ----------
  const fresh = (seed = 10_000_000, margin = false) => ({
    turn: 0, seed, margin, cash: seed, pos: {}, cost: {}, preds: {}, points: 0, history: [],
    introDone: false, done: false, tab: "stock", learned: {}, freezeUntil: -1, interestPaid: 0, calls: [], everBorrowed: false, preset: "6040",
  });
  let st = load() || fresh();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? { ...fresh(), ...JSON.parse(raw) } : null;
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
  const loan = () => Math.max(0, -st.cash);
  const canBorrow = () => st.margin && st.turn >= st.freezeUntil;
  const maxSpend = () => st.cash + (canBorrow() ? Math.max(0, LEVER_EXTRA * total()) : 0);
  const collateral = () => (loan() > 0 ? holdValue() / loan() : Infinity);
  const level = () => 1 + (st.points >= 3 || st.turn >= 3 ? 1 : 0) + (st.points >= 8 || st.turn >= 6 ? 1 : 0);
  const catOpen = (c) => !c.locked && level() >= c.lv;
  const classValues = () => {
    const v = Object.fromEntries(CLASSES.map((c) => [c.id, 0]));
    for (const [s, q] of Object.entries(st.pos)) v[classOf(s)] += q * won(s);
    return v;
  };

  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
  const short = (n) => (Math.abs(n) >= 1e4 ? (n / 1e4).toFixed(Math.abs(n) >= 1e6 ? 0 : 1) + "만" : fmt(n));
  const fmtBig = (n) => {
    const a = Math.abs(n), s = n < 0 ? "−" : "";
    if (a >= 1e12) return s + (a / 1e12).toFixed(a >= 1e13 ? 0 : 1) + "조 원";
    if (a >= 1e8) return s + fmt(a / 1e8) + "억 원";
    return s + fmt(a) + "원";
  };
  const pct = (x, d = 1) => (x > 0 ? "+" : "") + (x * 100).toFixed(d) + "%";
  const dirCls = (x) => (x > 0.0005 ? "up" : x < -0.0005 ? "down" : "flat");
  const arrow = (x) => (x > 0.0005 ? "▲" : x < -0.0005 ? "▼" : "■");
  const monthLabel = (t) => {
    const m = Number(D.dates[idx(t)].slice(5, 7));
    const d = Number(D.dates[idx(t)].slice(8, 10));
    return `비밀의 해 ${m}월 ${Math.ceil(d / 7)}주`;
  };

  function mood(vix) {
    if (vix < 15) return { face: "😊", owl: "happy", word: "평온해요", note: "사람들이 마음을 놓고 있어요" };
    if (vix < 20) return { face: "🙂", owl: "ok", word: "괜찮아요", note: "조금 조심하는 정도예요" };
    if (vix < 30) return { face: "😟", owl: "worried", word: "불안해요", note: "걱정하는 사람이 늘었어요" };
    if (vix < 45) return { face: "😨", owl: "scared", word: "무서워요", note: "많은 사람이 겁을 먹었어요" };
    return { face: "😱", owl: "scared", word: "공포!", note: "모두가 한꺼번에 팔려고 해요" };
  }

  // ---------- 실험실 계산 (실제 주간 값, 미래는 보지 않음) ----------
  function simMix(w, t0, t1) {
    const rest = 1 - Object.values(w).reduce((a, b) => a + b, 0);
    const out = [];
    for (let t = t0; t <= t1; t++) {
      let v = rest;
      for (const [c, x] of Object.entries(w)) {
        const rep = CLASSES.find((k) => k.id === c).rep;
        v += (x * usd(rep, t)) / usd(rep, t0);
      }
      out.push(v);
    }
    return out;
  }
  function simLever(t0, t1, lev = 1 + LEVER_EXTRA) {
    let H = lev, L = lev - 1, cash = 0, called = null;
    const eq = [];
    for (let t = t0; t <= t1; t++) {
      if (t > t0 && H > 0) {
        H *= usd("SPY", t) / usd("SPY", t - 1);
        L *= 1 + LOAN_RATE / 52;
        if (H / L < CALL_RATIO) {
          cash = H - L;
          H = L = 0;
          called = t;
        }
      }
      eq.push(H - L + cash);
    }
    return { eq, called };
  }
  const mdd = (vals) => {
    let peak = vals[0], m = 0;
    for (const v of vals) {
      peak = Math.max(peak, v);
      m = Math.min(m, v / peak - 1);
    }
    return m;
  };

  // ---------- 차트 ----------
  function lineChart(values, { w = 440, h = 200, pins = [], startAt = null, pad = { l: 8, r: 58, t: 14, b: 26 } } = {}) {
    const showStart = startAt != null && startAt <= values.length - 1;
    // Reserve a strip above the plot for the "탐험 시작" label so it never meets the y-axis ticks.
    if (showStart) pad = { ...pad, t: pad.t + 14 };
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
    // Label sits above the plot; it hangs left of the line when the line is in the right half.
    const startRight = showStart && X(startAt) > (pad.l + w - pad.r) / 2;
    const start = showStart
      ? `<line x1="${X(startAt)}" x2="${X(startAt)}" y1="${pad.t - 12}" y2="${h - pad.b}" class="startline"/><text x="${X(startAt) + (startRight ? -4 : 4)}" y="${pad.t - 4}" class="tick"${startRight ? ' text-anchor="end"' : ""}>탐험 시작</text>`
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
  // 여러 선 비교 (값은 1 = 시작). marks: [{i, label}]
  function multiChart(series, { w = 440, h = 170, marks = [] } = {}) {
    // Marks get a label strip above the plot so they never sit on the y-axis ticks.
    const pad = { l: 8, r: 52, t: marks.length ? 26 : 12, b: 22 };
    const all = series.flatMap((s) => s.vals);
    const lo = Math.min(...all, 1), hi = Math.max(...all, 1);
    const span = hi - lo || 0.1;
    const y0 = lo - span * 0.08, y1 = hi + span * 0.08;
    const n = Math.max(...series.map((s) => s.vals.length));
    const X = (i) => pad.l + (i / Math.max(n - 1, 1)) * (w - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (h - pad.t - pad.b);
    const ticks = [...new Set([lo, 1, hi].map((v) => v.toFixed(3)))].map(Number);
    const grid = ticks.map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid${v === 1 ? " base" : ""}"/><text x="${w - pad.r + 6}" y="${Y(v) + 4}" class="tick">${pct(v - 1, 0)}</text>`).join("");
    const lines = series.map((s, k) => `<polyline points="${s.vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" class="mline ml-${k}"/>`).join("");
    const mk = marks.map((m) => {
      const right = X(m.i) > (pad.l + w - pad.r) / 2;
      return `<g class="mark"><line x1="${X(m.i)}" x2="${X(m.i)}" y1="${pad.t - 12}" y2="${h - pad.b}"/><text x="${X(m.i) + (right ? -4 : 4)}" y="${pad.t - 4}" class="tick"${right ? ' text-anchor="end"' : ""}>${m.label}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="chart multi" role="img" aria-label="비교 그래프">${grid}${mk}${lines}
      <text x="${pad.l}" y="${h - 5}" class="tick">탐험 시작</text><text x="${w - pad.r}" y="${h - 5}" class="tick" text-anchor="end">${n - 1}주 뒤</text></svg>
      <p class="legend">${series.map((s, k) => `<span><i class="lg ml-${k}"></i>${s.name}</span>`).join("")}</p>`;
  }
  function spark(sym) {
    const a = Math.max(0, idx(st.turn) - 11);
    const vals = D.prices[sym].slice(a, idx(st.turn) + 1);
    const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * 70).toFixed(1)},${(22 - ((v - lo) / sp) * 20).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 72 24" class="spark ${vals.at(-1) >= vals[0] ? "c-up" : "c-down"}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
  }

  const show = (id) => { const d = document.getElementById(id); if (!d.open) d.showModal(); d.scrollTop = 0; };

  // ---------- 렌더 ----------
  const $ = (s) => document.querySelector(s);

  function render() {
    const t = st.turn;
    const ind = D.indicators[idx(t)];
    const prev = D.indicators[idx(t) - 1];
    const tot = total();
    const r = tot / st.seed - 1;
    const sea = seasonAt(t);
    const SE = SEASONS[sea.id];

    document.body.dataset.season = sea.id;
    $("#turnLabel").textContent = `${t + 1}주차 / ${LAST + 1}`;
    $("#monthLabel").textContent = monthLabel(t);
    $("#totalVal").textContent = fmt(tot) + "원";
    const rEl = $("#totalRet");
    rEl.textContent = `${arrow(r)} ${pct(r)}`;
    rEl.className = "ret " + dirCls(r);
    $("#lvVal").textContent = `Lv.${level()}`;
    $("#ptVal").textContent = `${st.points}점`;
    $("#seasonPill").textContent = `${SE.icon} ${SE.name}`;
    const lp = $("#loanPill");
    lp.hidden = loan() <= 0;
    if (loan() > 0) {
      const cr = collateral();
      lp.textContent = `빌린 돈 ${short(loan())}원 · 담보 ${Math.round(cr * 100)}%`;
      lp.classList.toggle("danger", cr < WARN_RATIO);
    }
    $("#progressBar").style.width = `${(t / LAST) * 100}%`;
    $("#nextBtn").textContent = t >= LAST ? "탐험 결과 보기" : "다음 주로 ▶";

    // 탐험 지도 (3D 열기구 + 계절)
    const m = mood(ind.vix);
    $("#seasonInfo").innerHTML = `
      <div class="wheel-wrap">${ART.seasonWheel(sea.id)}</div>
      <div class="season-text">
        <p class="eyebrow">라우가 보는 지금 계절</p>
        <h2>${SE.icon} ${SE.name} <small>${SE.tag}</small></h2>
        <p class="s-rule">${SE.rule}</p>
        <p>${sea.why}</p>
        <p class="small">이 계절에 강한 편: <b>${SE.good}</b></p>
        <button class="btn-soft tiny" data-lesson="season">4계절 배우기</button>
      </div>`;
    $("#owlSpot").innerHTML = ART.owl(m.owl);
    mount3D(sea.id);

    // 경제 날씨
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
    const badgeName = { official: "공식 발표", news: "뉴스", earnings: "실적 발표" };
    $("#paperDate").textContent = monthLabel(t);
    $("#news").innerHTML = items.length
      ? items
          .map(
            (n) => `<article class="news ${n.kind}">
              <span class="badge">${badgeName[n.kind] || "뉴스"}</span>
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
        <p class="lk-how">${cat.locked ? "다음 업데이트에서 Lv.5가 되면 열려요. 이번 탐험에서는 뉴스로 먼저 만나 보세요." : `Lv.${cat.lv}가 되면 열려요. 예측을 하고 맞히거나 📚 배우기 퀴즈를 풀면 점수가 쌓여요.`}</p></div>`;
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

    renderWallet(tot);
    save();
  }

  function renderWallet(tot) {
    const held = Object.entries(st.pos).filter(([, q]) => q > 0);
    const hv = holdValue();
    const cv = classValues();
    const segName = { cash: "현금", stock: "주식·바구니", bond: "장기 채권", short: "단기 채권", cmd: "금", oil: "원유" };
    const segs = [["cash", Math.max(0, st.cash)], ...CLASSES.map((c) => [c.seg, cv[c.id]])].filter(([, v]) => v > 0);
    const base = segs.reduce((s, [, v]) => s + v, 0) || 1;
    $("#mixBar").innerHTML = segs.map(([k, v]) => `<span class="seg seg-${k}" style="flex:${v}" title="${segName[k]} ${fmt(v)}원"></span>`).join("");
    $("#mixLegend").innerHTML = segs.map(([k, v]) => `<span><i class="dot seg-${k}"></i>${segName[k]} ${((v / base) * 100).toFixed(0)}%</span>`).join("");
    $("#cashVal").textContent = fmt(st.cash) + "원";
    $("#holdVal").textContent = fmt(hv) + "원";
    $("#seedVal").textContent = fmtBig(st.seed);
    const lr = $("#loanRow");
    lr.hidden = !st.margin;
    if (st.margin) {
      const cr = collateral();
      const frozen = !canBorrow();
      lr.innerHTML = loan() > 0
        ? `<span>빌린 돈</span><b class="down">${fmt(loan())}원</b><small class="${cr < WARN_RATIO ? "warn" : ""}">담보비율 ${Math.round(cr * 100)}% · ${cr < WARN_RATIO ? "위험! 140% 아래면 강제로 팔려요" : "140% 아래면 반대매매"}</small>`
        : `<span>빌린 돈</span><b>0원</b><small>${frozen ? `반대매매 뒤라 ${st.freezeUntil - st.turn}주 동안 빌릴 수 없어요` : `최대 ${fmt(Math.max(0, LEVER_EXTRA * tot))}원까지 빌려 살 수 있어요 (연 ${LOAN_RATE * 100}% 이자)`}</small>`;
    }
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

    // 목표 나눠 담기 (자산배분)
    const p = PRESETS.find((x) => x.id === st.preset) || PRESETS[0];
    const open = level() >= 3;
    const rows = [...CLASSES.map((c) => ({ name: c.name, seg: c.seg, now: cv[c.id], goal: p.w[c.id] || 0 })), { name: "현금", seg: "cash", now: Math.max(0, st.cash), goal: 1 - Object.values(p.w).reduce((a, b) => a + b, 0) }]
      .filter((x) => x.now > 0 || x.goal > 0);
    $("#alloc").innerHTML = `
      <div class="alloc-head"><h3>목표 나눠 담기</h3>
        <select id="presetSel" aria-label="목표 비율 고르기">${PRESETS.map((x) => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${x.name}</option>`).join("")}</select></div>
      <p class="small">${p.say}</p>
      <ul class="alloc-rows">${rows.map((x) => {
        const nowP = tot > 0 ? x.now / tot : 0;
        return `<li><span>${x.name}</span><span class="ab"><i class="ab-now seg-${x.seg}" style="width:${Math.min(100, nowP * 100)}%"></i><i class="ab-goal" style="left:${x.goal * 100}%"></i></span><small>지금 ${(nowP * 100).toFixed(0)}% · 목표 ${(x.goal * 100).toFixed(1).replace(".0", "")}%</small></li>`;
      }).join("")}</ul>
      <button class="btn-soft" data-rebal ${open && loan() === 0 ? "" : "disabled"}>목표대로 나눠 담기</button>
      <p class="small" id="rebalMsg">${!open ? "🔒 Lv.3이 되면 채권·금이 열리고 한 번에 나눠 담을 수 있어요." : loan() > 0 ? "빌린 돈을 먼저 갚아야 나눠 담을 수 있어요." : "넘치는 쪽을 팔고(대표 상품 먼저, 모자라면 직접 고른 것도) 모자란 쪽은 500 바구니·국채·금·원유로 사요."}</p>
      <button class="linkbtn" data-lesson="mix">자산배분이 뭐예요?</button>`;
  }

  const GENERIC_ASKS = [
    "우리 동네에서 요즘 손님이 많아진 가게와 줄어든 가게는 어디일까?",
    "한 회사에 모든 돈을 넣으면 어떤 점이 좋고 어떤 점이 위험할까?",
    "가격이 많이 떨어진 물건은 '싸다'고 할 수 있을까?",
    "엄마·아빠가 어릴 때와 지금, 가장 많이 바뀐 물건값은 뭘까?",
    "기다리는 것도 투자일까? 오래 기다려서 좋았던 경험이 있어?",
    "돈을 빌려서 뭔가를 사 본 적 있어? 빌린 돈은 왜 더 조심해야 할까?",
    "우리 가족 돈을 주식·저금·비상금으로 나눈다면 몇 대 몇이 좋을까?",
  ];

  // ---------- 3D ----------
  let mounted = false;
  function mount3D(season) {
    if (!window.RAUM_3D) return;
    if (!mounted) {
      window.RAUM_3D.mount($("#scene"));
      mounted = true;
    }
    window.RAUM_3D.setSeason(season);
  }
  window.addEventListener("raum3d-ready", () => mount3D(seasonAt(st.turn).id));

  // ---------- 종목 상세 ----------
  let sheetSym = null, qty = 1, predDraft = null, finOpen = false;
  function openSheet(sym) {
    sheetSym = sym;
    qty = 1;
    const p = st.preds[st.turn]?.[sym];
    predDraft = p ? { ...p, reasons: [...p.reasons] } : { dir: 0, reasons: [] };
    renderSheet();
    show("sheet");
  }

  function finHtml(a) {
    const f = FIN[a.sym];
    if (!f) return a.inside ? `<details class="fin" ${finOpen ? "open" : ""}><summary>🔍 속 들여다보기</summary><p>${a.inside}</p></details>` : "";
    const p = f.prev;
    const W = (v) => v * 1e9 * D.usdKrw;
    const growth = p.rev / p.revBefore - 1;
    const margin = p.op != null ? p.op / p.rev : p.net / p.rev;
    const eq = p.assets - p.liab;
    const debt = eq > 0 ? p.liab / eq : null;
    const bars = [["매출", "장사해서 들어온 돈", p.rev], ["영업이익", "재료·월급을 빼고 장사로 남긴 돈", p.op], ["순이익", "이자·세금까지 빼고 남은 돈", p.net]].filter(([, , v]) => v != null);
    return `<details class="fin" ${finOpen ? "open" : ""}>
      <summary>📊 회사 성적표 (작년) <small>장사를 얼마나 잘했을까?</small></summary>
      <ul class="fin-bars">${bars.map(([k, d, v]) => `<li><span class="fb-k"><b>${k}</b><small>${d}</small></span><span class="fb-bar"><i style="width:${Math.max(1.5, (Math.abs(v) / p.rev) * 100)}%" class="${v < 0 ? "neg" : ""}"></i></span><b class="fb-v">${fmtBig(W(v))}</b></li>`).join("")}</ul>
      <div class="fin-chips">
        <div><span>매출 성장</span><b class="${dirCls(growth)}">${pct(growth, 0)}</b><small>${growth > 0.3 ? "쑥쑥 크는 중" : growth > 0 ? "조금씩 크는 중" : "작년보다 줄었어요"}</small></div>
        <div><span>${p.op != null ? "영업이익률" : "순이익률"}</span><b>${(margin * 100).toFixed(1)}%</b><small>1,000원 팔면 약 ${fmt(margin * 1000)}원 남겨요</small></div>
        <div><span>부채비율</span><b class="${debt == null || debt > 2 ? "down" : ""}">${debt == null ? "자본잠식" : Math.round(debt * 100) + "%"}</b><small>${debt == null ? "빚이 가진 것보다 많아요" : debt > 2 ? "빚이 많은 편" : debt > 1 ? "보통" : "빚이 적은 편"}</small></div>
      </div>
      <p class="fin-note"><span class="mini-owl">${ART.owl("ok")}</span>${f.note}</p>
      <p class="small">생각해 봐요: 손님이 갑자기 끊기면 이 회사는 얼마나 버틸 수 있을까?</p>
      <p class="small">작년(${f.fy}) 연간 보고서 기준 반올림한 값 · 1달러=${fmt(D.usdKrw)}원 · <button class="linkbtn" data-lesson="fin">성적표 읽는 법</button></p>
    </details>`;
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
    const spend = maxSpend();
    const maxBuy = Math.max(0, Math.floor(spend / price));
    const maxQ = Math.max(maxBuy, own, 1);
    qty = Math.min(Math.max(1, qty), maxQ);
    const cost = qty * price;
    const borrow = Math.max(0, cost - Math.max(0, st.cash));
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
      ${finHtml(a)}

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
          <button class="btn-soft tiny" data-qmax>최대</button>
        </div>
        <p class="small">${fmt(cost)}원 · 내 현금 ${fmt(st.cash)}원 · 가진 것 ${own}주</p>
        ${borrow > 0 && qty <= maxBuy ? `<p class="warnbox">이만큼 사려면 <b>${fmt(borrow)}원</b>을 빌려야 해요. 매주 이자가 붙고, 값이 많이 떨어지면 강제로 팔려요.</p>` : ""}
        <div class="trade-btns">
          <button class="btn buy" data-buy ${qty > maxBuy ? "disabled" : ""}>${borrow > 0 && qty <= maxBuy ? "빌려서 사기" : "사기"}</button>
          <button class="btn sell" data-sell ${qty > own ? "disabled" : ""}>팔기</button>
        </div>
        <p id="tradeMsg" class="small" aria-live="polite"></p>
      </section>`;
  }

  function trade(side) {
    const s = sheetSym, price = won(s);
    if (side > 0) {
      if (qty * price > maxSpend()) return;
      st.cash -= qty * price;
      st.pos[s] = (st.pos[s] || 0) + qty;
      st.cost[s] = (st.cost[s] || 0) + qty * price;
      if (st.cash < 0) st.everBorrowed = true;
    } else {
      sell(s, qty);
    }
    const msg = `${BY_SYM[s].name} ${qty}주를 ${side > 0 ? (st.cash < 0 ? "빌린 돈을 보태 샀어요" : "샀어요") : "팔았어요"}.`;
    renderSheet();
    $("#tradeMsg").textContent = msg;
    render();
  }
  function sell(s, q) {
    const own = st.pos[s] || 0;
    q = Math.min(q, own);
    if (q <= 0) return 0;
    st.cost[s] = st.cost[s] * ((own - q) / own);
    st.pos[s] = own - q;
    st.cash += q * won(s);
    if (!st.pos[s]) { delete st.pos[s]; delete st.cost[s]; }
    return q;
  }

  // ---------- 목표대로 나눠 담기 ----------
  function rebalance() {
    const p = PRESETS.find((x) => x.id === st.preset) || PRESETS[0];
    const tot = total();
    const cv = classValues();
    const log = [];
    // 1) 넘치는 것부터 팔기: 대표 상품 먼저, 모자라면 같은 종류의 다른 것도 큰 것부터
    for (const c of CLASSES) {
      let over = cv[c.id] - (p.w[c.id] || 0) * tot;
      if (over <= 0) continue;
      const syms = [c.rep, ...Object.keys(st.pos).filter((s) => s !== c.rep && classOf(s) === c.id).sort((a, b) => st.pos[b] * won(b) - st.pos[a] * won(a))];
      for (const s of syms) {
        if (over < won(s) / 2 || !st.pos[s]) continue;
        const q = sell(s, Math.round(over / won(s)));
        if (q) {
          over -= q * won(s);
          log.push(`${BY_SYM[s].name} ${q}주 팔기`);
        }
      }
    }
    // 2) 모자란 것 사기 (현금 안에서만)
    for (const c of CLASSES) {
      const diff = (p.w[c.id] || 0) * tot - classValues()[c.id];
      const q = Math.floor(Math.min(diff, st.cash) / won(c.rep));
      if (diff > 0 && q > 0) {
        st.cash -= q * won(c.rep);
        st.pos[c.rep] = (st.pos[c.rep] || 0) + q;
        st.cost[c.rep] = (st.cost[c.rep] || 0) + q * won(c.rep);
        log.push(`${BY_SYM[c.rep].name} ${q}주 사기`);
      }
    }
    render();
    const after = classValues(), t2 = total();
    const off = Math.max(...CLASSES.map((c) => Math.abs(after[c.id] / t2 - (p.w[c.id] || 0))));
    $("#rebalMsg").textContent = (log.length ? `${p.name}에 맞춰 ${log.join(", ")}를 했어요.` : "이미 목표와 거의 같아요.") +
      (off > 0.05 ? " 1주 값이 씨앗돈에 비해 비싸서 목표와 딱 맞추기 어려워요. 돈이 적을수록 나눠 담기가 어려운 이유예요." : "");
  }

  // ---------- 다음 주 ----------
  function nextWeek() {
    if (st.turn >= LAST) return showFinal();
    const t = st.turn;
    const before = total(t);
    st.history[t] = { total: before, syms: Object.keys(st.pos), cats: [...new Set(Object.keys(st.pos).map((s) => BY_SYM[s].cat))], loan: loan() };
    const lvBefore = level();
    st.turn = t + 1;

    // 빌린 돈 이자와 반대매매
    let interest = 0, call = null, warn = false;
    if (loan() > 0) {
      interest = Math.round((loan() * LOAN_RATE) / 52);
      st.cash -= interest;
      st.interestPaid += interest;
      const cr = collateral();
      if (cr < CALL_RATIO) call = marginCall(cr);
      else warn = cr < WARN_RATIO;
    }
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
    const seaBefore = seasonAt(t), seaNow = seasonAt(st.turn);
    const owlMood = call ? "scared" : d / Math.max(before, 1) > 0.01 ? "happy" : d / Math.max(before, 1) < -0.03 ? "worried" : "ok";

    $("#resultBody").innerHTML = `
      <div class="res-head"><span class="res-owl">${ART.owl(owlMood)}</span><div>
      <p class="eyebrow">${monthLabel(st.turn)} 결과</p>
      <h2 class="${dirCls(d)}">${d === 0 ? "내 돈은 그대로예요" : `내 돈이 ${fmt(Math.abs(d))}원 ${d > 0 ? "늘었어요" : "줄었어요"}`}</h2>
      <p class="small">${fmt(before)}원 → <b>${fmt(after)}원</b> ${Object.keys(st.pos).length || call ? "" : "(모두 현금이라 그대로예요)"}</p></div></div>
      ${call ? `<section class="callbox"><h3>🚨 반대매매가 일어났어요</h3>
        <p>담보비율이 <b>${Math.round(call.ratio * 100)}%</b>로 140% 아래로 떨어졌어요. 증권회사가 내 허락 없이 <b>${call.sold.map((x) => `${BY_SYM[x.sym].name} ${x.q}주`).join(", ")}</b>를 팔아서 빌린 돈 <b>${fmt(call.repaid)}원</b>을 가져갔어요.</p>
        <p class="small">가장 많이 떨어졌을 때 팔렸어요. 값이 다시 올라도 이미 판 주식은 돌아오지 않아요. 앞으로 ${FREEZE_TURNS}주 동안은 돈을 빌릴 수 없어요.</p>
        <button class="linkbtn" data-lesson="margin">빌린 돈이 왜 위험한지 배우기</button></section>` : ""}
      ${warn ? `<p class="warnbox">⚠️ 담보비율이 ${Math.round(collateral() * 100)}%예요. 140% 아래로 떨어지면 강제로 팔려요. 조금 팔아서 빚을 줄여 볼까요?</p>` : ""}
      ${interest ? `<p class="small">빌린 돈 이자 ${fmt(interest)}원을 냈어요. (지금까지 ${fmt(st.interestPaid)}원)</p>` : ""}
      ${seaNow.id !== seaBefore.id ? `<section class="season-change"><h3>${SEASONS[seaNow.id].icon} 계절이 바뀌었어요: ${SEASONS[seaBefore.id].name} → ${SEASONS[seaNow.id].name}</h3><p>${seaNow.why}</p></section>` : ""}
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

  // 반대매매: 가장 큰 것부터 팔아서 빌린 돈을 모두 갚아요.
  function marginCall(ratio) {
    const owed = loan();
    const sold = [];
    const order = Object.keys(st.pos).sort((a, b) => st.pos[b] * won(b) - st.pos[a] * won(a));
    for (const s of order) {
      if (st.cash >= 0) break;
      const q = sell(s, Math.ceil(-st.cash / won(s)));
      if (q) sold.push({ sym: s, q });
    }
    st.freezeUntil = st.turn + FREEZE_TURNS;
    const repaid = owed - loan();
    st.calls.push({ turn: st.turn, ratio, repaid });
    return { ratio, sold, repaid };
  }

  let pendingUnlock = null;
  function showUnlock(lv) {
    const cs = CATS.filter((c) => c.lv === lv && !c.locked);
    $("#unlockBody").innerHTML = `<div class="res-head"><span class="res-owl">${ART.owl("proud")}</span><div><p class="eyebrow">Lv.${lv} 달성!</p><h2>새 상품이 열렸어요</h2></div></div>
      ${cs.map((c) => `<div class="unlock-card"><h3>${c.name}</h3><p>${c.desc}</p></div>`).join("")}
      ${lv === 3 ? `<p class="tip">이제 <b>내 지갑 → 목표 나눠 담기</b>에서 60/40, 사계절 같은 비율로 한 번에 나눠 담을 수 있어요.</p>` : ""}
      <button class="btn" data-close data-gotab="${cs[0].id}">구경하러 가기</button>`;
    show("unlock");
  }
  function flushUnlock() {
    if (!pendingUnlock) return false;
    const lv = pendingUnlock;
    pendingUnlock = null;
    showUnlock(lv);
    return true;
  }

  // ---------- 📚 배우기 ----------
  let lessonId = null;
  const quizPick = {};
  function openLearn(id = null) {
    lessonId = id;
    renderLearn();
    show("learn");
  }
  function labHtml(kind) {
    const t1 = st.done ? LAST : st.turn;
    if (kind === "season") {
      const cur = seasonAt(t1);
      const cells = Array.from({ length: t1 + 1 }, (_, t) => `<i class="sc sc-${seasonAt(t).id}" title="${monthLabel(t)} ${SEASONS[seasonAt(t).id].name}"></i>`).join("");
      return `<section class="lab"><h3>🗺️ 비밀의 해 계절 지도 (지금 주까지)</h3>
        <div class="season-strip">${cells}</div>
        <p class="legend">${Object.entries(SEASONS).map(([k, v]) => `<span><i class="lg sc-${k}"></i>${v.icon} ${v.name}</span>`).join("")}</p>
        <p class="small">지금은 <b>${SEASONS[cur.id].icon} ${SEASONS[cur.id].name}(${SEASONS[cur.id].tag})</b>이라고 봐요. ${cur.why}</p></section>`;
    }
    if (t1 < 2) return `<section class="lab"><h3>🧪 실험실</h3><p class="small">탐험을 2주 이상 진행하면 실제 값으로 실험해 볼 수 있어요.</p></section>`;
    if (kind === "portfolio") {
      const opts = [{ name: "현금만", w: {} }, { name: "500 바구니만", w: { stock: 1 } }, ...PRESETS.map((p) => ({ name: p.name, w: p.w }))];
      const res = opts.map((o) => ({ ...o, vals: simMix(o.w, 0, t1) }));
      const chartSet = [res[1], res[2], res[4]];
      return `<section class="lab"><h3>🧪 나눠 담기 실험실 <small>탐험 시작에 사서 ${st.done ? "끝까지" : "지금까지"} 들고 있었다면?</small></h3>
        ${multiChart(chartSet.map((r) => ({ name: r.name, vals: r.vals })))}
        <table class="lab-table"><thead><tr><th>방법</th><th>지금까지</th><th>가장 크게 떨어졌을 때</th></tr></thead><tbody>
        ${res.map((r) => `<tr><td>${r.name}</td><td class="${dirCls(r.vals.at(-1) - 1)}">${pct(r.vals.at(-1) - 1)}</td><td class="${mdd(r.vals) < -0.001 ? "down" : "flat"}">${pct(mdd(r.vals))}</td></tr>`).join("")}
        </tbody></table>
        <p class="small">'가장 크게 떨어졌을 때'(최대 낙폭)가 작을수록 무서운 순간에도 버티기 쉬워요. 수익만 보지 말고 흔들림도 함께 보세요.</p></section>`;
    }
    if (kind === "leverage") {
      const one = simMix({ stock: 1 }, 0, t1);
      const { eq, called } = simLever(0, t1);
      return `<section class="lab"><h3>🧪 빌린 돈 실험실 <small>500 바구니를 내 돈만으로 vs 1.5배 빌려서</small></h3>
        ${multiChart([{ name: "내 돈만 (1배)", vals: one }, { name: "빌려서 2.5배", vals: eq }], { marks: called != null ? [{ i: called, label: "반대매매" }] : [] })}
        <p>${called != null
          ? `빌려서 산 쪽은 <b>${monthLabel(called)}</b>에 담보비율이 140% 아래로 떨어져 반대매매를 당했어요. 그 뒤로 시장이 올라도 남은 돈은 <b>${pct(eq.at(-1) - 1)}</b>에 머물러요. 내 돈만 쓴 쪽은 <b>${pct(one.at(-1) - 1)}</b>예요.`
          : `아직 반대매매는 없었어요. 지금까지 내 돈만 쓴 쪽은 <b>${pct(one.at(-1) - 1)}</b>, 빌려서 산 쪽은 <b>${pct(eq.at(-1) - 1)}</b>예요. 오를 땐 더 많이 오르지만, 떨어질 땐 어떻게 될까요?`}</p>
        <p class="small">이자 연 ${LOAN_RATE * 100}%, 담보비율 ${CALL_RATIO * 100}% 기준. 실제 증권회사마다 규칙이 달라요.</p></section>`;
    }
    return "";
  }
  function renderLearn() {
    const L = LESSONS.find((x) => x.id === lessonId);
    if (!L) {
      const doneN = LESSONS.filter((x) => st.learned[x.id]).length;
      $("#learnBody").innerHTML = `
        <header class="s-head"><span class="s-icon">${ART.owl("proud")}</span>
          <div><p class="eyebrow">라우의 투자 학교</p><h2>📚 배우기</h2><p class="s-what">퀴즈를 처음 맞히면 2점! (${doneN}/${LESSONS.length} 완료)</p></div>
          <button class="x" data-close aria-label="닫기">✕</button></header>
        <div class="lessons">${LESSONS.map((x) => `<button class="lesson-card ${st.learned[x.id] ? "done" : ""}" data-lesson="${x.id}"><span class="art-plate">${ART.lessons[x.art]()}</span><b>${x.title}</b>${st.learned[x.id] ? `<small>✅ 완료</small>` : `<small>+2점</small>`}</button>`).join("")}</div>`;
      return;
    }
    const pick = quizPick[L.id];
    const ok = pick === L.quiz.a;
    $("#learnBody").innerHTML = `
      <header class="s-head"><button class="x" data-learnback aria-label="목록으로">←</button>
        <div><p class="eyebrow">📚 배우기</p><h2>${L.title}</h2></div>
        <button class="x" data-close aria-label="닫기">✕</button></header>
      <div class="art-plate big">${L.art === "season" ? ART.seasonWheel(seasonAt(st.turn).id) : ART.lessons[L.art]()}</div>
      <div class="lesson-body">${L.body}</div>
      ${L.lab ? labHtml(L.lab) : ""}
      <section class="quiz"><h3>🧩 퀴즈</h3><p>${L.quiz.q}</p>
        <div class="quiz-opts">${L.quiz.opts.map((o, i) => `<button class="chip ${pick === i ? (ok ? "on" : "wrong") : ""}" data-quiz="${i}">${o}</button>`).join("")}</div>
        <p class="small" aria-live="polite">${pick == null ? "" : ok ? (st.learned[L.id] ? "정답이에요! 🎉" : "") : "다시 생각해 봐요. 위 설명에 힌트가 있어요."}</p></section>`;
  }
  function answerQuiz(i) {
    const L = LESSONS.find((x) => x.id === lessonId);
    quizPick[L.id] = i;
    if (i === L.quiz.a && !st.learned[L.id]) {
      const lvBefore = level();
      st.learned[L.id] = true;
      st.points += 2;
      if (level() > lvBefore) pendingUnlock = level();
      render();
    }
    renderLearn();
  }

  // ---------- 탐험 결과 ----------
  function showFinal() {
    st.done = true;
    st.history[st.turn] = { total: total(), syms: Object.keys(st.pos), cats: [...new Set(Object.keys(st.pos).map((s) => BY_SYM[s].cat))], loan: loan() };
    const fin = total();
    const r = fin / st.seed - 1;
    const spyR = usd("SPY", LAST) / usd("SPY", 0) - 1;
    const allPreds = Object.entries(st.preds).flatMap(([t, o]) => (Number(t) < st.turn ? Object.entries(o).map(([s, p]) => ({ ok: Math.sign(chg(s, Number(t) + 1)) === p.dir, why: p.reasons.length > 0 })) : []));
    const acc = allPreds.length ? allPreds.filter((p) => p.ok).length / allPreds.length : 0;
    const invested = st.history.filter((h) => h && h.syms.length);
    const avgCats = invested.length ? invested.reduce((s, h) => s + h.cats.length, 0) / invested.length : 0;
    const heldAt = (t, syms) => (st.history[t]?.syms || []).some((s) => syms.includes(s));
    const T = (date) => turnOfDate(date);
    const learnedN = LESSONS.filter((x) => st.learned[x.id]).length;
    const badges = [
      { on: [T("2020-02-28"), T("2020-03-13"), T("2020-03-20")].every((t) => heldAt(t, ASSETS.filter((a) => a.cat === "stock" || a.cat === "etf").map((a) => a.sym))), icon: "⛈️", name: "폭풍 속 버티기", how: "가장 무서웠던 3월에도 주식을 팔지 않고 버텼어요" },
      { on: heldAt(T("2020-02-28"), ["TLT", "SHY"]) || heldAt(T("2020-03-06"), ["TLT", "SHY"]), icon: "🏛️", name: "금리 박사", how: "금리가 내려가기 전에 채권을 가지고 있었어요" },
      { on: heldAt(T("2020-03-27"), ["ZM", "AMZN", "NFLX"]), icon: "🏠", name: "집콕 시대 발견", how: "사람들이 집에 머물 때 뜨는 회사를 찾아냈어요" },
      { on: heldAt(T("2020-11-06"), ["AAL", "CCL"]), icon: "💉", name: "백신 탐정", how: "백신 소식 전에 여행 회사를 가지고 있었어요" },
      { on: allPreds.length >= 10 && acc >= 0.6, icon: "🔮", name: "예측왕", how: "10번 넘게 예측하고 60% 넘게 맞혔어요" },
      { on: avgCats >= 2.5, icon: "🧺", name: "분산 박사", how: "평균 2~3가지 넘는 종류에 나눠 담았어요" },
      { on: learnedN === LESSONS.length, icon: "🎓", name: "공부왕", how: "배우기 수업을 모두 마쳤어요" },
      { on: !st.everBorrowed && invested.length >= 20, icon: "🪙", name: "내 돈으로 완주", how: "빚 없이 20주 넘게 투자했어요" },
    ];
    const stars = (x) => "★".repeat(x) + "☆".repeat(3 - x);
    const sPerf = r >= spyR ? 3 : r >= 0 ? 2 : 1;
    const sRisk = avgCats >= 2.5 && !st.calls.length ? 3 : avgCats >= 1.5 ? 2 : 1;
    const sMind = allPreds.length >= 10 && acc >= 0.55 ? 3 : allPreds.length >= 5 ? 2 : 1;
    const sLearn = learnedN >= LESSONS.length ? 3 : learnedN >= 4 ? 2 : 1;
    const series = st.history.map((h) => h?.total ?? null);
    const filled = series.map((v, i) => v ?? series.slice(0, i).reverse().find((x) => x != null) ?? st.seed);
    const W = (v) => v * 1e9 * D.usdKrw;
    $("#finalBody").innerHTML = `
      <div class="res-head"><span class="res-owl">${ART.owl("proud")}</span><div><p class="eyebrow">탐험 끝!</p><h2>${S.reveal.headline}</h2></div></div>
      <p>${S.reveal.body}</p>
      <div class="final-nums">
        <div><span>내 결과 (씨앗돈 ${fmtBig(st.seed)})</span><b class="${dirCls(r)}">${pct(r)}</b><small>${fmt(fin)}원</small></div>
        <div><span>500 바구니만 샀다면</span><b class="${dirCls(spyR)}">${pct(spyR)}</b></div>
      </div>
      <div class="chart-wrap">${lineChart(filled, { h: 150 })}</div>
      ${st.everBorrowed ? `<p class="warnbox">빌린 돈을 썼어요. 이자로 <b>${fmt(st.interestPaid)}원</b>을 냈고, 반대매매를 <b>${st.calls.length}번</b> 당했어요.</p>` : ""}
      <ul class="stars">
        <li><span>📈 성과</span><b>${stars(sPerf)}</b></li>
        <li><span>🛡️ 나눠 담기</span><b>${stars(sRisk)}</b><small>평균 ${avgCats.toFixed(1)}종류</small></li>
        <li><span>🧠 생각하는 힘</span><b>${stars(sMind)}</b><small>예측 ${allPreds.length}번 · 정답률 ${(acc * 100).toFixed(0)}%</small></li>
        <li><span>📚 배운 것</span><b>${stars(sLearn)}</b><small>수업 ${learnedN}/${LESSONS.length}</small></li>
      </ul>
      <h3>받은 배지</h3>
      <ul class="badges">${badges.map((b) => `<li class="${b.on ? "got" : ""}"><span aria-hidden="true">${b.icon}</span><b>${b.name}</b><small>${b.how}</small></li>`).join("")}</ul>
      <h3>📊 성적표 공개: 그해 회사들의 진짜 성적</h3>
      <table class="lab-table"><thead><tr><th>회사</th><th>매출 (작년 → 그해)</th><th>그해 순이익</th></tr></thead><tbody>
        ${Object.entries(FIN).map(([s, f]) => { const g = f.now.rev / f.prev.rev - 1; return `<tr><td>${BY_SYM[s].icon} ${BY_SYM[s].name}</td><td>${fmtBig(W(f.prev.rev))} → ${fmtBig(W(f.now.rev))} <b class="${dirCls(g)}">${pct(g, 0)}</b></td><td class="${dirCls(f.now.net)}">${fmtBig(W(f.now.net))}</td></tr>`; }).join("")}
      </tbody></table>
      <p class="small">집콕으로 잘 번 회사와 손님이 끊긴 회사의 성적표가 정반대예요. 주가는 이 성적표를 미리 내다보고 움직였어요.</p>
      ${labHtml("portfolio")}
      ${labHtml("leverage")}
      <p class="small">가격은 2020년의 실제 종가(1달러=1,200원으로 계산)예요. 실제 투자 추천이 아니에요.</p>
      <div class="trade-btns"><button class="btn" data-restart>씨앗돈 골라서 다시 탐험</button><button class="btn-soft" data-close>닫기</button></div>`;
    save();
    show("final");
  }

  // ---------- 시작 화면 ----------
  function showIntro() {
    $("#introArt").innerHTML = `<span class="intro-owl">${ART.owl("happy")}</span><span class="intro-balloon">${ART.balloon()}</span>`;
    const seedIn = document.querySelector(`input[name="seed"][value="${st.seed}"]`);
    if (seedIn) seedIn.checked = true;
    $("#marginChk").checked = !!st.margin;
    show("intro");
  }
  function startGame() {
    const seed = Number(document.querySelector('input[name="seed"]:checked')?.value || 10_000_000);
    const margin = $("#marginChk").checked;
    if (st.turn > 0 || Object.keys(st.pos).length || st.seed !== seed || st.margin !== margin) {
      const learned = st.learned;
      st = fresh(seed, margin);
      st.learned = learned; // 배운 것은 이어 가요
    }
    st.introDone = true;
    $("#intro").close();
    render();
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
    if (b.dataset.lesson) {
      if (dlg && dlg.id !== "learn") dlg.close();
      return openLearn(b.dataset.lesson);
    }
    if (b.dataset.learnback !== undefined) {
      lessonId = null;
      return renderLearn();
    }
    if (b.dataset.quiz) return answerQuiz(Number(b.dataset.quiz));
    if (b.id === "learnBtn") return openLearn();
    if (b.dataset.rebal !== undefined) return rebalance();
    if (b.dataset.sym) return openSheet(b.dataset.sym);
    if (b.id === "nextBtn") return st.done ? showFinal() : nextWeek();
    if (b.id === "startBtn") return startGame();
    if (b.id === "resetBtn" || b.dataset.restart !== undefined) {
      document.querySelectorAll("dialog[open]").forEach((d) => d.close());
      st.introDone = false;
      return showIntro();
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
    if (b.dataset.qmax !== undefined) {
      qty = Math.max(1, Math.floor(Math.max(0, st.cash) / won(sheetSym)) || st.pos[sheetSym] || 1);
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
  document.addEventListener("change", (e) => {
    if (e.target.id === "presetSel") {
      st.preset = e.target.value;
      render();
    }
  });
  document.addEventListener("toggle", (e) => {
    if (e.target.matches?.("details.fin")) finOpen = e.target.open;
  }, true);
  $("#result").addEventListener("close", () => {
    if (!flushUnlock() && st.turn >= LAST) showFinal();
  });
  $("#learn").addEventListener("close", flushUnlock);
  $("#intro").addEventListener("cancel", (e) => { if (!st.introDone) e.preventDefault(); });
  // 바깥 클릭으로 닫기 (상세 화면·배우기)
  for (const id of ["sheet", "learn"]) $("#" + id).addEventListener("click", (e) => { if (e.target.id === id) $("#" + id).close(); });

  window.claude?.hot?.snapshot?.(() => st);
  const start = (data) => {
    if (data && data.turn != null) st = { ...fresh(), ...data };
    render();
    if (!st.introDone) showIntro();
  };
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? null);
})();
