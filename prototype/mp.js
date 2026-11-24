// 👥 함께 하기 — 서버 없이 근거리(같은 Wi-Fi·핫스팟) 멀티플레이
// · 연결: WebRTC 데이터채널. 연결 정보(SDP)는 QR 코드나 복사·붙여넣기로 직접 주고받음 (시그널링 서버·STUN 서버 없음)
// · 방장이 판(spec)을 정하고 날짜를 넘기면 모두 같은 날로 이동. 각자 사고팔고, 순위표는 방장이 모아 다시 나눠 줌
// · 코드 대결: 네트워크가 없어도 같은 판 코드로 각자 플레이 후 결과 비교
window.RAUM_MP = (() => {
  const ST = () => window.RAUM_STAGE;
  const rerender = () => window.RAUM_RENDER && window.RAUM_RENDER();
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
  const pct = (x) => (x > 0 ? "+" : "") + (x * 100).toFixed(1) + "%";
  const cls = (x) => (x > 1e-9 ? "up" : x < -1e-9 ? "down" : "flat");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- 외부 라이브러리 (필요할 때만 불러옴) ----------
  const libs = {};
  function load(src, global) {
    if (window[global]) return Promise.resolve(window[global]);
    return (libs[src] ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = () => ok(window[global]); s.onerror = () => no(new Error("load " + src)); document.head.append(s); }));
  }
  const qrLib = () => load("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", "qrcode");
  const scanLib = () => load("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js", "jsQR");

  // ---------- 연결 정보 압축 (deflate + base64url) ----------
  const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  async function pack(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (!window.CompressionStream) return "J" + b64(raw);
    const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
    return "Z" + b64(z);
  }
  async function unpack(text) {
    const t = String(text || "").trim().replace(/\s+/g, "");
    const kind = t[0], body = unb64(t.slice(1));
    const raw = kind === "Z" ? new Uint8Array(await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()) : body;
    return JSON.parse(new TextDecoder().decode(raw));
  }
  // ICE 후보를 다 모을 때까지 기다림 (같은 Wi-Fi의 로컬 주소만 사용)
  const gathered = (pc) => new Promise((ok) => {
    if (pc.iceGatheringState === "complete") return ok();
    const t = setTimeout(ok, 3000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); ok(); } });
  });
  const newPC = () => new RTCPeerConnection({ iceServers: [] });

  // ---------- 상태 ----------
  const M = { role: null, name: "", peers: [], pending: null, guestPC: null, hostDC: null, board: [], spec: null, ready: false, screen: "lobby", msg: "", answerText: "", offerText: "", choice: "random-virtual", scanning: false, codeIn: "", day: null };
  let uid = 1;

  // 방장: 참가자 한 명을 위한 초대(offer)를 만들어요
  async function hostNewInvite() {
    const pc = newPC();
    const dc = pc.createDataChannel("raum");
    const peer = { id: uid++, pc, dc, name: "참가자", snap: null, ready: false, open: false };
    dc.onopen = () => { peer.open = true; M.msg = "참가자가 들어왔어요!"; M.pending = null; M.offerText = ""; if (M.spec) send(peer, { t: "welcome", spec: M.spec, day: S().stg?.day, board: M.board }); broadcastBoard(); rerender(); };
    dc.onclose = () => { peer.open = false; broadcastBoard(); rerender(); };
    dc.onmessage = (e) => onHostMsg(peer, JSON.parse(e.data));
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    M.pending = peer;
    M.offerText = await pack({ v: 1, sdp: pc.localDescription.sdp, room: M.name });
    M.peers.push(peer);
    rerender();
  }
  async function hostAcceptAnswer(text) {
    const p = M.pending;
    if (!p) throw new Error("먼저 초대 QR을 만드세요.");
    const a = await unpack(text);
    await p.pc.setRemoteDescription({ type: "answer", sdp: a.sdp });
    p.name = a.name || p.name;
    M.msg = "연결하는 중이에요…";
    rerender();
  }
  // 참가자: 방장의 초대를 받고 답장(answer)을 만들어요
  async function guestAcceptOffer(text) {
    const o = await unpack(text);
    const pc = newPC();
    M.guestPC = pc;
    pc.ondatachannel = (e) => {
      const dc = e.channel;
      M.hostDC = dc;
      dc.onopen = () => { M.msg = `방 '${o.room}'에 연결됐어요!`; M.answerText = ""; dc.send(JSON.stringify({ t: "hello", name: M.name })); rerender(); };
      dc.onmessage = (ev) => onGuestMsg(JSON.parse(ev.data));
      dc.onclose = () => { M.msg = "방장과 연결이 끊어졌어요."; rerender(); };
    };
    await pc.setRemoteDescription({ type: "offer", sdp: o.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    M.answerText = await pack({ v: 1, sdp: pc.localDescription.sdp, name: M.name });
    M.room = o.room;
    rerender();
  }

  const S = () => window.RAUM_STATE();
  const send = (peer, msg) => { if (peer.open) try { peer.dc.send(JSON.stringify(msg)); } catch {} };
  const sendAll = (msg) => M.peers.forEach((p) => send(p, msg));

  function myRow() {
    const st = S().stg;
    const snap = st ? ST().snapshot(S()) : null;
    return { name: M.name + (M.role === "host" ? " 👑" : ""), me: true, ...(snap || {}), ready: M.role === "host" ? true : M.ready };
  }
  function buildBoard() {
    const rows = [{ ...myRow(), me: undefined, host: true }, ...M.peers.filter((p) => p.open).map((p) => ({ name: p.name, ...(p.snap || {}), ready: p.ready }))];
    return rows.sort((a, b) => (b.r ?? -9) - (a.r ?? -9));
  }
  function broadcastBoard() { if (M.role !== "host") return; M.board = buildBoard(); sendAll({ t: "board", board: M.board }); }

  function onHostMsg(peer, m) {
    if (m.t === "hello") { peer.name = String(m.name || "참가자").slice(0, 12); M.msg = `${peer.name}님이 들어왔어요!`; }
    if (m.t === "state") { peer.snap = m.snap; peer.ready = !!m.ready; }
    broadcastBoard();
    rerender();
  }
  function onGuestMsg(m) {
    const s = S();
    if (m.t === "welcome") {
      M.spec = m.spec;
      ST().startSpec(s, m.spec, { mp: { role: "guest" } });
      if (m.day != null) ST().advanceTo(s, m.day);
      M.screen = "game";
      s.view = "mp";
      M.ready = false;
      reportState();
    }
    if (m.t === "day") { ST().advanceTo(s, m.day); M.ready = false; reportState(); }
    if (m.t === "board") M.board = m.board;
    rerender();
  }
  function reportState() { if (M.role === "guest" && M.hostDC?.readyState === "open") M.hostDC.send(JSON.stringify({ t: "state", snap: ST().snapshot(S()), ready: M.ready })); }

  // ---------- 판 진행 ----------
  function hostStart() {
    const s = S();
    M.spec = ST().specForChoice(M.choice);
    ST().startSpec(s, M.spec, { mp: { role: "host" } });
    M.screen = "game";
    M.peers.forEach((p) => { p.ready = false; p.snap = null; });
    sendAll({ t: "welcome", spec: M.spec, day: s.stg.day, board: [] });
    broadcastBoard();
  }
  function onNext(s, n) {
    if (M.role !== "host") return;
    const d = ST()._data(s.stg);
    const target = Math.min(d.end, s.stg.day + n);
    ST().advanceTo(s, target);
    M.peers.forEach((p) => (p.ready = false));
    sendAll({ t: "day", day: target });
    broadcastBoard();
  }
  // 사고팔기·하루 넘김 뒤에 내 상태를 알림 (game.js가 렌더 전에 부름)
  function afterAction() { if (M.role === "guest") reportState(); if (M.role === "host") broadcastBoard(); }

  // ---------- QR ----------
  async function qrImg(text) {
    try {
      const qrcode = await qrLib();
      const q = qrcode(0, "L");
      q.addData(text);
      q.make();
      return q.createDataURL(Math.max(2, Math.floor(260 / q.getModuleCount())), 2);
    } catch { return null; }
  }
  let qrCache = { text: "", url: null };
  function qrBlock(text, label) {
    if (qrCache.text !== text) { qrCache = { text, url: null }; qrImg(text).then((u) => { if (qrCache.text === text) { qrCache.url = u; rerender(); } }); }
    return `<div class="qrbox"><p class="small">${label}</p>${qrCache.url ? `<img class="qr" src="${qrCache.url}" alt="연결 QR 코드">` : `<p class="small muted">QR 만드는 중…</p>`}
      <details><summary class="small">QR이 안 되면: 글자로 복사</summary><textarea readonly class="sdp">${text}</textarea><button class="btn xs" data-mp="copy">복사</button></details></div>`;
  }
  // 카메라로 QR 읽기
  let stream = null, raf = 0;
  async function startScan(purpose) {
    try {
      const jsQR = await scanLib();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      M.scanning = purpose;
      rerender();
      const v = document.getElementById("mpVideo");
      v.srcObject = stream;
      await v.play();
      const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
      const tick = () => {
        if (!M.scanning) return;
        if (v.videoWidth) {
          c.width = v.videoWidth; c.height = v.videoHeight;
          g.drawImage(v, 0, 0);
          const hit = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
          if (hit?.data) { stopScan(); return useCode(purpose, hit.data); }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { M.msg = "카메라를 쓸 수 없어요. 아래 칸에 글자를 붙여 넣어 주세요."; stopScan(); rerender(); }
  }
  function stopScan() { M.scanning = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); stream = null; }
  async function useCode(purpose, text) {
    try {
      if (purpose === "offer") await guestAcceptOffer(text);
      else await hostAcceptAnswer(text);
    } catch (e) { M.msg = "코드를 읽지 못했어요. 다시 시도해 주세요."; }
    rerender();
  }

  // ---------- 화면 ----------
  function board(rows, final) {
    if (!rows?.length) return "";
    return `<ol class="mpboard">${rows.map((x, i) => `<li class="${x.name.startsWith(M.name) ? "me" : ""}"><span class="rk">${["🥇", "🥈", "🥉"][i] || i + 1}</span><b>${esc(x.name)}</b>${final && x.stars != null ? `<span class="st">${"★".repeat(x.stars)}${"☆".repeat(3 - x.stars)}</span>` : !final ? `<span class="rd">${x.ready ? "✓ 준비" : "…"}</span>` : ""}<span class="${cls(x.r ?? 0)}">${x.r == null ? "—" : pct(x.r)}</span></li>`).join("")}</ol>`;
  }
  function controls(s) {
    const d = ST()._data(s.stg), left = d.end - s.stg.day;
    const rows = M.role === "host" ? buildBoard() : M.board;
    const readyN = rows.filter((x) => x.ready).length;
    return `<section class="mpbar">
      <div class="mphead"><b>👥 ${M.role === "host" ? "내 방" : esc(M.room || "방")}</b><span class="small muted">${rows.length}명 · ${left}일 남음</span></div>
      ${board(rows)}
      ${M.role === "host"
        ? `<div class="stime"><button class="btn ghost" data-stg="next:1">모두 다음 날 ▶</button><button class="btn ghost" data-stg="next:5">모두 5일 ▶</button><span class="small muted mpready">준비 ${readyN}/${rows.length}</span></div>`
        : `<div class="stime"><button class="btn ${M.ready ? "ghost" : "primary"}" data-mp="ready">${M.ready ? "✓ 준비 완료" : "준비 완료"}</button><span class="small muted mpready">날짜는 방장이 넘겨요</span></div>`}
    </section>`;
  }
  function finalBoard(s) {
    const rows = M.role === "host" ? buildBoard() : M.board;
    return `<h3 class="sub">👥 최종 순위</h3>${board(rows, true)}<p class="small muted">모두 끝나면 순위가 확정돼요.</p>
      <div class="tnav"><button class="btn" data-mp="lobby">함께 하기</button>${M.role === "host" ? `<button class="btn primary" data-mp="again">새 판 시작</button>` : `<button class="btn primary" data-mp="waiting">다음 판 기다리기</button>`}</div>`;
  }
  function view(s) {
    if (M.screen === "game" && s.stg?.mp) return ST().view(s);
    M.name ||= s.mpName || "";
    const scan = M.scanning ? `<div class="scanbox"><video id="mpVideo" playsinline muted></video><button class="btn" data-mp="stopscan">카메라 닫기</button></div>` : "";
    const nameField = `<label class="fld"><span>내 이름</span><input id="mpName" maxlength="12" value="${esc(M.name)}" placeholder="예: 민수"></label>`;
    if (M.role === "host") {
      const opts = ST().playable();
      const open = M.peers.filter((p) => p.open);
      return `<section class="tcard"><p class="eyebrow">👑 방장</p><h2>방 '${esc(M.name)}'</h2>
        <label class="fld"><span>함께 할 판</span><select id="mpChoice" class="sel"><option value="random-virtual" ${M.choice === "random-virtual" ? "selected" : ""}>🎲 가상 랜덤</option><option value="random-real" ${M.choice === "random-real" ? "selected" : ""}>🎲 실제 랜덤 (연도 맞히기)</option>${opts.map((o) => `<option value="${o.id}" ${M.choice === o.id ? "selected" : ""}>${o.label}</option>`).join("")}</select></label>
        <h3 class="sub">참가자 ${open.length}명</h3>
        <ul class="orders">${open.map((p) => `<li>🟢 ${esc(p.name)}</li>`).join("") || `<li class="muted">아직 없어요</li>`}</ul>
        ${M.offerText
          ? `${qrBlock(M.offerText, "① 참가자가 이 QR을 찍어요")}
             <p class="small">② 참가자 화면에 나온 답장 QR을 찍어요</p>
             <div class="trade-btns2"><button class="btn primary" data-mp="scan-answer">📷 답장 QR 찍기</button></div>
             <label class="fld"><span>또는 답장 글자 붙여 넣기</span><textarea id="mpAnswer" class="sdp" placeholder="참가자가 보낸 글자"></textarea></label><button class="btn" data-mp="paste-answer">연결하기</button>`
          : `<button class="btn" data-mp="invite">➕ 참가자 초대하기 (한 명씩)</button>`}
        ${scan}
        <p class="mpmsg" aria-live="polite">${esc(M.msg)}</p>
        <button class="btn primary wide" data-mp="start" ${open.length ? "" : ""}>${open.length ? `${open.length + 1}명이서 시작!` : "혼자 먼저 시작하기 (나중에 들어와도 돼요)"}</button>
        <button class="linkbtn" data-mp="leave">방 닫기</button></section>`;
    }
    if (M.role === "guest") {
      return `<section class="tcard"><p class="eyebrow">🙋 참가자</p><h2>${M.hostDC?.readyState === "open" ? `방 '${esc(M.room)}' 연결 완료` : "방에 들어가기"}</h2>
        ${M.hostDC?.readyState === "open" ? `<p>방장이 판을 시작하면 자동으로 시작해요. 잠깐만 기다려 주세요!</p>`
          : M.answerText ? `${qrBlock(M.answerText, "② 이 답장 QR을 방장에게 보여 주세요")}<p class="small muted">방장이 찍으면 자동으로 연결돼요.</p>`
          : `<p class="small">① 방장 화면의 초대 QR을 찍어요</p><button class="btn primary" data-mp="scan-offer">📷 초대 QR 찍기</button>
             <label class="fld"><span>또는 초대 글자 붙여 넣기</span><textarea id="mpOffer" class="sdp" placeholder="방장이 보낸 글자"></textarea></label><button class="btn" data-mp="paste-offer">들어가기</button>`}
        ${scan}<p class="mpmsg" aria-live="polite">${esc(M.msg)}</p><button class="linkbtn" data-mp="leave">나가기</button></section>`;
    }
    const opts = ST().playable();
    return `<section class="hero thero"><p class="eyebrow">TOGETHER</p><h1>👥 함께 하기</h1><p class="muted">같은 시장에서 친구·가족과 겨뤄요. 인터넷 서버 없이 휴대폰끼리 직접 연결해요.</p></section>
      ${nameField}
      <section class="tcard"><h2>📡 실시간 근거리 대전</h2><p class="small muted">같은 Wi-Fi(또는 한 사람의 핫스팟)에 모두 연결하세요. QR 코드를 서로 찍어 연결해요. 방장이 날짜를 넘기면 모두 함께 넘어가고, 순위가 실시간으로 바뀌어요.</p>
        <div class="trade-btns2"><button class="btn primary" data-mp="host">👑 방 만들기</button><button class="btn" data-mp="join">🙋 방 들어가기</button></div></section>
      <section class="tcard"><h2>🔢 같은 판 코드 대결</h2><p class="small muted">Wi-Fi도 인터넷 연결도 필요 없어요(앱만 열려 있으면 돼요). 한 사람이 판을 고르고 코드를 알려 주면, 모두 같은 시장으로 각자 플레이한 뒤 결과를 보여 주며 겨뤄요.</p>
        <label class="fld"><span>판 고르기</span><select id="mpCodeChoice" class="sel"><option value="random-virtual">🎲 가상 랜덤</option><option value="random-real">🎲 실제 랜덤</option>${opts.map((o) => `<option value="${o.id}">${o.label}</option>`).join("")}</select></label>
        <button class="btn" data-mp="makecode">코드 만들고 시작</button>
        <label class="fld"><span>친구가 알려 준 코드</span><input id="mpCode" value="${esc(M.codeIn)}" placeholder="예: v3-48213, h2008, rr-h2022-30"></label>
        <button class="btn primary" data-mp="usecode">이 코드로 시작</button>
        <p class="mpmsg" aria-live="polite">${esc(M.msg)}</p></section>`;
  }

  async function click(cmd, s) {
    M.msg = "";
    const val = (id) => document.getElementById(id)?.value || "";
    const needName = () => { M.name = val("mpName").trim() || M.name; if (!M.name) { M.msg = "이름을 먼저 적어 주세요."; return false; } s.mpName = M.name; return true; };
    try {
      if (cmd === "host") { if (!needName()) return; M.role = "host"; M.screen = "lobby"; }
      else if (cmd === "join") { if (!needName()) return; M.role = "guest"; M.screen = "lobby"; }
      else if (cmd === "invite") { M.msg = "초대 QR을 만드는 중…"; rerender(); await hostNewInvite(); M.msg = ""; }
      else if (cmd === "scan-answer") await startScan("answer");
      else if (cmd === "scan-offer") await startScan("offer");
      else if (cmd === "stopscan") stopScan();
      else if (cmd === "paste-answer") await useCode("answer", val("mpAnswer"));
      else if (cmd === "paste-offer") await useCode("offer", val("mpOffer"));
      else if (cmd === "copy") { const t = document.querySelector("textarea.sdp[readonly]")?.value; await navigator.clipboard?.writeText(t); M.msg = "복사했어요. 메신저 등으로 보내도 돼요."; }
      else if (cmd === "start" || cmd === "again") { M.choice = val("mpChoice") || M.choice; hostStart(); }
      else if (cmd === "ready") { M.ready = !M.ready; reportState(); }
      else if (cmd === "lobby" || cmd === "waiting") { M.screen = cmd === "waiting" ? "game" : "lobby"; if (cmd === "lobby") { s.stg && (s.stg.mp = null); } }
      else if (cmd === "leave") { M.peers.forEach((p) => p.pc.close()); M.guestPC?.close(); stopScan(); Object.assign(M, { role: null, peers: [], pending: null, guestPC: null, hostDC: null, board: [], spec: null, screen: "lobby", offerText: "", answerText: "" }); if (s.stg) s.stg.mp = null; }
      else if (cmd === "makecode" || cmd === "usecode") {
        const spec = cmd === "makecode" ? ST().specForChoice(val("mpCodeChoice")) : ST().specFromCode((M.codeIn = val("mpCode")));
        if (!spec) { M.msg = "코드를 찾지 못했어요. 다시 확인해 주세요."; }
        else { ST().startSpec(s, spec); ST().go("play"); s.view = "stage"; M.msg = ""; }
      }
    } catch (e) { M.msg = "문제가 생겼어요: " + (e.message || e); }
    rerender();
  }
  document.addEventListener("change", (e) => { if (e.target.id === "mpChoice") M.choice = e.target.value; if (e.target.id === "mpName") M.name = e.target.value.trim(); });
  return { view, click, controls, finalBoard, onNext, afterAction, _M: M };
})();
