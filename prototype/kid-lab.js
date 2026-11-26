// 꼬마 탐험가 '겪어 보기' 공통 틀. 화면 내용은 lab-easy.js(아이 버전) · lab-full.js(어른 버전).
// 원칙: 맞히기 점수·보상·제한 시간 없음. 고른 것은 맞고 틀림 없이 다음 화면에서 함께 살펴봄.
// 숫자는 daily.js · stages-real.js · long-real.js(실제 수정 종가)와 fin.js(SEC 10-K 연간 수치)에서 계산.
// 사례는 '결과가 갈리는 것'을 보여 주려고 일부러 고른 기간이라, 화면에도 그렇게 적음.
//
// 화면 하나 = (picks) => ({ title, text, body, ask?: { key, q, opts, reply(i) }, wait?, tapSay? })
//   body 안의 조작 버튼: data-act="labset" data-k data-v → picks[k] = v / data-act="labflip" data-k → 켜고 끄기
//   wait: 손으로 해 보기가 끝나기 전에는 '다음'을 막음
window.RAUM_KID_LAB = ({ $, c1, say, done, seen, show, exit, mode }) => {
  const D = window.RAUM_DAILY, F = window.RAUM_FIN, H = window.RAUM_HIST, LONG = window.RAUM_LONG;
  const at = (d) => D.dates.findIndex((x) => x >= d);
  const START = at("2020-01-02"), END = D.dates.length - 1;
  const NAMES = {
    ZM: ["💻", "화상 수업 가게", "줌"], AMZN: ["📦", "택배 가게", "아마존"], AAPL: ["🍎", "스마트폰 가게", "애플"],
    NFLX: ["🎬", "집에서 영화 가게", "넷플릭스"], CCL: ["🚢", "배 여행 가게", "카니발"], AAL: ["✈️", "비행기 가게", "아메리칸항공"], XOM: ["🛢️", "석유 가게", "엑슨모빌"],
  };
  const pct = (r) => `${r >= 1 ? "▲" : "▼"} ${Math.abs(Math.round((r - 1) * 100))}%`;
  const dir = (r) => (r >= 1 ? "up" : "down");
  const md = (d) => { const [y, m, day] = d.split("-").map(Number); return `${y}년 ${m}월 ${day}일`; };
  const ym = (d) => { const [y, m] = d.split("-").map(Number); return `${y}년 ${m}월`; };

  // ---------- 그림 조각 ----------
  const card = (inner) => `<div class="card">${inner}</div>`;
  const rows = (list) => `<div class="cmp">${list.map(([a, b, c = ""]) => `<div class="${c}"><span>${a}</span><b>${b}</b></div>`).join("")}</div>`;
  const table = (head, body) => `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const note = (t) => `<p class="note">${t}</p>`;
  // 선 그래프: lines = [{ ys, color }], mark = [시작 칸, 끝 칸] 노란 띠, base = 점선, len = 가로 전체 칸 수(아직 안 간 길은 비워 둠)
  function graph(lines, { mark, base, left, right, len } = {}) {
    const all = lines.flatMap((l) => l.ys).concat(base === undefined ? [] : [base]);
    const lo = Math.min(...all), r = Math.max(...all) - lo || 1, n = (len || lines[0].ys.length) - 1;
    const X = (i) => (i / n * 200).toFixed(1), Y = (v) => (96 - (v - lo) / r * 92).toFixed(1);
    const line = (l) => (l.ys.length > 1
      ? `<polyline fill="none" stroke="${l.color}" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${l.ys.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/>`
      : `<line x1="0" x2="3" y1="${Y(l.ys[0])}" y2="${Y(l.ys[0])}" stroke="${l.color}" stroke-width="6" vector-effect="non-scaling-stroke"/>`);
    return `<div class="lgraph"><svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">${mark ? `<rect x="${X(mark[0])}" y="0" width="${(X(mark[1]) - X(mark[0])).toFixed(1)}" height="100" fill="#ffc83d" opacity=".35"/>` : ""}${base === undefined ? "" : `<line x1="0" x2="200" y1="${Y(base)}" y2="${Y(base)}" stroke="#8c99b8" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`}${lines.map(line).join("")}</svg><div class="ax"><span>${left}</span><span>${right}</span></div></div>`;
  }
  // 이익 막대 두 개 (단위: 억 달러)
  function profit(sym, title = "🏪 1년 이익") {
    const a = F[sym].prev.net * 10, b = F[sym].now.net * 10, mx = Math.max(a, b);
    const bar = (t, v) => `<div class="pbar"><span>${t}</span><i style="width:${Math.max(3, v / mx * 100).toFixed(0)}%"></i><b>${v < 1 ? `${Math.round(v * 10000).toLocaleString("ko-KR")}만` : `${c1(v)}억`} 달러</b></div>`;
    return card(`<h2>${title}</h2>${bar("지난 회계연도", a)}${bar("다음 회계연도", b)}<p class="small">회계연도(${F[sym].fy}) 순이익 · 회사가 낸 연간 보고서(10-K)</p>`);
  }
  // 손으로 해 보기: 버튼
  const tap = (label, k, v, cls = "") => `<button class="tap ${cls}" data-act="labset" data-k="${k}" data-v="${v}">${label}</button>`;

  // ---------- 계산 ----------
  // 2020년: 동전 10개로 시작한 길
  const walk = (sym) => D.prices[sym].slice(START, END + 1).map((v) => 10 * v / D.prices[sym][START]);
  const summary = (ys) => ({ ys, end: ys.at(-1), low: Math.min(...ys), wild: ys.filter((v, i) => i && Math.abs(v / ys[i - 1] - 1) >= 0.05).length });
  const stat = (sym) => summary(walk(sym));
  // 고른 가게에 똑같이 나눠 담고 그대로 둔 바구니
  const mix = (syms) => { const all = syms.map(walk); return summary(all[0].map((_, i) => all.reduce((a, w) => a + w[i], 0) / all.length)); };

  // 가격 묶음: 2020은 daily.js, 나머지는 stages-real.js의 시작 칸부터
  function series(set, sym) {
    if (set === "2020") return { p: D.prices[sym].slice(START), d: D.dates.slice(START) };
    return { p: H[set].prices[sym].slice(H[set].start), d: H[set].dates.slice(H[set].start) };
  }
  // 하루 마지막 값이 10개 → 12개(+20%)에 처음 닿은 날 규칙대로 [모두 팔기, 절반, 두기]. 판 돈은 저금통에.
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
  // 10년: 첫 거래일에 10개. ys = 달마다, years = 해마다 { y, end, low(하루 마지막 값 기준) }
  function long(id) {
    const s = LONG[id], coin = (v) => 10 * v / s.prices[0];
    const years = s.lows.map((low, i) => ({ y: s.from + i, end: coin(s.prices[(i + 1) * 12]), low: coin(low) }));
    return { ys: s.prices.map(coin), years, end: years.at(-1).end, low: Math.min(...years.map((x) => x.low)), from: s.from, to: s.to };
  }

  const K = { D, F, c1, say, START, END, at, NAMES, STORES: Object.keys(NAMES), label: (s) => `${NAMES[s][0]} ${NAMES[s][1]}`, pct, dir, md, ym, card, rows, table, note, graph, profit, tap, walk, stat, mix, series, target, flip, long };
  const PAGES = { easy: window.RAUM_LAB_EASY(K), full: window.RAUM_LAB_FULL(K) };

  const LABS = [
    { id: "lab1", e: "🏷️", easy: ["가게랑 값표", "값표는 왜 따로 움직일까?"], full: ["가게 실력과 주가", "이익이 늘어도 주가는 내릴 수 있다"] },
    { id: "lab2", e: "🍋", easy: ["싼 걸까, 비싼 걸까?", "레몬 하나에 동전 몇 개?"], full: ["싼 주식, 비싼 주식", "PER로 보는 법과 그 한계"] },
    { id: "lab3", e: "🧺", easy: ["하나와 바구니", "가게를 바구니에 담아 봐요"], full: ["개별 주식과 S&P 500", "분산이 해 주는 것, 못 해 주는 것"] },
    { id: "lab4", e: "🚪", easy: ["언제 팔까?", "시간을 넘기며 정해 봐요"], full: ["언제 팔까", "목표 수익률에 닿았을 때"] },
    { id: "lab5", e: "⏳", easy: ["긴 기다림", "10년을 한 해씩 넘겨 봐요"], full: ["10년의 기다림", "오래 가지면 늘 오를까"] },
  ];
  const meta = (lab, m) => ({ title: LABS[lab][m][0], sub: LABS[lab][m][1] });

  // ---------- 이어 하기: 체험마다 보던 화면과 고른 것을 저장 ----------
  const KEY = "raum-kid-lab-v1";
  let saved = (() => { try { return { at: {}, last: null, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { at: {}, last: null }; } })();
  const keep = () => localStorage.setItem(KEY, JSON.stringify(saved));
  const keyOf = (lab, m) => `${LABS[lab].id}:${m}`;
  // 저장된 곳 (화면 수가 달라졌으면 범위 안으로)
  const spot = (lab, m) => { const s = saved.at[keyOf(lab, m)]; return s && { i: Math.max(0, Math.min(s.i | 0, PAGES[m][LABS[lab].id].length - 1)), picks: { ...s.picks } }; };

  // ---------- 화면 ----------
  let cur = null; // { lab, m, i, picks }
  const list = () => PAGES[cur.m][LABS[cur.lab].id];
  const page = () => list()[cur.i](cur.picks);
  const spoken = () => { const g = page(), a = g.ask, p = a && cur.picks[a.key]; return !a ? g.text : p === undefined ? `${g.text} ${a.q}` : a.reply(p); };

  const buttons = (m = mode()) => `<div class="menu">${LABS.map((l, i) => {
    const s = spot(i, m), n = PAGES[m][l.id].length;
    return `<button class="big" data-act="labopen" data-i="${i}" data-m="${m}"><span>${l.e}</span><div>${i + 1}. ${meta(i, m).title}${seen(keyOf(i, m)) ? " ✅" : ""}<small>${s ? `⏸ 이어서 보기 · ${s.i + 1} / ${n}` : `${meta(i, m).sub} · ${n}화면`}</small></div></button>`;
  }).join("")}</div>`;

  function render() {
    const l = LABS[cur.lab], g = page(), a = g.ask, p = a ? cur.picks[a.key] : undefined, n = list().length, last = cur.i === n - 1;
    const waiting = (a && p === undefined) || !!g.wait;
    $("#main").innerHTML = `
      <div class="banner"><span class="em">${l.e}</span><div><b>${g.title}</b><small>${meta(cur.lab, cur.m).title} · ${cur.m === "easy" ? "🧒 아이" : "🧑 어른"} · ${cur.i + 1} / ${n}</small></div></div>
      <p class="lead ${cur.m}">${g.text}</p>
      ${g.body}
      ${a ? card(`<h2>${a.q}</h2><div class="opts">${a.opts.map((o, i) => `<button data-act="labpick" data-i="${i}" class="${p === i ? "on" : ""}" aria-pressed="${p === i}">${o}</button>`).join("")}</div>${p === undefined ? "" : `<p class="reply">${a.reply(p)}</p>`}`) : ""}
      <div class="lnav">
        <button class="pill ghost" data-act="${cur.i ? "labprev" : "home"}">◀ ${cur.i ? "이전" : "처음 화면"}</button>
        <button class="iconbtn" data-act="labsay" aria-label="읽어 주기">🔊</button>
        ${last ? `<button class="pill" data-act="labend" ${waiting ? "disabled" : ""}>마치기 ✔</button>` : `<button class="pill" data-act="labnext" ${waiting ? "disabled" : ""}>다음 ▶</button>`}
      </div>
      ${last && cur.m === "easy" ? `<button class="pill ghost lhome" data-act="labopen" data-i="${cur.lab}" data-m="full">👨‍👩‍👧 어른과 더 자세히 보기</button>` : ""}
      ${cur.i ? `<button class="pill ghost lhome" data-act="home">🏠 처음 화면 (여기부터 이어 볼 수 있어요)</button><button class="lreset" data-act="labreset">↺ 이 체험 처음부터</button>` : ""}
      <p class="note">교육용 연습이에요. 투자 권유가 아니에요. 지나간 값이 앞으로의 값을 알려 주지는 않아요.</p>`;
  }

  function remember() {
    const k = keyOf(cur.lab, cur.m);
    saved.at[k] = { i: cur.i, picks: cur.picks };
    saved.last = k;
    keep();
  }
  function go(lab, m, i, picks) { cur = { lab, m, i, picks }; remember(); show(); say(spoken()); }
  function open(lab, m = mode()) { const s = spot(lab, m); go(lab, m, s ? s.i : 0, s ? s.picks : {}); }
  function forget(k) { delete saved.at[k]; if (saved.last === k) saved.last = null; keep(); }
  // 마지막으로 보다 만 체험 (지금 고른 버전만)
  function pending(m = mode()) {
    const [id, pm] = (saved.last || "").split(":"), lab = LABS.findIndex((l) => l.id === id);
    if (lab < 0 || pm !== m) return null;
    const s = spot(lab, m);
    return s && s.i > 0 ? { lab, e: LABS[lab].e, title: meta(lab, m).title, i: s.i, n: PAGES[m][id].length } : null;
  }
  const firstUnseen = (m = mode()) => { const lab = LABS.findIndex((l, i) => !seen(keyOf(i, m))); return lab < 0 ? null : { lab, e: LABS[lab].e, title: meta(lab, m).title }; };

  // 조작한 뒤 같은 화면을 다시 그림 (누른 버튼에 초점 유지)
  function redraw(sel) {
    remember();
    render();
    if (sel) document.querySelector(sel)?.focus({ preventScroll: true });
  }

  function act(a, data) {
    if (a === "labopen") return open(+data.i, data.m);
    if (!cur) return;
    if (a === "labsay") return say(spoken());
    if (a === "labnext") return go(cur.lab, cur.m, cur.i + 1, cur.picks);
    if (a === "labprev") return go(cur.lab, cur.m, cur.i - 1, cur.picks);
    if (a === "labreset") { forget(keyOf(cur.lab, cur.m)); return go(cur.lab, cur.m, 0, {}); }
    if (a === "labpick") {
      cur.picks[page().ask.key] = +data.i;
      redraw(`[data-act="labpick"][data-i="${+data.i}"]`);
      return say(spoken());
    }
    if (a === "labset" || a === "labflip") {
      cur.picks[data.k] = a === "labflip" ? (cur.picks[data.k] ? 0 : 1) : +data.v;
      redraw(`[data-act="${a}"][data-k="${data.k}"]`);
      const t = page().tapSay;
      return t ? say(t) : undefined;
    }
    if (a === "labend") {
      const k = keyOf(cur.lab, cur.m);
      done(k);
      forget(k);
      cur = null;
      return exit();
    }
  }

  return { buttons, render, act, open, pending, firstUnseen, count: LABS.length };
};
