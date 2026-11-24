// 🏫 교실 모드 — 서버 없이 한 반이 같은 시장으로 수업
// · 선생님: 판을 고르면 참여 QR(앱 주소+코드)이 나와요. 학생들은 휴대폰 카메라로 찍어 바로 같은 판을 시작
// · 학생: 끝나면 결과 QR을 보여 줘요. 선생님이 카메라로 연달아 찍어 반 결과를 모아요 (기록은 선생님 기기에만 저장)
// · 결과: 순위·분포·거래 습관 비교·토론 질문·CSV 내려받기·인쇄
window.RAUM_TEACH = (() => {
  const ST = () => window.RAUM_STAGE;
  const MP = () => window.RAUM_MP;
  const rerender = () => window.RAUM_RENDER && window.RAUM_RENDER();
  const pct = (x) => (x > 0 ? "+" : "") + (x * 100).toFixed(1) + "%";
  const cls = (x) => (x > 1e-9 ? "up" : x < -1e-9 ? "down" : "flat");
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const stars = (n) => "★".repeat(n) + "☆".repeat(3 - n);
  const KEY = "raum-teach-v1";

  // ---------- 저장 (선생님 기기) ----------
  const T = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  T.classes ||= [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch {} };
  const cur = () => T.classes.find((c) => c.id === T.open);
  const U = { role: T.open ? "teacher" : null, msg: "", scanning: false, proj: null, joinIn: "", stuName: "", stuNo: "", hideNames: false, sort: "r" };

  // ---------- 코드 ----------
  const rid = () => Array.from({ length: 4 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)]).join("");
  // 결과 위조를 막는 보안 장치는 아니고, 다른 수업 QR이나 잘못 읽힌 QR을 걸러내는 확인 글자예요
  const sig = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h.toString(36).slice(-4); };
  const clean = (t, n) => String(t || "").replace(/[~.]/g, "").trim().slice(0, n);
  const joinCode = (c) => `${c.id}.${c.code}`;
  const joinUrl = (c) => `${location.origin === "null" ? "" : location.origin}${location.pathname}#class=${joinCode(c)}.${encodeURIComponent(clean(c.name, 20))}`;
  function parseJoin(text) {
    let t = String(text || "").trim();
    const h = t.indexOf("#class="); if (h >= 0) t = t.slice(h + 7);
    const [id, code, nm] = t.split(".");
    if (!id || !code) return null;
    const spec = ST().specFromCode(code);
    return spec && { id: id.toLowerCase(), code: code.toLowerCase(), name: nm ? decodeURIComponent(nm) : "", spec };
  }
  // 학생 결과 묶음: RS1~수업~이름~번호~수익(bp)~최대하락(bp)~별~거래~현금%~가장큰보유~연도정답~확인
  function packResult(run, R) {
    const body = ["RS1", run.cls.id, encodeURIComponent(clean(run.cls.student, 12)), encodeURIComponent(clean(run.cls.no, 4)), Math.round(R.r * 1e4), Math.round(R.mdd * 1e4), R.stars, R.trades, R.cashPct, encodeURIComponent(clean(R.top, 12)), R.guessOk == null ? "-" : R.guessOk ? 1 : 0].join("~");
    return body + "~" + sig(body);
  }
  function unpackResult(text) {
    const t = String(text || "").trim(), i = t.lastIndexOf("~");
    if (!t.startsWith("RS1~") || sig(t.slice(0, i)) !== t.slice(i + 1)) return { err: "결과 QR이 아니거나 잘못 읽혔어요." };
    const [, id, name, no, r, mdd, st, trades, cashPct, top, g] = t.slice(0, i).split("~");
    return { id, name: decodeURIComponent(name), no: decodeURIComponent(no), r: r / 1e4, mdd: mdd / 1e4, stars: +st, trades: +trades, cashPct: +cashPct, top: decodeURIComponent(top), guessOk: g === "-" ? null : g === "1" };
  }
  function addResult(text) {
    const c = cur(); if (!c) return "먼저 수업을 여세요.";
    const x = unpackResult(text);
    if (x.err) return x.err;
    if (x.id !== c.id) return "다른 수업의 결과예요. 이 수업 QR로 다시 해 주세요.";
    const key = (x.no || "") + "|" + x.name;
    const old = c.results.findIndex((y) => (y.no || "") + "|" + y.name === key);
    const row = { ...x, t: Date.now() }; delete row.id;
    if (old >= 0) c.results[old] = row; else c.results.push(row);
    save();
    return `${x.no ? x.no + "번 " : ""}${x.name} ${pct(x.r)} ${old >= 0 ? "(다시 받음)" : "받았어요"}`;
  }

  // ---------- QR ----------
  const qrs = {};
  function qr(text, px = 260) {
    const k = px + "|" + text;
    if (!(k in qrs)) { qrs[k] = null; MP()?.qrImg(text, px).then((u) => { qrs[k] = u; rerender(); }); }
    return qrs[k] ? `<img class="qr" src="${qrs[k]}" alt="QR 코드">` : `<p class="small muted">QR 만드는 중…</p>`;
  }
  // 결과 QR을 연달아 찍는 카메라 (찍을 때마다 화면 전체를 다시 그리지 않음)
  let stream = null, raf = 0, lastHit = { text: "", t: 0 };
  function attach() { const v = document.getElementById("tVideo"); if (v && stream && v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); } }
  async function startScan() {
    try {
      const jsQR = await MP().scanLib();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      U.scanning = true; rerender(); attach();
      const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
      const tick = () => {
        if (!U.scanning) return;
        const v = document.getElementById("tVideo");
        if (v?.videoWidth) {
          c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0);
          const hit = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
          if (hit?.data && !(hit.data === lastHit.text && Date.now() - lastHit.t < 4000)) {
            lastHit = { text: hit.data, t: Date.now() };
            const m = addResult(hit.data);
            const el = document.getElementById("tScanMsg"); if (el) el.textContent = "📥 " + m;
            const n = document.getElementById("tCount"); if (n) n.textContent = cur()?.results.length ?? 0;
            navigator.vibrate?.(60);
          }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { U.msg = "카메라를 쓸 수 없어요. 학생이 보낸 결과 글자를 아래 칸에 붙여 넣어 주세요."; stopScan(); rerender(); }
  }
  function stopScan() { U.scanning = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); stream = null; }

  // ---------- 반 결과 분석 ----------
  function market(c) { const d = ST()._data(c.spec); return { d, ir: d.series[d.index][d.end] / d.series[d.index][d.start] - 1 }; }
  const avg = (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0);
  const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
  function stats(c) {
    const rs = c.results, { d, ir } = market(c);
    const assets = d.assets.map((a) => ({ name: a.name, r: d.series[a.sym][d.end] / d.series[a.sym][d.start] - 1 })).sort((x, y) => y.r - x.r);
    if (!rs.length) return { n: 0, ir, assets };
    const mt = median(rs.map((x) => x.trades));
    const many = rs.filter((x) => x.trades > mt), few = rs.filter((x) => x.trades <= mt);
    const tops = {}; rs.forEach((x) => x.top && (tops[x.top] = (tops[x.top] || 0) + 1));
    const g = rs.filter((x) => x.guessOk != null);
    return {
      n: rs.length, ir, assets,
      avg: avg(rs.map((x) => x.r)), med: median(rs.map((x) => x.r)),
      beat: rs.filter((x) => x.r >= ir - 0.005).length, profit: rs.filter((x) => x.r > 0).length,
      mdd: avg(rs.map((x) => x.mdd)), deep: rs.filter((x) => x.mdd <= -0.15).length,
      trades: avg(rs.map((x) => x.trades)), mt, many: many.length ? avg(many.map((x) => x.r)) : null, few: few.length ? avg(few.map((x) => x.r)) : null,
      fav: Object.entries(tops).sort((a, b) => b[1] - a[1])[0], cashy: rs.filter((x) => x.cashPct >= 50).length,
      three: rs.filter((x) => x.stars === 3).length, guess: g.length ? g.filter((x) => x.guessOk).length + "/" + g.length : null,
    };
  }
  function hist(rs) {
    const B = [[-Infinity, -0.1, "−10% 아래"], [-0.1, -0.05, "−10~−5%"], [-0.05, 0, "−5~0%"], [0, 0.05, "0~+5%"], [0.05, 0.1, "+5~+10%"], [0.1, Infinity, "+10% 위"]];
    const n = B.map(([lo, hi]) => rs.filter((x) => x.r >= lo && x.r < hi).length), mx = Math.max(1, ...n);
    return `<div class="thist">${B.map(([lo, , l], i) => `<div class="hrow"><span>${l}</span><i class="${lo < 0 ? "dn" : "upb"}" style="width:${(n[i] / mx) * 100}%;${n[i] ? "" : "visibility:hidden"}"></i><b>${n[i]}</b></div>`).join("")}</div>`;
  }
  function insights(c, s) {
    if (!s.n) return "";
    const out = [];
    out.push(`시장(지수)을 그냥 들고 있었으면 <b class="${cls(s.ir)}">${pct(s.ir)}</b>였어요. 반 평균은 <b class="${cls(s.avg)}">${pct(s.avg)}</b>, 시장보다 잘한 학생은 <b>${s.beat}/${s.n}명</b>이에요.`);
    if (s.many != null && s.few != null && s.n >= 4) out.push(`거래를 ${Math.round(s.mt)}번보다 많이 한 학생들의 평균은 <b class="${cls(s.many)}">${pct(s.many)}</b>, 적게 한 학생들은 <b class="${cls(s.few)}">${pct(s.few)}</b>예요. ${s.many < s.few ? "이번 판에서는 자주 사고판 쪽이 불리했어요." : "이번 판에서는 자주 사고판 쪽이 더 나았어요. 운이었는지 판단이었는지 이야기해 보세요."}`);
    if (s.deep) out.push(`중간에 −15% 넘게 떨어져 본 학생이 <b>${s.deep}명</b>이에요. 그때 어떤 기분이었고 무엇을 했는지 물어보세요.`);
    if (s.fav) out.push(`끝날 때 가장 많이 들고 있던 상품은 <b>${esc(s.fav[0])}</b>(${s.fav[1]}명)예요.`);
    if (s.cashy) out.push(`현금을 절반 넘게 남긴 학생이 <b>${s.cashy}명</b>이에요. 지켜보기도 하나의 선택이에요.`);
    if (s.guess) out.push(`연도 맞히기 정답: <b>${s.guess}</b>`);
    return `<ul class="tins">${out.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  }
  function questions(c, s) {
    const a = s.assets, best = a[0], worst = a[a.length - 1];
    return [
      `이 기간에 가장 많이 오른 상품은 <b>${esc(best.name)}</b>(${pct(best.r)}), 가장 많이 떨어진 상품은 <b>${esc(worst.name)}</b>(${pct(worst.r)})예요. 왜 그랬을까요?`,
      "1등 학생은 실력이었을까요, 운이었을까요? 같은 판을 다시 하면 또 1등을 할 수 있을까요?",
      "뉴스를 보고 바로 사거나 판 적이 있나요? 그 결과는 어땠나요?",
      "한 상품에 몰아서 산 학생과 나눠 산 학생은 무엇이 달랐나요?",
      "떨어질 때 팔았나요, 버텼나요, 더 샀나요? 그렇게 한 이유는요?",
      "시장 전체(지수)를 사서 가만히 있는 방법과 내 결과를 비교하면 어떤가요?",
    ];
  }
  function csv(c) {
    const head = ["번호", "이름", "수익률(%)", "별", "거래 횟수", "최대 하락(%)", "현금 비중(%)", "가장 큰 보유", "연도 정답", "받은 시각"];
    const rows = c.results.map((x) => [x.no, x.name, (x.r * 100).toFixed(2), x.stars, x.trades, (x.mdd * 100).toFixed(2), x.cashPct, x.top, x.guessOk == null ? "" : x.guessOk ? "O" : "X", new Date(x.t).toLocaleString("ko-KR")]);
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const text = "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = `라움스톡_${clean(c.name, 20) || "수업"}_${new Date(c.created).toISOString().slice(0, 10)}.csv`;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- 화면: 선생님 ----------
  const sorted = (c) => [...c.results].sort(U.sort === "no" ? (a, b) => (parseInt(a.no) || 999) - (parseInt(b.no) || 999) || a.name.localeCompare(b.name) : (a, b) => b.r - a.r);
  const who = (x, i) => (U.hideNames ? `${x.no ? x.no + "번" : "학생 " + (i + 1)}` : `${x.no ? x.no + ". " : ""}${esc(x.name)}`);
  function viewProj(c, s) {
    if (U.proj === "join") return `<div class="tproj" data-teach="proj-close"><p class="pk">📱 휴대폰 카메라로 찍으세요</p>${qr(joinUrl(c), 520)}<p class="pcode">${joinCode(c)}</p><p class="pk">${esc(c.name)} · ${esc(c.title)}</p><small>화면을 누르면 닫혀요</small></div>`;
    const rows = sorted({ results: c.results }).slice(0, 10);
    return `<div class="tproj rank" data-teach="proj-close"><p class="pk">🏆 ${esc(c.name)} 결과 · ${s.n}명</p>
      <ol class="mpboard">${rows.map((x, i) => `<li><span class="rk">${["🥇", "🥈", "🥉"][i] || i + 1}</span><b>${who(x, i)}</b><span class="st">${stars(x.stars)}</span><span class="${cls(x.r)}">${pct(x.r)}</span></li>`).join("")}</ol>
      <p class="pk">시장 ${pct(s.ir)} · 반 평균 ${pct(s.avg || 0)} · 시장보다 잘한 학생 ${s.beat || 0}명</p><small>화면을 누르면 닫혀요</small></div>`;
  }
  function viewTeacher() {
    const c = cur();
    if (!c) {
      const opts = ST().playable();
      return `<section class="hero thero"><p class="eyebrow">CLASSROOM</p><h1>🏫 선생님 화면</h1><p class="muted">한 반이 같은 시장에서 동시에 연습하고, 결과를 모아 함께 돌아봐요. 서버나 학생 회원가입이 필요 없어요.</p></section>
        <section class="tcard"><h2>새 수업 만들기</h2>
          <label class="fld"><span>반·수업 이름</span><input id="tName" maxlength="20" placeholder="예: 5학년 2반 금융 수업"></label>
          <label class="fld"><span>오늘의 시장</span><select id="tChoice" class="sel"><option value="random-virtual">🎲 가상 랜덤 (어떤 시장인지 끝나고 공개)</option><option value="random-real">🎲 실제 랜덤 (연도 맞히기)</option>${opts.map((o) => `<option value="${o.id}">${o.label}</option>`).join("")}</select></label>
          <button class="btn primary wide" data-teach="create">수업 열기</button><p class="mpmsg">${esc(U.msg)}</p></section>
        ${T.classes.length ? `<section class="tcard"><h2>지난 수업</h2><ul class="orders">${[...T.classes].reverse().map((x) => `<li><span>${esc(x.name)}<br><small class="muted">${new Date(x.created).toLocaleDateString("ko-KR")} · ${esc(x.title)} · ${x.results.length}명</small></span><button class="tag link" style="margin-left:auto" data-teach="open:${x.id}">열기</button></li>`).join("")}</ul></section>` : ""}
        ${guide()}
        <button class="linkbtn" data-teach="role:none">‹ 처음으로</button>`;
    }
    const s = stats(c), rows = sorted(c);
    return `${U.proj ? viewProj(c, s) : ""}
      <section class="tcard"><p class="eyebrow">🏫 수업 중</p><h2>${esc(c.name)}</h2><p class="small muted">${esc(c.icon)} ${esc(c.title)} · 참여 코드 <b class="code">${joinCode(c)}</b></p>
        <div class="qrbox">${qr(joinUrl(c))}<p class="small">학생은 휴대폰 기본 카메라로 찍으면 바로 같은 판이 열려요.<br>QR이 안 되면 앱의 <b>교실 모드 → 학생</b>에서 코드를 입력해요.</p></div>
        <div class="trade-btns2"><button class="btn" data-teach="proj:join">📽 크게 보여 주기</button><button class="btn" data-teach="copylink">🔗 주소 복사</button></div></section>
      <section class="tcard"><h2>결과 모으기 <span class="tcnt">· <b id="tCount">${c.results.length}</b>명</span></h2>
        <p class="small muted">학생이 끝나면 결과 화면에 QR이 나와요. 카메라를 켜 두고 학생들이 한 명씩 보여 주면 계속 모아져요.</p>
        ${U.scanning ? `<div class="scanbox"><video id="tVideo" playsinline muted></video><p id="tScanMsg" class="mpmsg">학생 결과 QR을 비춰 주세요</p><button class="btn" data-teach="stopscan">카메라 닫고 결과 보기</button></div>`
          : `<button class="btn primary wide" data-teach="scan">📷 결과 QR 찍기 (연속)</button>`}
        <details><summary class="small">QR 대신 글자로 받기</summary><textarea id="tPaste" class="sdp" placeholder="학생이 보낸 결과 글자 (여러 줄 가능)"></textarea><button class="btn" data-teach="paste">추가</button></details>
        <p class="mpmsg" aria-live="polite">${esc(U.msg)}</p></section>
      ${s.n ? `<section class="tcard print-area"><h2>📊 반 결과 <small class="muted">${esc(c.name)} · ${esc(c.title)}</small></h2>
        <dl class="kv"><div><dt>반 평균</dt><dd class="${cls(s.avg)}">${pct(s.avg)}</dd></div><div><dt>시장(지수)</dt><dd class="${cls(s.ir)}">${pct(s.ir)}</dd></div><div><dt>시장보다 잘함</dt><dd>${s.beat}/${s.n}명</dd></div></dl>
        <dl class="kv"><div><dt>수익 낸 학생</dt><dd>${s.profit}/${s.n}명</dd></div><div><dt>평균 거래</dt><dd>${s.trades.toFixed(1)}번</dd></div><div><dt>별 3개</dt><dd>${s.three}명</dd></div></dl>
        <h3 class="sub">수익률 분포</h3>${hist(c.results)}
        <h3 class="sub">눈여겨볼 점</h3>${insights(c, s)}
        <h3 class="sub">결과표 <span class="tsort"><button class="tag ${U.sort === "r" ? "on" : ""}" data-teach="sort:r">수익률순</button><button class="tag ${U.sort === "no" ? "on" : ""}" data-teach="sort:no">번호순</button></span></h3>
        <div class="ttable"><table><thead><tr><th>#</th><th>학생</th><th>수익률</th><th>별</th><th>거래</th><th>최대 하락</th><th>가장 큰 보유</th><th class="noprint"></th></tr></thead>
          <tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td>${who(x, i)}</td><td class="${cls(x.r)}">${pct(x.r)}</td><td class="st">${stars(x.stars)}</td><td>${x.trades}</td><td class="${x.mdd <= -0.15 ? "down" : ""}">${pct(x.mdd)}</td><td>${esc(x.top || "현금")}</td><td class="noprint"><button class="linkbtn" data-teach="del:${c.results.indexOf(x)}" aria-label="삭제">✕</button></td></tr>`).join("")}</tbody></table></div>
        <h3 class="sub">함께 이야기해 볼 질문</h3><ol class="tqs">${questions(c, s).map((q) => `<li>${q}</li>`).join("")}</ol>
        <p class="small muted">교육용 시뮬레이션 결과예요. 실제 투자 권유가 아니에요.</p></section>
        <section class="tcard noprint"><div class="trade-btns2"><button class="btn" data-teach="proj:rank">📽 순위 크게 보기</button><button class="btn" data-teach="names">${U.hideNames ? "👤 이름 보이기" : "🙈 이름 가리기"}</button><button class="btn" data-teach="csv">⬇ 엑셀(CSV) 받기</button><button class="btn" data-teach="print">🖨 인쇄·PDF</button></div></section>`
        : `<section class="tcard"><h2>📊 반 결과</h2><p class="small muted">아직 받은 결과가 없어요. 이 시장에서 각 상품은 끝까지 이렇게 움직였어요(학생에게는 끝나기 전까지 비밀).</p><ul class="orders">${s.assets.map((a) => `<li>${esc(a.name)}<b class="${cls(a.r)}" style="margin-left:auto">${pct(a.r)}</b></li>`).join("")}</ul></section>`}
      ${guide()}
      <section class="tcard noprint"><div class="trade-btns2"><button class="btn" data-teach="close">수업 목록</button><button class="btn sell" data-teach="remove">${U.armRemove ? "한 번 더 누르면 삭제" : "이 수업 기록 삭제"}</button></div></section>`;
  }
  function guide() {
    return `<details class="tcard tguide"><summary><b>📘 40분 수업 지도안</b></summary>
      <ol class="tqs">
        <li><b>도입 (5분)</b> 모두 가상의 1,000만 원으로 시작해요. 목표는 별 3개: 수익 내기, 시장(지수)보다 잘하기, 중간에 −15%보다 많이 떨어지지 않기.</li>
        <li><b>참여 (3분)</b> 참여 QR을 크게 띄우고 학생들이 휴대폰 카메라로 찍게 해요. 이름과 번호를 적으면 시작돼요.</li>
        <li><b>플레이 (15분)</b> 각자 날짜를 넘기며 사고팔아요. 돌아다니며 "왜 샀어요?", "어디까지 떨어지면 팔 거예요?"를 물어보세요.</li>
        <li><b>결과 모으기 (5분)</b> 끝난 학생은 결과 화면의 QR을 보여 줘요. 선생님은 카메라를 켜 두고 연달아 찍어요.</li>
        <li><b>돌아보기 (12분)</b> 순위보다 <b>시장과 비교</b>, <b>거래 횟수</b>, <b>가장 크게 떨어졌을 때</b>를 중심으로 이야기해요. 아래 질문을 활용하세요.</li>
      </ol>
      <p class="small muted">핵심 개념: 분산 투자 · 지수(시장 전체) · 수수료와 잦은 거래 · 손실을 견디는 힘 · 뉴스는 이미 가격에 반영돼요. 학생 정보는 이 기기에만 저장되고 어디로도 보내지지 않아요.</p></details>`;
  }

  // ---------- 화면: 학생 ----------
  function viewStudent(S) {
    if (!U.stuName && S.teachStu) { U.stuName = S.teachStu.name; U.stuNo = S.teachStu.no; }
    const j = parseJoin(U.joinIn);
    const run = S.stg;
    const going = run?.cls && !run.done;
    return `<section class="hero thero"><p class="eyebrow">CLASSROOM</p><h1>🙋 수업 참여</h1><p class="muted">선생님이 알려 준 시장에서 모두 함께 연습해요.</p></section>
      ${going ? `<section class="tcard"><h2>진행 중인 수업</h2><p>${esc(run.cls.className || "수업")} · ${esc(run.cls.no ? run.cls.no + "번 " : "")}${esc(run.cls.student)}</p><button class="btn primary wide" data-teach="resume">이어서 하기</button></section>` : ""}
      <section class="tcard">
        <label class="fld"><span>참여 코드</span><input id="tJoin" value="${esc(U.joinIn)}" placeholder="예: k7q2.v3-48213" autocapitalize="off"></label>
        ${j ? `<p class="small">✅ ${esc(j.name || U.joinName || "수업")} · ${esc(j.spec.icon || "")} ${esc(j.spec.title)}</p>` : U.joinIn ? `<p class="small down">코드를 확인해 주세요.</p>` : ""}
        <div class="trade-btns2"><label class="fld"><span>번호</span><input id="tNo" inputmode="numeric" maxlength="4" value="${esc(U.stuNo)}" placeholder="예: 7"></label><label class="fld"><span>이름</span><input id="tStu" maxlength="12" value="${esc(U.stuName)}" placeholder="예: 민수"></label></div>
        <button class="btn primary wide" data-teach="join">시작하기</button>
        <p class="mpmsg" aria-live="polite">${esc(U.msg)}</p>
        <p class="small muted">이름과 결과는 내 휴대폰에서 QR로만 선생님께 보여 줘요. 인터넷으로 보내지 않아요.</p></section>
      <button class="linkbtn" data-teach="role:none">‹ 처음으로</button>`;
  }
  // 결과 화면 안: 선생님께 보여 줄 결과 QR
  function submitBlock(S) {
    const run = S.stg, d = ST()._data(run), R = run.result;
    if (!run.cls.packet) {
      const i = d.end, hold = Object.entries(run.pos).map(([k, p]) => ({ name: d.assets.find((a) => a.sym === k).name, v: p.qty * d.series[k][i] }));
      const total = run.cash + hold.reduce((t, h) => t + h.v, 0), top = hold.sort((a, b) => b.v - a.v)[0];
      run.cls.packet = packResult(run, { ...R, trades: run.trades, cashPct: Math.round((run.cash / total) * 100), top: top && top.v > run.cash ? top.name : "현금", guessOk: run.random && run.real ? run.guess === run.year : null });
    }
    return `<div class="qrbox tsubmit"><p><b>🏫 선생님께 이 QR을 보여 주세요</b></p>${qr(run.cls.packet)}<p class="small">${esc(run.cls.no ? run.cls.no + "번 " : "")}${esc(run.cls.student)} · ${pct(R.r)} ${stars(R.stars)}</p>
      <details><summary class="small">QR이 안 되면: 글자로 보내기</summary><textarea readonly class="sdp">${run.cls.packet}</textarea><button class="btn xs" data-teach="copypacket">복사</button></details></div>
      <p class="small muted">결과는 처음 끝낸 판으로 정해져요. 다시 해 보는 건 연습으로만 남아요.</p>
      <div class="tnav"><button class="btn" data-teach="role:student">교실로</button><button class="btn primary" data-stg="map">다른 스테이지</button></div>`;
  }

  function view(S) {
    if (U.scanning) queueMicrotask(attach);
    if (U.role === "teacher") return viewTeacher();
    if (U.role === "student") return viewStudent(S);
    return `<section class="hero thero"><p class="eyebrow">CLASSROOM</p><h1>🏫 교실 모드</h1><p class="muted">한 반이 같은 시장에서 동시에 투자 연습을 하고, 결과를 모아 함께 돌아봐요. 인터넷 서버도, 회원가입도 필요 없어요.</p></section>
      <section class="tcard"><h2>👩‍🏫 선생님</h2><p class="small muted">시장을 고르고 참여 QR을 띄워요. 학생 결과 QR을 찍어 반 순위·분포·토론 질문을 만들고, 엑셀로 내려받거나 인쇄해요.</p><button class="btn primary" data-teach="role:teacher">선생님으로 시작</button></section>
      <section class="tcard"><h2>🙋 학생</h2><p class="small muted">선생님 화면의 QR을 휴대폰 카메라로 찍거나, 참여 코드를 입력해요.</p><button class="btn" data-teach="role:student">학생으로 참여</button></section>`;
  }

  function click(cmd, S) {
    const [a, b] = cmd.split(":");
    const val = (id) => document.getElementById(id)?.value ?? "";
    if (a !== "remove") U.armRemove = false;
    U.msg = "";
    if (a === "role") { stopScan(); U.role = b === "none" ? null : b; if (b !== "teacher") T.open = null, save(); }
    else if (a === "create") {
      const choice = val("tChoice"), spec = ST().specForChoice(choice), code = ST().codeOf(spec);
      const c = { id: rid(), name: clean(val("tName"), 20) || "우리 반", code, spec: ST().specFromCode(code) || spec, title: spec.random ? (spec.real ? "실제 랜덤 (비밀의 시대)" : "가상 랜덤 (알 수 없는 시장)") : spec.title, icon: spec.icon || "🎲", created: Date.now(), results: [] };
      T.classes.push(c); T.open = c.id; T.classes = T.classes.slice(-30); save();
    }
    else if (a === "open") { T.open = b; save(); }
    else if (a === "close") { stopScan(); T.open = null; save(); }
    else if (a === "remove") { if (!U.armRemove) U.armRemove = true; else { T.classes = T.classes.filter((c) => c.id !== T.open); T.open = null; U.armRemove = false; save(); } }
    else if (a === "proj") U.proj = b;
    else if (a === "proj-close") U.proj = null;
    else if (a === "scan") return startScan();
    else if (a === "stopscan") stopScan();
    else if (a === "paste") { const lines = val("tPaste").split(/\s+/).filter(Boolean); U.msg = lines.map(addResult).join(" · ") || "붙여 넣은 글자가 없어요."; }
    else if (a === "del") { const c = cur(); c.results.splice(Number(b), 1); save(); }
    else if (a === "sort") U.sort = b;
    else if (a === "names") U.hideNames = !U.hideNames;
    else if (a === "csv") csv(cur());
    else if (a === "print") { setTimeout(() => window.print(), 50); }
    else if (a === "copylink") { navigator.clipboard?.writeText(joinUrl(cur())); U.msg = "참여 주소를 복사했어요. 클래스룸·메신저에 올려도 돼요."; }
    else if (a === "copypacket") { navigator.clipboard?.writeText(S.stg?.cls?.packet || ""); window.RAUM_TOAST?.("복사했어요. 선생님께 보내 주세요."); }
    else if (a === "resume") { ST().go("play"); S.view = "stage"; }
    else if (a === "join") {
      U.joinIn = val("tJoin").trim(); U.stuNo = clean(val("tNo"), 4); U.stuName = clean(val("tStu"), 12);
      const j = parseJoin(U.joinIn);
      if (!j) U.msg = "참여 코드를 확인해 주세요.";
      else if (!U.stuName) U.msg = "이름을 적어 주세요.";
      else {
        S.teachStu = { name: U.stuName, no: U.stuNo };
        ST().startSpec(S, j.spec, { cls: { id: j.id, className: j.name || U.joinName, student: U.stuName, no: U.stuNo, packet: null } });
        ST().go("play"); S.view = "stage";
      }
    }
    rerender();
  }
  // 학생: 주소(#class=...)로 들어오면 코드를 채워 둠
  function fromHash(S) {
    const h = location.hash;
    if (!h.startsWith("#class=")) return false;
    const [id, code, nm] = h.slice(7).split(".");
    U.role = "student"; U.joinIn = `${id}.${code}`; U.joinName = nm ? decodeURIComponent(nm) : "";
    if (S.teachStu) { U.stuName = S.teachStu.name; U.stuNo = S.teachStu.no; }
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }
  document.addEventListener("input", (e) => {
    if (e.target.id === "tJoin") { U.joinIn = e.target.value.trim(); U.joinName = ""; }
    if (e.target.id === "tStu") U.stuName = e.target.value;
    if (e.target.id === "tNo") U.stuNo = e.target.value;
  });
  document.addEventListener("change", (e) => { if (e.target.id === "tJoin") rerender(); });
  return { view, click, submitBlock, fromHash, _T: T, _U: U, _add: addResult, _parse: parseJoin };
})();
