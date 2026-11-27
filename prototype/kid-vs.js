// 🤝 꼬마 탐험가 '같이 겨루기': 컴퓨터 친구 · 가까이 있는 친구와 결과를 나란히 비교
// 서버 없이: 2020년 가격은 모두에게 같으니, 여행이 끝난 뒤 결과 카드(QR 또는 글자)만 주고받으면 돼요.
// 순위·메달은 만들지 않아요. 동전 수와 함께 '무엇을 왜 골랐는지'를 보고 이야기해요.
window.RAUM_KID_VS = ({ $, c1, shops, whys, changes, ended, result, bots, show, home, trip }) => {
  const KEY = "raum-kid-vs-v1";
  const load = () => { try { return { name: "", friends: [], ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { name: "", friends: [] }; } };
  let V = load();
  const keep = () => localStorage.setItem(KEY, JSON.stringify(V));
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const MAX_FRIENDS = 8;

  // ---------- 결과 카드 ↔ 글자 ----------
  // RK1. + base64url(JSON [별명, 동전, [1월 가게 비트, 마지막 가게 비트], 처음 이유, 바꾼 횟수, 마지막으로 바꾼 이유])
  const bits = (syms) => shops.reduce((a, s, i) => a + (syms.includes(s.sym) ? 1 << i : 0), 0);
  const unbits = (n) => shops.filter((_, i) => n & (1 << i)).map((s) => s.sym);
  const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const encode = (r) => "RK1." + b64(new TextEncoder().encode(JSON.stringify([r.name, Math.round(r.coins * 10), [bits(r.first), bits(r.last)], r.why ?? -1, r.changed, r.change ?? -1])));
  // 남이 보낸 글자라서 모양과 범위를 모두 확인해요
  function decode(text) {
    const t = String(text || "").replace(/\s+/g, "");
    if (!t.startsWith("RK1.") || t.length > 400) return null;
    try {
      const a = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.slice(4).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
      const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
      const all = (1 << shops.length) - 1;
      if (!Array.isArray(a) || a.length !== 6) return null;
      const [name, coins, picks, why, changed, change] = a;
      if (typeof name !== "string" || !name.trim() || !int(coins, 0, 100000) || !Array.isArray(picks) || !int(picks[0], 0, all) || !int(picks[1], 0, all)) return null;
      if (!int(why, -1, whys.length - 1) || !int(changed, 0, 9) || !int(change, -1, changes.length - 1)) return null;
      return { name: name.trim().slice(0, 8), coins: coins / 10, first: unbits(picks[0]), last: unbits(picks[1]), why: why < 0 ? null : why, changed, change: change < 0 ? null : change };
    } catch { return null; }
  }
  const mine = () => ({ name: V.name || "나", ...result() });

  function addFriend(text) {
    const f = decode(text);
    if (!f) { msg = "친구 결과 글자가 아니에요. 다시 확인해 주세요."; return false; }
    if (encode(f) === encode(mine())) { msg = "내 결과예요! 친구의 QR을 찍어요."; return false; }
    V.friends = [...V.friends.filter((x) => x.name !== f.name), f].slice(-MAX_FRIENDS);
    keep();
    msg = `${f.name} 친구의 결과를 담았어요!`;
    return true;
  }

  // ---------- QR (함께 하기와 같은 도구. 처음 한 번은 인터넷이 필요해요) ----------
  let qr = { text: "", url: null, failed: false };
  async function makeQr(text) {
    qr = { text, url: null, failed: false };
    try {
      const lib = await window.RAUM_QR.make();
      const q = lib(0, "M");
      q.addData(text);
      q.make();
      if (qr.text !== text) return;
      qr.url = q.createDataURL(6, 3);
    } catch { qr.failed = true; }
    if (open && !scanning) render();
  }
  let scanning = null; // { stop() }
  function stopScan() { scanning?.stop(); scanning = null; }
  async function startScan() {
    msg = "";
    const job = { dead: false, stream: null, stop() { this.dead = true; this.stream?.getTracks().forEach((t) => t.stop()); } };
    scanning = job;
    render();
    try {
      const jsQR = await window.RAUM_QR.scan();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      job.stream = stream;
      if (job.dead) return job.stop();
      const v = document.getElementById("vsVideo");
      v.srcObject = stream;
      await v.play();
      const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
      const tick = () => {
        if (job.dead) return;
        if (v.videoWidth) {
          c.width = v.videoWidth; c.height = v.videoHeight;
          g.drawImage(v, 0, 0);
          const hit = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
          if (hit?.data && addFriend(hit.data)) { stopScan(); return render(); }
          if (hit?.data) $("#vsMsg").textContent = msg;
        }
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      if (job.dead) return;
      stopScan();
      msg = "카메라를 쓸 수 없어요. 아래 칸에 친구 글자를 붙여 넣어 주세요.";
      render();
    }
  }

  // ---------- 화면 ----------
  let open = false, msg = "";
  const shopList = (syms) => (syms.length ? syms.map((x) => { const s = shops.find((y) => y.sym === x); return `${s.e} ${s.kid}`; }).join("<br>") : "🐷 저금통만");
  function person(r, { me = false, friend = -1 } = {}) {
    return `<div class="vsp ${me ? "me" : ""}"><div class="vsh"><b>${me ? "🧒" : "🙂"} ${esc(r.name)}${me ? " (나)" : ""}</b><span>🪙 ${c1(r.coins)}개</span></div>
      <dl><dt>1월에 고른 가게</dt><dd>${shopList(r.first)}</dd><dt>12월에 가진 가게</dt><dd>${shopList(r.last)}</dd>
      <dt>처음 고른 이유</dt><dd>${r.why === null ? "—" : whys[r.why]}</dd>
      <dt>바꾼 날</dt><dd>${r.changed}번${r.change === null ? "" : `<br><small>마지막 이유: ${changes[r.change]}</small>`}</dd></dl>
      ${friend < 0 ? "" : `<button class="vsdel" data-act="vsdel" data-i="${friend}">지우기</button>`}</div>`;
  }
  const robot = (b) => `<div class="vsp bot"><div class="vsh"><b>${b.e} ${b.name}</b><span>🪙 ${c1(b.value)}개</span></div>
    <dl><dt>정한 방법</dt><dd>${b.how}</dd><dt>1월에 고른 가게</dt><dd>${shopList(b.first)}</dd><dt>12월에 가진 가게</dt><dd>${shopList(b.holds.map((h) => h.sym))}</dd><dt>바꾼 날</dt><dd>${b.trades}번</dd></dl></div>`;

  function render() {
    const head = `<div class="banner"><span class="em">🤝</span><div><b>같이 겨루기</b><small>누가 이겼는지보다 어떻게 골랐는지 봐요</small></div></div>`;
    const back = `<div class="menu"><button class="big" data-act="vshome"><span>⬅️</span><div>처음 화면으로</div></button></div>`;
    if (!ended()) {
      $("#main").innerHTML = `${head}<div class="card"><h2>먼저 2020년 여행을 끝내요</h2><p>여행을 끝내면 컴퓨터 친구 셋의 결과가 열리고, 가까이 있는 친구와 결과 카드를 주고받을 수 있어요.</p><p class="small">친구 것을 먼저 보면 따라 고르게 되니까, 각자 끝낸 뒤에 열어 봐요.</p></div>
        <div class="menu"><button class="big main" data-act="vstrip"><span>🚀</span><div>2020년 여행하러 가기</div></button></div>${back}`;
      return;
    }
    const me = mine(), code = encode(me);
    if (V.name && qr.text !== code) makeQr(code);
    const share = !V.name ? `<p class="small">별명을 적으면 내 결과 카드가 만들어져요. 진짜 이름 말고 별명을 써요.</p>`
      : `${qr.url ? `<img class="vsqr" src="${qr.url}" alt="내 결과 QR 코드"><p class="small">친구가 이 QR을 찍어요</p>` : `<p class="small">${qr.failed ? "QR을 만들지 못했어요(인터넷이 필요해요). 아래 글자를 보내 주세요." : "QR 만드는 중…"}</p>`}
         <details ${qr.failed ? "open" : ""}><summary class="small">QR 대신 글자로 보내기</summary><textarea id="vsMine" class="vstext" readonly>${code}</textarea><button class="pill ghost" data-act="vscopy">복사</button></details>`;
    $("#main").innerHTML = `${head}
      <div class="card"><h2>📇 내 결과 카드</h2><label class="vsname">내 별명 <input id="vsName" maxlength="8" value="${esc(V.name)}" placeholder="예: 토끼"></label><button class="pill" data-act="vsnameok">카드 만들기</button>${share}</div>
      <div class="card"><h2>📷 친구 결과 담기</h2>${scanning ? `<video id="vsVideo" class="vsvideo" playsinline muted></video><button class="pill ghost" data-act="vsstop">카메라 닫기</button>`
        : `<button class="pill" data-act="vsscan">친구 QR 찍기</button><details><summary class="small">글자를 받았다면</summary><textarea id="vsIn" class="vstext" placeholder="RK1. 로 시작하는 글자"></textarea><button class="pill ghost" data-act="vspaste">담기</button></details>`}
        <p id="vsMsg" class="small" aria-live="polite">${esc(msg)}</p></div>
      <h2 class="vstitle">나란히 보기</h2>
      <div class="vsgrid">${person(me, { me: true })}${V.friends.map((f, i) => person(f, { friend: i })).join("")}${bots().map(robot).join("")}</div>
      <div class="card"><h2>🗣️ 이야기해 봐요</h2><ul><li>나와 가장 다르게 고른 건 누구야? 왜 그렇게 골랐을까?</li><li>동전이 많은 쪽은 잘 생각해서였을까, 운이었을까?</li><li>다른 해였어도 같은 결과였을까?</li></ul>
        <p class="small">🍀 한 해 결과만으로는 어떤 방법이 좋은지 알 수 없어요.</p></div>
      ${back}`;
  }

  function act(a, data) {
    if (a === "vsopen") { open = true; msg = ""; show(); render(); return true; }
    if (a === "vshome") { close(); home(); return true; }
    if (a === "vstrip") { close(); trip(); return true; }
    if (a === "vsnameok") {
      const name = ($("#vsName")?.value || "").trim().slice(0, 8);
      V.name = name; keep(); msg = name ? "" : "별명을 먼저 적어 주세요."; render(); return true;
    }
    if (a === "vsscan") { startScan(); return true; }
    if (a === "vsstop") { stopScan(); render(); return true; }
    if (a === "vspaste") { addFriend($("#vsIn")?.value); render(); return true; }
    if (a === "vsdel") { V.friends.splice(+data.i, 1); keep(); msg = ""; render(); return true; }
    if (a === "vscopy") {
      const t = $("#vsMine")?.value || "";
      Promise.resolve(navigator.clipboard?.writeText(t)).then(() => { $("#vsMsg").textContent = "복사했어요."; }, () => $("#vsMine")?.select());
      return true;
    }
    return false;
  }
  function close() { open = false; stopScan(); }

  return { act, render, close, encode, decode };
};
