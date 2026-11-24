// 라움스톡 투자 아카데미 — 스토리 챕터 + 증권앱(MTS) 시뮬레이터
// 가격: 실제 일별 수정 종가(daily.js). 하루 = 한 번의 진행, 거래는 그날 종가 근처에서 체결.
(() => {
  const D = window.RAUM_DAILY;
  const FIN = window.RAUM_FIN || {};
  const ST = window.RAUM_STORY;
  const FX = D.usdKrw;
  const FEE = 0.0025;
  const DIV_TAX = 0.15;
  const KEY = "raumstock-academy-v1";
  const START_DI = D.dates.indexOf("2020-01-02");
  const LAST_DI = D.dates.length - 1;

  const CO = {
    AAPL: { ko: "애플", desc: "아이폰·맥·아이패드와 앱스토어·음악 같은 서비스를 파는 회사", sector: "기술" },
    AMZN: { ko: "아마존", desc: "세계 최대 온라인 쇼핑몰이자 클라우드(AWS) 1위 회사", sector: "소비·클라우드" },
    ZM: { ko: "줌 비디오", desc: "화상회의 서비스 회사. 2019년 4월 상장", sector: "소프트웨어" },
    NFLX: { ko: "넷플릭스", desc: "월 구독료를 받는 영상 스트리밍 회사", sector: "미디어" },
    AAL: { ko: "아메리칸항공", desc: "미국 최대 항공사 중 하나", sector: "항공" },
    CCL: { ko: "카니발", desc: "세계 최대 크루즈 여행 회사", sector: "여행" },
    XOM: { ko: "엑슨모빌", desc: "석유·가스를 캐고 정제해 파는 에너지 회사", sector: "에너지" },
    SPY: { ko: "S&P500 ETF", desc: "미국 대형주 500개를 한 번에 담은 ETF (SPDR S&P 500)", sector: "ETF" },
  };
  const WATCH = ["AAPL", "AMZN", "ZM", "NFLX", "AAL", "CCL", "XOM", "SPY"];
  const NEWS = [...(window.RAUM_SCENARIO?.news || []), ...ST.extraNews].sort((a, b) => a.date.localeCompare(b.date));

  // ---------- 상태 ----------
  const fresh = () => ({
    di: START_DI, seed: 0, cash: 0, pos: {}, orders: [], hist: [], divPending: [], fees: 0, realized: 0, divRecv: 0,
    ch: 0, step: 0, done: {}, preds: {}, quiz: {}, marks: {}, peakSince: {},
    view: "home", sym: "AAPL", tab: "chart", range: "3M", ctype: "line", oid: 1, inbox: [], ran: {}, freeMode: false,
  });
  let S = load() || fresh();
  function load() { try { const r = localStorage.getItem(KEY); return r ? { ...fresh(), ...JSON.parse(r) } : null; } catch { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

  // ---------- 계산 ----------
  const date = (di = S.di) => D.dates[di];
  const px = (sym, di = S.di) => D.prices[sym][di];
  const dayChg = (sym, di = S.di) => px(sym, di) / px(sym, di - 1) - 1;
  const tick = 0.01;
  const ask = (sym) => +(px(sym) + tick).toFixed(2);
  const bid = (sym) => +(px(sym) - tick).toFixed(2);
  const holdVal = () => Object.entries(S.pos).reduce((s, [k, p]) => s + p.qty * px(k) * FX, 0);
  const total = () => S.cash + holdVal();
  const pending = () => S.orders.filter((o) => o.status === "open");
  const reservedCash = () => pending().filter((o) => o.side === "buy").reduce((s, o) => s + o.qty * o.price * FX * (1 + FEE), 0);
  const reservedQty = (sym) => pending().filter((o) => o.side === "sell" && o.sym === sym).reduce((s, o) => s + o.qty, 0);
  const availCash = () => S.cash - reservedCash();
  const availQty = (sym) => (S.pos[sym]?.qty || 0) - reservedQty(sym);

  const fmt = (n, d = 0) => Number(n).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const won = (n) => (n < 0 ? "−" : "") + fmt(Math.abs(Math.round(n))) + "원";
  const wonShort = (n) => { const a = Math.abs(n), s = n < 0 ? "−" : ""; return a >= 1e12 ? s + fmt(a / 1e12, 1) + "조" : a >= 1e8 ? s + fmt(a / 1e8, a >= 1e10 ? 0 : 1) + "억" : a >= 1e4 ? s + fmt(a / 1e4) + "만" : s + fmt(a); };
  const usd = (n) => "$" + fmt(n, 2);
  const pct = (x, d = 2) => (x > 0 ? "+" : "") + (x * 100).toFixed(d) + "%";
  const cls = (x) => (x > 1e-9 ? "up" : x < -1e-9 ? "down" : "flat");
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = (d = date()) => { const t = new Date(d + "T00:00:00Z"); return `${d.slice(0, 4)}.${d.slice(5, 7)}.${d.slice(8)} (${WD[t.getUTCDay()]})`; };
  const shortDate = (d) => `${Number(d.slice(5, 7))}.${Number(d.slice(8))}`;
  const diOf = (d) => { let i = D.dates.findIndex((x) => x >= d); return i < 0 ? LAST_DI : i; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- 주문 · 체결 ----------
  function fill(o, price) {
    const amt = o.qty * price * FX, fee = amt * FEE;
    if (o.side === "buy") {
      S.cash -= amt + fee;
      const p = (S.pos[o.sym] ||= { qty: 0, cost: 0 });
      p.qty += o.qty;
      p.cost += amt + fee;
    } else {
      const p = S.pos[o.sym];
      const costPart = (p.cost * o.qty) / p.qty;
      S.cash += amt - fee;
      S.realized += amt - fee - costPart;
      p.qty -= o.qty;
      p.cost -= costPart;
      if (p.qty <= 0) delete S.pos[o.sym];
      o.pnl = amt - fee - costPart;
    }
    S.fees += fee;
    o.status = "filled";
    o.fillPrice = price;
    o.fillDate = date();
    S.hist.unshift({ ...o });
    return o;
  }
  function placeOrder({ side, type, sym, qty, price }) {
    qty = Math.floor(qty);
    if (!(qty > 0)) return { err: "수량을 1주 이상 입력하세요." };
    const now = side === "buy" ? ask(sym) : bid(sym);
    if (type === "market") price = now;
    price = +(+price).toFixed(2);
    if (!(price > 0)) return { err: "가격을 확인하세요." };
    if (side === "buy" && qty * price * FX * (1 + FEE) > availCash() + 0.5) return { err: "주문가능금액이 부족해요." };
    if (side === "sell" && qty > availQty(sym)) return { err: "팔 수 있는 수량이 부족해요." };
    const o = { id: S.oid++, side, type, sym, qty, price, date: date(), status: "open" };
    const marketable = type === "market" || (side === "buy" ? price >= now : price <= now);
    S.orders.push(o);
    if (marketable) fill(o, now); // 바로 살 수 있는 가격이면 지금 호가에 체결
    emit({ type: "order", order: o });
    if (o.status === "filled") emit({ type: "fill", order: o });
    return { order: o };
  }
  function cancelOrder(id) {
    const o = S.orders.find((x) => x.id === id && x.status === "open");
    if (o) { o.status = "canceled"; emit({ type: "cancel", order: o }); }
  }

  // ---------- 하루 진행 ----------
  function nextDay() {
    if (S.di >= LAST_DI) return [];
    const prevDate = date();
    S.di++;
    const d = date();
    const events = [];
    // 배당: 배당락일에 전날 보유 수량으로 받을 권리, 지급일에 입금
    for (const v of ST.dividends) {
      if (v.ex > prevDate && v.ex <= d) {
        const q = S.pos[v.sym]?.qty || 0;
        if (q > 0) S.divPending.push({ ...v, qty: q });
      }
    }
    S.divPending = S.divPending.filter((v) => {
      if (v.pay <= d) {
        const gross = v.qty * v.dps * FX, net = gross * (1 - DIV_TAX);
        S.cash += net;
        S.divRecv += net;
        S.hist.unshift({ kind: "div", sym: v.sym, qty: v.qty, dps: v.dps, net, date: d });
        events.push({ kind: "div", text: `${CO[v.sym].ko} 배당금 ${won(net)} 입금 (세후, ${v.qty}주 × ${usd(v.dps)})` });
        return false;
      }
      return true;
    });
    // 미체결 지정가: 그날 종가가 지정가에 닿으면 지정가로 체결
    for (const o of pending()) {
      const c = px(o.sym);
      if ((o.side === "buy" && c <= o.price) || (o.side === "sell" && c >= o.price)) {
        if (o.side === "sell" && (S.pos[o.sym]?.qty || 0) < o.qty) continue;
        fill(o, o.price);
        events.push({ kind: "fill", text: `${CO[o.sym].ko} ${o.qty}주 ${o.side === "buy" ? "매수" : "매도"} 체결 (${usd(o.price)})` });
        emit({ type: "fill", order: o }, true);
      }
    }
    for (const n of NEWS) if (n.date > prevDate && n.date <= d) events.push({ kind: "news", n });
    for (const k of Object.keys(S.peakSince)) S.peakSince[k] = { peak: Math.max(S.peakSince[k].peak, total()), dd: Math.min(S.peakSince[k].dd, total() / Math.max(S.peakSince[k].peak, total()) - 1) };
    return events;
  }
  function advance(days, stopAt) {
    const all = [];
    for (let i = 0; i < days && S.di < LAST_DI; i++) {
      if (stopAt && date() >= stopAt) break;
      all.push(...nextDay());
    }
    S.inbox = all;
    emit({ type: "day" });
    if (all.some((e) => e.kind === "news" || e.kind === "div")) openSheet("inbox");
    else if (all.length) toast(all.map((e) => e.text).join("<br>"));
  }

  // ---------- 스토리 도우미 (story.js에 넘김) ----------
  const G = {
    get view() { return S.view; }, get sym() { return S.sym; }, get tab() { return S.tab; },
    price: (s) => px(s), pending, total, seed: () => S.seed, won,
    fills: () => S.hist.filter((h) => !h.kind).length, fees: () => S.fees, realized: () => S.realized, divTotal: () => S.divRecv,
    holdings: () => Object.keys(S.pos), dayChg: (s) => dayChg(s),
    predictHits: () => Object.values(S.preds).filter((p) => p.hit).length,
    mark: (k) => { S.marks[k] = { di: S.di, total: total() }; S.peakSince[k] = { peak: total(), dd: 0 }; },
    markTotal: (k) => S.marks[k]?.total ?? total(), markDate: (k) => date(S.marks[k]?.di ?? S.di),
    rangeChg: (s, from) => px(s) / px(s, diOf(from)) - 1,
    drawdownSince: (k) => S.peakSince[k]?.dd ?? 0,
  };

  // ---------- 스토리 진행 ----------
  const chapter = () => ST.chapters[S.ch];
  const step = () => chapter()?.steps[S.step];
  const storyDone = () => S.ch >= ST.chapters.length;
  function emit(ev, quiet) {
    const s = step();
    if (s?.check && s.check(G, ev)) return nextStep();
    if (s?.free && date() >= s.free) return nextStep();
    if (!quiet) render();
  }
  function nextStep() {
    S.step++;
    if (S.step >= chapter().steps.length) {
      S.done[chapter().id] = true;
      S.ch++;
      S.step = 0;
      if (!storyDone()) toast(`${chapter().no}장 「${chapter().title}」이 열렸어요`);
    }
    autoSteps();
    save();
    render();
  }
  function autoSteps() {
    let s = step();
    while (s) {
      const key = `${S.ch}-${S.step}`;
      if (s.run && !S.ran[key]) { s.run(G); S.ran[key] = true; }
      if (s.skipIf && s.skipIf(G)) { S.step++; s = step(); continue; }
      if (s.check && s.check(G, { type: "init" })) { S.step++; s = step(); continue; }
      if (s.free && date() >= s.free) { S.step++; s = step(); continue; }
      break;
    }
    if (S.step >= (chapter()?.steps.length ?? 0) && !storyDone()) nextStep();
  }

  // ---------- 화면 ----------
  const $ = (s) => document.querySelector(s);
  const caps = () => Object.fromEntries(Object.entries(FIN).map(([s, f]) => [s, (px(s) * f.sharesM) / 1e3]));
  window.RAUM_GAME = { caps };
  function updateCity() {
    const el = $("#city");
    el.hidden = S.view !== "home";
    window.RAUM_CITY?.setCaps(caps());
  }
  window.addEventListener("raum-city", updateCity);
  function render() {
    renderTop();
    updateCity();
    const v = { home: viewHome, watch: viewWatch, stock: viewStock, account: viewAccount, learn: viewLearn }[S.view] || viewHome;
    $("#view").innerHTML = v();
    document.querySelectorAll("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === S.view || (S.view === "stock" && b.dataset.nav === "watch")));
    renderCoach();
    document.querySelectorAll(".pulse").forEach((e) => e.classList.remove("pulse"));
    const s = step();
    if (s?.pulse) document.querySelectorAll(s.pulse).forEach((e) => e.classList.add("pulse"));
    save();
  }

  function renderTop() {
    const t = total(), r = S.seed ? t / S.seed - 1 : 0;
    const vix = D.vix[S.di];
    $("#top").innerHTML = `
      <div class="t-date"><b>${dateLabel()}</b><span>장 마감 · 종가 기준</span></div>
      ${vix ? `<span class="vix ${vix >= 40 ? "fear" : vix >= 25 ? "warn" : ""}" title="공포지수">VIX ${vix.toFixed(0)}</span>` : ""}
      <div class="t-total"><b>${S.seed ? won(t) : "—"}</b><span class="${cls(r)}">${S.seed ? pct(r) : "계좌 개설 전"}</span></div>`;
  }

  function chapterState(i) {
    if (S.done[ST.chapters[i].id]) return "done";
    return i === S.ch ? "now" : i < S.ch ? "done" : "lock";
  }
  function viewHome() {
    const cur = chapter();
    const progress = Object.keys(S.done).length;
    return `
      <section class="hero">
        <p class="eyebrow">RAUMSTOCK ACADEMY</p>
        <h1>실제 2020년 시장으로<br>투자의 흐름을 배워요</h1>
        <p class="muted">계좌 개설부터 실적 발표, 폭락, 배당, 세금까지. 하루씩 시간을 보내며 직접 사고팔아 보세요.</p>
        <div class="hero-bar"><i style="width:${(progress / ST.chapters.length) * 100}%"></i></div>
        <p class="small">${progress}/${ST.chapters.length} 챕터 완료</p>
        ${cur ? `<button class="btn primary" data-act="continue">${S.step || S.ch ? "이어하기" : "시작하기"} · ${cur.no}장 ${cur.title}</button>` : `<button class="btn primary" data-act="free-time">12월 31일까지 이어 가기</button>`}
      </section>
      <h2 class="sec">챕터</h2>
      <ol class="chapters">
        ${ST.chapters.map((c, i) => {
          const s = chapterState(i);
          return `<li class="chap ${s}"><span class="tw"><img class="thumb" src="img/cover-${c.id}.webp" alt="" loading="lazy"><span class="no">${s === "done" ? "✓" : c.no}</span></span><div><b>${c.title}</b><small>${c.sub}</small><small class="muted">${c.period}</small></div><span class="tag">${s === "done" ? "완료" : s === "now" ? "진행 중" : "잠김"}</span></li>`;
        }).join("")}
        <li class="chap free"><span class="tw"><img class="thumb" src="img/cover-c8.webp" alt="" loading="lazy"><span class="no">8</span></span><div><b>나만의 포트폴리오 · 2020년 자유 투자</b><small>ETF · 채권 · 금 · 원유 · 자산배분 · 시장의 4계절 · 신용</small><small class="muted">주 단위로 1년 전체 · 언제든 플레이 가능</small></div><a class="tag link" href="free.html">열기 ›</a></li>
      </ol>
      <p class="foot">가격은 실제 일별 수정 종가(분할·배당 반영), 재무 숫자는 SEC 10-K 공시, 환율은 1달러 = 1,200원 고정이에요. 투자 권유가 아닌 교육용 시뮬레이션이에요. <button class="linkbtn" data-act="reset">처음부터 다시</button></p>`;
  }

  function viewWatch() {
    return `<h2 class="sec">관심종목 <small>${shortDate(date())} 종가</small></h2>
      <ul class="watch">${WATCH.map((s) => {
        const c = dayChg(s), own = S.pos[s]?.qty;
        return `<li><button class="wrow" data-sym="${s}">
          <span class="logo l-${s}">${s.slice(0, 1)}</span>
          <span class="wn"><b>${CO[s].ko}</b><small>${s}${own ? ` · <em>${own}주 보유</em>` : ""}</small></span>
          ${spark(s)}
          <span class="wp"><b>${usd(px(s))}</b><small class="${cls(c)}">${pct(c)}</small></span>
        </button></li>`;
      }).join("")}</ul>`;
  }
  function spark(s) {
    const a = Math.max(0, S.di - 21), v = D.prices[s].slice(a, S.di + 1);
    const lo = Math.min(...v), hi = Math.max(...v), sp = hi - lo || 1;
    return `<svg class="spark ${cls(v.at(-1) - v[0])}" viewBox="0 0 60 22" aria-hidden="true"><polyline points="${v.map((x, i) => `${(i / (v.length - 1)) * 60},${20 - ((x - lo) / sp) * 18}`).join(" ")}"/></svg>`;
  }

  // ----- 종목 화면 -----
  const RANGES = { "1M": 21, "3M": 63, "6M": 126, "1Y": 252 };
  function viewStock() {
    const s = S.sym, c = dayChg(s), f = FIN[s], own = S.pos[s];
    const tabs = [["chart", "차트"], ["book", "호가"], ["info", "정보"], ...(f ? [["fin", "재무"]] : [])];
    if (!tabs.some(([k]) => k === S.tab)) S.tab = "chart";
    const body = { chart: stockChart, book: orderBook, info: stockInfo, fin: stockFin }[S.tab](s);
    return `
      <div class="s-head"><button class="back" data-nav="watch" aria-label="관심종목으로">‹</button>
        <div><p class="eyebrow">${s} · ${CO[s].sector}</p><h2>${CO[s].ko}</h2></div></div>
      <div class="s-price"><b>${usd(px(s))}</b><span class="${cls(c)}">${c >= 0 ? "▲" : "▼"} ${usd(Math.abs(px(s) - px(s, S.di - 1)))} (${pct(c)})</span><small class="muted">≈ ${won(px(s) * FX)}</small></div>
      ${own ? `<div class="own-strip"><span>보유 ${own.qty}주 · 평균 ${usd(own.cost / own.qty / FX)}</span><b class="${cls(own.qty * px(s) * FX - own.cost)}">${pct((own.qty * px(s) * FX) / own.cost - 1)}</b></div>` : ""}
      <div class="seg" role="tablist">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}">${n}</button>`).join("")}</div>
      <div class="s-body">${body}</div>
      <div class="cta"><button class="btn sell-cta" data-order="sell">매도</button><button class="btn buy-cta" data-order="buy">매수</button></div>`;
  }
  function stockChart(s) {
    const n = RANGES[S.range];
    const a = Math.max(0, S.di - n);
    const vals = D.prices[s].slice(a, S.di + 1), dates = D.dates.slice(a, S.di + 1);
    let svg;
    if (S.ctype === "candle") {
      const weeks = [];
      dates.forEach((d, i) => {
        const t = new Date(d + "T00:00:00Z"), wk = Math.floor((t - Date.UTC(2019, 0, 7)) / (7 * 864e5));
        const last = weeks.at(-1);
        if (!last || last.wk !== wk) weeks.push({ wk, o: vals[i], h: vals[i], l: vals[i], c: vals[i], d });
        else { last.h = Math.max(last.h, vals[i]); last.l = Math.min(last.l, vals[i]); last.c = vals[i]; }
      });
      svg = candleSvg(weeks);
    } else svg = lineSvg(vals);
    const news = NEWS.filter((x) => x.date >= dates[0] && x.date <= date() && (x.hint?.[s] || (s === "SPY" && x.kind === "official"))).slice(-4);
    const hi52 = Math.max(...D.prices[s].slice(Math.max(0, S.di - 252), S.di + 1)), lo52 = Math.min(...D.prices[s].slice(Math.max(0, S.di - 252), S.di + 1));
    return `<div class="chart-tools">
        <div class="seg sm">${Object.keys(RANGES).map((r) => `<button data-range="${r}" class="${S.range === r ? "on" : ""}">${r}</button>`).join("")}</div>
        <div class="seg sm">${[["line", "선"], ["candle", "주봉"]].map(([k, n]) => `<button data-ctype="${k}" class="${S.ctype === k ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <div class="chart-box">${svg}</div>
      <p class="small muted">${dates[0].slice(2, 4)}.${shortDate(dates[0])} ~ ${date().slice(2, 4)}.${shortDate(date())} · 수정주가${S.ctype === "candle" ? " · 주봉은 일별 종가로 만든 캔들(시가=그 주 첫 종가)" : ""}</p>
      <dl class="kv"><div><dt>52주 최고</dt><dd>${usd(hi52)}</dd></div><div><dt>52주 최저</dt><dd>${usd(lo52)}</dd></div><div><dt>오늘 등락</dt><dd class="${cls(dayChg(s))}">${pct(dayChg(s))}</dd></div></dl>
      ${news.length ? `<h3 class="sub">관련 뉴스</h3><ul class="nlist">${news.reverse().map((x) => `<li><small>${shortDate(x.date)}</small> ${esc(x.headline)}</li>`).join("")}</ul>` : ""}`;
  }
  function frame(lo, hi, w, h, pad) {
    const sp = hi - lo || hi * 0.05 || 1, y0 = lo - sp * 0.06, y1 = hi + sp * 0.06;
    return { Y: (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (h - pad.t - pad.b), ticks: [lo, (lo + hi) / 2, hi] };
  }
  function lineSvg(vals) {
    const w = 360, h = 200, pad = { l: 4, r: 52, t: 10, b: 10 };
    const { Y, ticks } = frame(Math.min(...vals), Math.max(...vals), w, h, pad);
    const X = (i) => pad.l + (i / Math.max(vals.length - 1, 1)) * (w - pad.l - pad.r);
    const up = vals.at(-1) >= vals[0];
    const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" class="chart ${up ? "up" : "down"}" role="img" aria-label="가격 차트">
      ${ticks.map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${w - pad.r + 6}" y="${Y(v) + 4}" class="tk">${usd(v)}</text>`).join("")}
      <polygon points="${X(0)},${h - pad.b} ${pts} ${X(vals.length - 1)},${h - pad.b}" class="area"/>
      <polyline points="${pts}" class="ln"/><circle cx="${X(vals.length - 1)}" cy="${Y(vals.at(-1))}" r="3.5" class="dot"/></svg>`;
  }
  function candleSvg(ws) {
    const w = 360, h = 200, pad = { l: 4, r: 52, t: 10, b: 10 };
    const { Y, ticks } = frame(Math.min(...ws.map((x) => x.l)), Math.max(...ws.map((x) => x.h)), w, h, pad);
    const bw = (w - pad.l - pad.r) / ws.length;
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="주봉 차트">
      ${ticks.map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${w - pad.r + 6}" y="${Y(v) + 4}" class="tk">${usd(v)}</text>`).join("")}
      ${ws.map((k, i) => { const x = pad.l + i * bw + bw / 2, c = k.c >= k.o ? "cu" : "cd", top = Y(Math.max(k.o, k.c)), bh = Math.max(1, Math.abs(Y(k.o) - Y(k.c)));
        return `<line x1="${x}" x2="${x}" y1="${Y(k.h)}" y2="${Y(k.l)}" class="${c}"/><rect x="${x - bw * 0.32}" y="${top}" width="${bw * 0.64}" height="${bh}" class="${c}"/>`; }).join("")}</svg>`;
  }
  // 연습용 호가: 실제 호가가 아니라 종가 주변에 만든 가상 주문 (날짜·종목으로 고정된 난수)
  function rng(seed) { let x = seed % 2147483647 || 1; return () => (x = (x * 48271) % 2147483647) / 2147483647; }
  function orderBook(s) {
    const r = rng(S.di * 97 + s.charCodeAt(0) * 13 + s.length);
    const p = px(s), lv = 8;
    const asks = Array.from({ length: lv }, (_, i) => ({ p: +(p + tick * (i + 1)).toFixed(2), q: Math.round(200 + r() * 3800) })).reverse();
    const bids = Array.from({ length: lv }, (_, i) => ({ p: +(p - tick * (i + 1)).toFixed(2), q: Math.round(200 + r() * 3800) }));
    const max = Math.max(...asks.map((x) => x.q), ...bids.map((x) => x.q));
    const row = (x, side) => `<li class="${side}"><span class="bq">${side === "ask" ? `<i style="width:${(x.q / max) * 100}%"></i>${fmt(x.q)}` : ""}</span><b>${usd(x.p)}</b><span class="bq">${side === "bid" ? `<i style="width:${(x.q / max) * 100}%"></i>${fmt(x.q)}` : ""}</span></li>`;
    return `<ul class="book">${asks.map((x) => row(x, "ask")).join("")}<li class="mid"><span>현재가</span><b>${usd(p)}</b><span class="${cls(dayChg(s))}">${pct(dayChg(s))}</span></li>${bids.map((x) => row(x, "bid")).join("")}</ul>
      <p class="small muted">위: 매도호가 · 아래: 매수호가 · 스프레드 ${usd(tick * 2)}<br>연습용 가상 호가예요. 실제 그날의 호가·잔량이 아니에요.</p>`;
  }
  function stockInfo(s) {
    const f = FIN[s], p = px(s);
    const rows = [["현재가", `${usd(p)} (≈ ${won(p * FX)})`]];
    if (f) {
      const mcap = p * f.sharesM * 1e6;
      rows.push(["시가총액", `${usd(mcap / 1e9).replace("$", "$")}B ≈ ${wonShort(mcap * FX)}원`], ["EPS (작년, 희석)", usd(f.eps)], ["PER", f.eps > 0 ? `${(p / f.eps).toFixed(1)}배` : "적자"], ["주식 수 (희석 가중평균)", `${fmt(f.sharesM)}백만 주`]);
    }
    rows.push(["업종", CO[s].sector], ["거래 시간", "한국 시간 23:30~06:00 (서머타임 22:30~05:00)"], ["가격 제한폭", "없음 (시장 전체 급락 시 서킷브레이커)"]);
    return `<p class="desc">${CO[s].desc}</p><dl class="kv list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      ${f ? `<p class="small muted">EPS·주식 수는 작년 10-K 기준이며 이 게임의 수정주가와 같은 분할 기준으로 맞췄어요.</p>` : `<p class="small muted">ETF는 회사가 아니라 여러 종목을 담은 상품이라 PER·재무제표 대신 담긴 종목을 봐요.</p>`}`;
  }
  function stockFin(s) {
    const f = FIN[s], p = f.prev, B = (v) => v * 1e9 * FX;
    const growth = p.rev / p.revBefore - 1, opm = p.op != null ? p.op / p.rev : null, npm = p.net / p.rev;
    const eq = p.assets - p.liab, debt = eq > 0 ? p.liab / eq : null;
    const bars = [["매출", p.rev], ["영업이익", p.op], ["순이익", p.net]].filter(([, v]) => v != null);
    return `<h3 class="sub">손익계산서 <small>작년 · ${f.fy}</small></h3>
      <ul class="fbars">${bars.map(([k, v]) => `<li><span>${k}</span><span class="fb"><i style="width:${Math.max(1.5, (v / p.rev) * 100)}%"></i></span><b>$${fmt(v, v < 10 ? 2 : 1)}B</b><small>${wonShort(B(v))}원</small></li>`).join("")}</ul>
      <dl class="kv"><div><dt>매출 성장</dt><dd class="${cls(growth)}">${pct(growth, 1)}</dd></div><div><dt>${opm != null ? "영업이익률" : "순이익률"}</dt><dd>${((opm ?? npm) * 100).toFixed(1)}%</dd></div><div><dt>부채비율</dt><dd class="${debt == null || debt > 2 ? "down" : ""}">${debt == null ? "자본잠식" : (debt * 100).toFixed(0) + "%"}</dd></div></dl>
      <h3 class="sub">재무상태표</h3>
      <dl class="kv list"><div><dt>자산</dt><dd>$${fmt(p.assets, 1)}B</dd></div><div><dt>부채</dt><dd>$${fmt(p.liab, 1)}B</dd></div><div><dt>자본</dt><dd class="${eq < 0 ? "down" : ""}">$${fmt(eq, 2)}B</dd></div></dl>
      <p class="note">${f.note}</p>
      <p class="small muted">출처: SEC EDGAR 10-K (접수번호 ${f.src}).</p>`;
  }

  // ----- 내 계좌 -----
  function viewAccount() {
    if (!S.seed) return `<h2 class="sec">내 계좌</h2><p class="empty">아직 계좌를 열지 않았어요. 홈에서 1장을 시작하세요.</p>`;
    const hv = holdVal(), t = total(), cost = Object.values(S.pos).reduce((s, p) => s + p.cost, 0);
    const open = pending();
    return `<h2 class="sec">내 계좌</h2>
      <section class="acct">
        <p class="muted">총자산</p><b class="big">${won(t)}</b><span class="${cls(t - S.seed)}">${pct(t / S.seed - 1)} (${won(t - S.seed)})</span>
        <dl class="kv list">
          <div><dt>예수금</dt><dd>${won(S.cash)}</dd></div>
          <div><dt>주문가능금액</dt><dd>${won(availCash())}</dd></div>
          <div><dt>평가금액</dt><dd>${won(hv)}</dd></div>
          <div><dt>평가손익</dt><dd class="${cls(hv - cost)}">${won(hv - cost)}</dd></div>
          <div><dt>실현손익</dt><dd class="${cls(S.realized)}">${won(S.realized)}</dd></div>
          <div><dt>받은 배당 (세후)</dt><dd>${won(S.divRecv)}</dd></div>
          <div><dt>낸 수수료</dt><dd>${won(S.fees)}</dd></div>
        </dl>
      </section>
      <h3 class="sub">보유 종목</h3>
      ${Object.keys(S.pos).length ? `<ul class="holds">${Object.entries(S.pos).map(([s, p]) => {
        const v = p.qty * px(s) * FX, r = v / p.cost - 1;
        return `<li><button class="hrow" data-sym="${s}"><span class="wn"><b>${CO[s].ko}</b><small>${p.qty}주 · 평균 ${usd(p.cost / p.qty / FX)} (수수료 포함)</small></span><span class="wp"><b>${won(v)}</b><small class="${cls(r)}">${pct(r)} · ${won(v - p.cost)}</small></span></button></li>`;
      }).join("")}</ul>` : `<p class="empty">보유 종목이 없어요.</p>`}
      <h3 class="sub">미체결 <small>${open.length}건</small></h3>
      ${open.length ? `<ul class="orders">${open.map((o) => `<li><span class="${o.side === "buy" ? "up" : "down"}">${o.side === "buy" ? "매수" : "매도"}</span> ${CO[o.sym].ko} ${o.qty}주 · 지정가 ${usd(o.price)} <small>${shortDate(o.date)} 주문</small><button class="btn xs" data-cancel="${o.id}">취소</button></li>`).join("")}</ul>` : `<p class="empty">미체결 주문이 없어요.</p>`}
      <h3 class="sub">거래 내역</h3>
      ${S.hist.length ? `<ul class="orders">${S.hist.slice(0, 30).map((h) => h.kind === "div"
        ? `<li><span class="mint">배당</span> ${CO[h.sym].ko} ${h.qty}주 · ${won(h.net)} <small>${shortDate(h.date)}</small></li>`
        : `<li><span class="${h.side === "buy" ? "up" : "down"}">${h.side === "buy" ? "매수" : "매도"}</span> ${CO[h.sym].ko} ${h.qty}주 · ${usd(h.fillPrice)} ${h.type === "market" ? "시장가" : "지정가"}${h.pnl != null ? ` · <b class="${cls(h.pnl)}">${won(h.pnl)}</b>` : ""} <small>${shortDate(h.fillDate)}</small></li>`).join("")}</ul>` : `<p class="empty">아직 거래가 없어요.</p>`}`;
  }

  function viewLearn() {
    return `<h2 class="sec">용어 사전</h2>
      <dl class="gloss">${ST.glossary.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <p class="small muted">더 깊은 수업(금리와 채권, 자산배분, 시장의 4계절, 신용과 반대매매)은 8장 자유 투자 모드의 '배우기'에 있어요.</p>`;
  }

  // ---------- 코치 (스토리 진행) ----------
  const COACH_AV = `<span class="av" aria-hidden="true">R</span>`;
  function txt(v) { return typeof v === "function" ? v(G) : v; }
  function renderCoach() {
    const s = step(), box = $("#coach");
    if (!s) { box.className = "coach hide"; box.innerHTML = ""; renderTimebar(s); return; }
    const ch = chapter();
    const head = `<div class="c-head">${COACH_AV}<span>${ch.no}장 · ${ch.title}</span><small>${S.step + 1}/${ch.steps.length}</small></div>`;
    renderTimebar(s);
    if (s.task || s.free) {
      box.className = "coach mini";
      box.innerHTML = `${head}<p>🎯 ${txt(s.task)}</p>${s.free ? `<p class="small muted">목표일 ${dateLabel(D.dates[diOf(s.free)])} · ${Math.max(0, diOf(s.free) - S.di)}거래일 남음</p>` : ""}`;
      return;
    }
    box.className = "coach full";
    let body = "", actions = `<button class="btn primary" data-act="next">다음</button>`;
    const cover = `<img class="cover" src="img/cover-${ch.id}.webp" alt="">`;
    if (s.say) body = `${S.step === 0 ? cover : ""}${s.title ? `<h3>${s.title}</h3>` : ""}<p>${txt(s.say)}</p>`;
    if (s.setup) {
      body = `<h3>씨앗돈을 입금하세요</h3><p class="muted">얼마로 시작하느냐에 따라 경험이 달라져요.</p>
        <div class="seeds">${[[1_000_000, "100만 원", "비싼 주식은 몇 주밖에 못 사요. 나눠 담기가 어려워요."], [10_000_000, "1,000만 원", "여러 종목을 사 보기 좋은 기본값"], [100_000_000, "1억 원", "금액이 커도 잃는 비율은 똑같아요"]].map(([v, n, d]) => `<button class="seed" data-seed="${v}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>`;
      actions = "";
    }
    if (s.quiz) {
      const a = S.quiz[`${ch.id}-${S.step}`];
      body = `<h3>퀴즈</h3><p>${s.quiz.q}</p><div class="opts">${s.quiz.opts.map((o, i) => `<button class="opt ${a == null ? "" : i === s.quiz.a ? "right" : i === a ? "wrong" : ""}" data-quiz="${i}" ${a != null ? "disabled" : ""}>${o}</button>`).join("")}</div>${a != null ? `<p class="why ${a === s.quiz.a ? "ok" : "no"}">${a === s.quiz.a ? "정답!" : "아쉬워요."} ${s.quiz.why}</p>` : ""}`;
      actions = a != null ? actions : "";
    }
    if (s.predict) {
      body = `<h3>예측해 보세요</h3><p>${s.predict.q}</p><div class="opts">${s.predict.opts.map((o, i) => `<button class="opt" data-pred="${i}">${o}</button>`).join("")}</div><p class="small muted">정답은 없어요. 내일 확인해요.</p>`;
      actions = "";
    }
    if (s.news) body = s.news.map((n) => `<article class="newscard"><span class="ntag">${n.tag}</span><h3>${n.title}</h3><p>${n.body}</p></article>`).join("");
    if (s.advance) { body = `<p>${txt(s.say)}</p><p class="muted">${dateLabel()} → ${dateLabel(D.dates[diOf(s.advance)])}</p>`; actions = `<button class="btn primary" data-act="advance">시간 보내기 ▶</button>`; }
    if (S.step === 0 && s.news) body = cover + body;
    if (s.recap) { body = `${cover}<h3>${ch.no}장 완료 · ${ch.title}</h3>${txt(s.recap)}`; actions = `<button class="btn primary" data-act="next">${S.ch + 1 < ST.chapters.length ? "다음 챕터로" : "마치기"}</button>`; }
    box.innerHTML = `${head}<div class="c-body">${body}</div><div class="c-act">${actions}</div>`;
  }
  function renderTimebar(s) {
    const bar = $("#timebar");
    const free = s?.free || (storyDone() && S.freeMode);
    if (!free || S.di >= LAST_DI) { bar.hidden = true; return; }
    bar.hidden = false;
    const target = s?.free ? diOf(s.free) : LAST_DI;
    const left = target - S.di;
    bar.innerHTML = `<span>${shortDate(date())} → ${shortDate(D.dates[target])}</span><button class="btn ghost" data-act="day">다음 거래일 ▶</button><button class="btn ghost" data-act="week" ${left < 2 ? "disabled" : ""}>1주 ▶</button>`;
  }

  // ---------- 주문 시트 · 뉴스함 ----------
  let ord = null;
  function openSheet(kind, opts = {}) {
    const sh = $("#sheet");
    if (kind === "order") {
      ord = { side: opts.side, type: "limit", sym: S.sym, qty: 1, price: px(S.sym) };
      renderOrder();
    }
    if (kind === "inbox") {
      const ev = S.inbox;
      sh.innerHTML = `<div class="sh-in"><div class="sh-head"><h3>${dateLabel()}까지 소식</h3><button class="x" data-act="close">✕</button></div>
        ${ev.filter((e) => e.kind !== "news").map((e) => `<p class="evt">${e.text}</p>`).join("")}
        ${ev.filter((e) => e.kind === "news").map(({ n }) => `<article class="newscard"><span class="ntag">${n.kind === "official" ? "공식 발표" : n.kind === "earnings" ? "실적 발표" : "뉴스"} · ${shortDate(n.date)}</span><h3>${esc(n.headline)}</h3><p>${esc(n.body)}</p></article>`).join("")}
        <button class="btn primary wide" data-act="close">확인</button></div>`;
    }
    sh.classList.add("open");
    $("#scrim").classList.add("on");
  }
  function closeSheet() { $("#sheet").classList.remove("open"); $("#scrim").classList.remove("on"); }
  function renderOrder() {
    const o = ord, s = o.sym, isBuy = o.side === "buy";
    const price = o.type === "market" ? (isBuy ? ask(s) : bid(s)) : o.price;
    const amt = o.qty * price * FX, fee = amt * FEE;
    const maxQ = isBuy ? Math.floor(availCash() / (price * FX * (1 + FEE))) : availQty(s);
    $("#sheet").innerHTML = `<div class="sh-in">
      <div class="sh-head"><h3>${CO[s].ko} <small>${s}</small></h3><button class="x" data-act="close" aria-label="닫기">✕</button></div>
      <div class="seg side"><button data-oside="buy" class="${isBuy ? "on buy" : ""}">매수</button><button data-oside="sell" class="${!isBuy ? "on sell" : ""}">매도</button></div>
      <div class="seg sm"><button data-otype="limit" class="${o.type === "limit" ? "on" : ""}">지정가</button><button data-otype="market" class="${o.type === "market" ? "on" : ""}">시장가</button></div>
      <label class="fld"><span>가격 (USD)</span>${o.type === "market" ? `<output>${usd(price)} <small class="muted">지금 ${isBuy ? "최저 매도호가" : "최고 매수호가"}</small></output>` : `<div class="stepper"><button data-pstep="-1">−</button><input id="oPrice" inputmode="decimal" value="${o.price.toFixed(2)}"><button data-pstep="1">＋</button></div><div class="chips">${[-5, -2, 0, 2].map((p) => `<button class="chip" data-ppct="${p}">${p === 0 ? "현재가" : (p > 0 ? "+" : "") + p + "%"}</button>`).join("")}</div>`}</label>
      <label class="fld"><span>수량 (주)</span><div class="stepper"><button data-qstep="-1">−</button><input id="oQty" inputmode="numeric" value="${o.qty}"><button data-qstep="1">＋</button></div><div class="chips">${[10, 25, 50, 100].map((p) => `<button class="chip" data-qpct="${p}">${p === 100 ? "최대" : p + "%"}</button>`).join("")}</div></label>
      <dl class="kv list"><div><dt>주문 금액</dt><dd>${usd(o.qty * price)} ≈ ${won(amt)}</dd></div><div><dt>수수료 (0.25%)</dt><dd>${won(fee)}</dd></div><div><dt>${isBuy ? "주문가능금액" : "매도 가능 수량"}</dt><dd>${isBuy ? won(availCash()) : availQty(s) + "주"} · 최대 ${Math.max(0, maxQ)}주</dd></div></dl>
      <p id="oMsg" class="omsg" aria-live="polite"></p>
      <button class="btn wide ${isBuy ? "buy" : "sell"}" data-act="submit">${o.type === "market" ? "시장가" : "지정가"} ${isBuy ? "매수" : "매도"} ${o.qty}주</button></div>`;
  }

  // ---------- 알림 ----------
  let toastT;
  function toast(html) {
    const t = $("#toast");
    t.innerHTML = html;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("on"), 3200);
  }

  // ---------- 이벤트 ----------
  function go(view, extra = {}) {
    Object.assign(S, { view }, extra);
    render();
    window.scrollTo(0, 0);
    emit({ type: "view" });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, [data-nav]");
    if (!b) return;
    const d = b.dataset;
    if (d.nav) return go(d.nav);
    if (d.sym) return go("stock", { sym: d.sym, tab: S.tab === "fin" && !FIN[d.sym] ? "chart" : S.tab });
    if (d.tab) { S.tab = d.tab; render(); return emit({ type: "tab" }); }
    if (d.range) { S.range = d.range; return render(); }
    if (d.ctype) { S.ctype = d.ctype; return render(); }
    if (d.order) { if (!S.seed) return toast("먼저 1장에서 계좌를 여세요."); ord = null; return openSheet("order", { side: d.order }); }
    if (d.cancel) { cancelOrder(Number(d.cancel)); toast("주문을 취소했어요."); return render(); }
    if (d.seed) {
      S.seed = S.cash = Number(d.seed);
      toast(`${won(S.seed)}을 입금했어요.`);
      return nextStep();
    }
    if (d.quiz != null) { S.quiz[`${chapter().id}-${S.step}`] = Number(d.quiz); return render(); }
    if (d.pred != null) {
      const s = step(), sym = s.predict.key.startsWith("aapl") ? "AAPL" : "AMZN";
      S.preds[s.predict.key] = { pick: Number(d.pred), sym, di: S.di };
      return nextStep();
    }
    // 주문 시트
    if (d.oside) { ord.side = d.oside; ord.price = px(ord.sym); return renderOrder(); }
    if (d.otype) { ord.type = d.otype; return renderOrder(); }
    if (d.pstep) { ord.price = Math.max(0.01, +(ord.price + Number(d.pstep) * tick).toFixed(2)); return renderOrder(); }
    if (d.ppct != null) { ord.price = +(px(ord.sym) * (1 + Number(d.ppct) / 100)).toFixed(2); return renderOrder(); }
    if (d.qstep) { ord.qty = Math.max(1, ord.qty + Number(d.qstep)); return renderOrder(); }
    if (d.qpct) {
      const price = ord.type === "market" ? (ord.side === "buy" ? ask(ord.sym) : bid(ord.sym)) : ord.price;
      const max = ord.side === "buy" ? Math.floor(availCash() / (price * FX * (1 + FEE))) : availQty(ord.sym);
      ord.qty = Math.max(1, Math.floor((max * Number(d.qpct)) / 100));
      return renderOrder();
    }
    const act = d.act;
    if (!act) return;
    if (act === "close") return closeSheet();
    if (act === "submit") {
      const r = placeOrder(ord);
      if (r.err) { $("#oMsg").textContent = r.err; return; }
      closeSheet();
      const o = r.order;
      toast(o.status === "filled" ? `${CO[o.sym].ko} ${o.qty}주 ${o.side === "buy" ? "매수" : "매도"} 체결 · ${usd(o.fillPrice)}` : `지정가 주문 접수 · ${usd(o.price)}에 ${o.qty}주 (미체결)`);
      return render();
    }
    if (act === "continue") {
      const s = step();
      if (s?.task || s?.free) return go(S.seed ? "watch" : "home");
      return render();
    }
    if (act === "next") {
      const last = step()?.recap && S.ch + 1 >= ST.chapters.length;
      nextStep();
      return last ? go("home") : undefined;
    }
    if (act === "advance") {
      const s = step(), target = diOf(s.advance);
      advance(target - S.di);
      if (s.advance === "2020-01-29" || s.advance === "2020-01-31") {
        for (const [k, p] of Object.entries(S.preds)) if (p.hit == null && p.di < S.di) p.hit = (p.pick === 0) === dayChg(p.sym, S.di) > 0;
      }
      return nextStep();
    }
    if (act === "day") return advance(1, step()?.free);
    if (act === "week") return advance(5, step()?.free);
    if (act === "free-time") { S.freeMode = true; return go("watch"); }
    if (act === "reset") {
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 모든 기록이 지워져요"; return; }
      S = fresh(); save(); autoSteps(); return go("home");
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "oPrice") { ord.price = Math.max(0.01, +Number(e.target.value).toFixed(2) || ord.price); renderOrder(); }
    if (e.target.id === "oQty") { ord.qty = Math.max(1, Math.floor(Number(e.target.value)) || 1); renderOrder(); }
  });
  $("#scrim").addEventListener("click", closeSheet);

  autoSteps();
  render();
})();
