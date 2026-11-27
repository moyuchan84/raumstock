// 🤖 컴퓨터 친구 (아이 모드 · 스토리 앱의 스테이지가 같이 써요)
// 규칙: 정하는 날(checkpoint)까지의 가격만 봐요. 미래 가격은 절대 보지 않아요.
window.RAUM_RIVAL = (() => {
  // 씨앗이 같으면 늘 같은 선택 (화면을 다시 그려도 바뀌지 않게)
  const pickTwo = (syms, seed) => {
    let a = seed >>> 0;
    const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pool = [...syms], out = [];
    while (pool.length && out.length < 2) out.push(...pool.splice(Math.floor(rand() * pool.length), 1));
    return out;
  };

  // choose(...) → 새로 담을 가게 목록(똑같이 나눔), 바꾸지 않으면 null
  const BOTS = [
    { id: "basket", e: "🧺", name: "바구니 로봇", how: "모든 가게에 똑같이 나눠 담고 그대로 둬요.",
      choose: ({ n, syms }) => (n === 0 ? syms : null) },
    { id: "chaser", e: "🐇", name: "따라쟁이 토끼", how: "그동안 가장 많이 오른 두 가게로 옮겨요.",
      choose: ({ syms, price, day, since }) => [...syms].sort((a, b) => price(b, day) / price(b, since) - price(a, day) / price(a, since)).slice(0, 2) },
    { id: "dice", e: "🎲", name: "주사위 로봇", how: "정하는 날마다 주사위로 두 가게를 골라요.",
      choose: ({ n, syms, seed }) => pickTwo(syms, seed + n * 9973) },
  ];

  // syms: 살 수 있는 가게, price(sym, day), points: 정하는 날(오름차순), now: 지금 날, back: 첫 결정 때 돌아보는 날 수
  // start: 처음 돈, fee: 거래 금액에 붙는 수수료 비율
  // → [{ id, e, name, how, value, holds: [{ sym, value }], first: [sym], trades }]
  function play({ syms, price, points, now, start, fee = 0, seed = 1, back = 20 }) {
    return BOTS.map((bot) => {
      let cash = start, qty = {}, first = [], trades = 0;
      points.filter((day) => day <= now).forEach((day, n, days) => {
        const since = n ? days[n - 1] : Math.max(0, day - back);
        const next = bot.choose({ n, syms, price, day, since, seed });
        if (!next) return;
        if (!n) first = next;
        const held = Object.keys(qty);
        if (held.length === next.length && next.every((s) => qty[s])) return; // 같은 가게면 그대로
        const value = cash + held.reduce((a, s) => a + qty[s] * price(s, day), 0);
        const target = value / next.length;
        // 바뀌는 금액만큼만 수수료
        const moved = new Set([...held, ...next]);
        let cost = 0;
        for (const s of moved) cost += Math.abs((next.includes(s) ? target : 0) - (qty[s] || 0) * price(s, day)) * fee;
        const each = (value - cost) / next.length;
        qty = Object.fromEntries(next.map((s) => [s, each / price(s, day)]));
        cash = 0;
        if (n) trades++;
      });
      const holds = Object.entries(qty).map(([sym, q]) => ({ sym, value: q * price(sym, now) }));
      return { id: bot.id, e: bot.e, name: bot.name, how: bot.how, first, holds, trades, value: cash + holds.reduce((a, h) => a + h.value, 0) };
    });
  }

  return { play, BOTS };
})();

// QR 만들기·읽기 도구 (필요할 때만 불러와요. 함께 하기와 같은 라이브러리)
window.RAUM_QR = (() => {
  const libs = {};
  const load = (src, global) => (window[global] ? Promise.resolve(window[global]) : (libs[src] ||= new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = src; s.onload = () => ok(window[global]); s.onerror = () => { delete libs[src]; s.remove(); no(new Error("load " + src)); };
    document.head.append(s);
  })));
  return {
    make: () => load("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", "qrcode"),
    scan: () => load("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js", "jsQR"),
  };
})();
