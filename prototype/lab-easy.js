// 겪어 보기 · 🧒 아이 버전: 화면마다 그림 하나, 짧은 말, 누를 것 하나. 3~4화면이면 끝.
// 점수·제한 시간·맞히기 보상은 넣지 않아요. 자세한 숫자와 표는 어른 버전(lab-full.js)에.
window.RAUM_LAB_EASY = (K) => {
  const { D, c1, START, at, NAMES, STORES, label, card, rows, note, graph, tap, walk, stat, mix, target, long } = K;
  const pic = (inner) => `<div class="card pic">${inner}</div>`;
  const coins = (v) => `<div class="coinnum">🪙 <b>${c1(v)}</b>개</div>`;
  const small = "교육용 연습이라 일부러 고른 이야기예요.";

  // ---------- ① 가게랑 값표 ----------
  const months = () => {
    const ys = walk("ZM"), ends = [];
    D.dates.slice(START).forEach((d, i) => { ends[+d.slice(5, 7) - 1] = i; });
    return { ys, ends };
  };
  const lemons = (n) => `<div class="lemons">${"<span>🍋</span>".repeat(n)}</div>`;
  const zmTimes = Math.round(K.F.ZM.now.net / K.F.ZM.prev.net);
  const GAP = [
    () => ({
      title: "두 가지가 있어",
      body: pic(`<div class="two"><div><span>🍋</span><b>가게가 번 돈</b><small>장사해서 남긴 돈</small></div><div><span>🏷️</span><b>값표</b><small>사람들이 사고파는 주식 값</small></div></div>`),
      text: "가게가 번 돈이랑 주식 값표는 서로 달라요.",
    }),
    (P) => {
      const { ys, ends } = months(), m = P.m ?? 0, now = ys[ends[m]], prev = m ? ys[ends[m - 1]] : 10;
      const face = now >= prev ? "올랐어요 😊" : "내렸어요 😮";
      return {
        title: "💻 화상 수업 가게의 값표",
        body: pic(`${coins(now)}<p class="center">2020년 <b>${m + 1}월 끝</b> · 지난번보다 ${face}</p>${graph([{ ys: ys.slice(0, ends[m] + 1), color: "#2f6fe4" }], { base: 10, len: ys.length, left: "1월", right: "12월" })}${m < 11 ? tap("📅 한 달 넘기기", "m", m + 1, "wide") : `<p class="center">한 해가 끝났어요!</p>`}`),
        text: m < 11 ? "1월에 동전 10개였어요. 한 달씩 넘겨 봐요." : `쑥 올랐다가, 마지막에는 뚝 내려갔어요. 그래도 12월 끝에는 ${c1(now)}개예요.`,
        wait: m < 11,
        tapSay: `${m + 1}월 끝. 동전 ${c1(now)}개. ${face.split(" ")[0]}`,
      };
    },
    (P) => ({
      title: "📬 가게 성적표",
      body: pic(`<p class="center">1년 동안 번 돈 (레몬 하나 = 그 전 해에 번 만큼)</p><div class="two"><div><b>그 전 해</b>${lemons(1)}</div><div><b>다음 해</b>${P.open ? lemons(zmTimes) : `<span class="closed">✉️</span>`}</div></div>${P.open ? "" : tap("✉️ 성적표 열기", "open", 1, "wide")}`) + (P.open ? note("1년 성적표는 한 해가 다 끝난 뒤에 나와요.") : ""),
      text: P.open ? `가게는 약 ${zmTimes}배나 더 벌었어요! 그런데 연말에 값표는 내려가고 있었어요.` : "값표를 봤으니, 이번에는 가게가 번 돈을 열어 봐요.",
      wait: !P.open,
      tapSay: `가게는 약 ${zmTimes}배나 더 벌었어요.`,
    }),
    () => ({
      title: "기억해요",
      body: pic(`<div class="bigpic">🍋 ≠ 🏷️</div><p class="center">가게가 잘 벌어도 값표는 내려갈 수 있어요.</p>`),
      text: "값표만 보고는 가게가 좋아졌는지 나빠졌는지 알 수 없어요.",
      ask: { key: "first", q: "값표가 뚝 내려가면 뭘 볼까?", opts: ["🍋 가게 장사", "🏷️ 값표만 계속", "🤷 아직 모르겠어"], reply: () => "가게 장사도 함께 살펴봐요. 정말로 가게가 나빠져서 값이 내릴 때도 있거든요." },
    }),
  ];

  // ---------- ② 싼 걸까, 비싼 걸까: 레몬 하나에 동전 몇 개 ----------
  // key 화면에서 '나눠 놓기'를 누를 때마다 레몬마다 동전이 하나씩 놓여요
  function share(P, key, n, price) {
    const per = price / n, r = Math.min(P[key] ?? 0, per), full = r === per;
    return {
      full, per,
      body: pic(`<p class="center">🏷️ 가게 값: <b>동전 ${price}개</b> · 🍋 1년에 버는 레몬 <b>${n}개</b></p><div class="stalls">${Array.from({ length: n }, () => `<div><span>🍋</span><i>${"🪙".repeat(r)}</i></div>`).join("")}</div><p class="center">남은 동전 ${price - r * n}개</p>${full ? `<div class="bigpic">레몬 1개 = 🪙 ${per}개</div>` : tap("🪙 레몬마다 하나씩 놓기", key, r + 1, "wide")}`) + note("연습용으로 만든 예시 숫자예요."),
    };
  }
  const CHEAP = [
    (P) => {
      const s = share(P, "a", 2, 8);
      return { title: "첫 번째 가게", body: s.body, wait: !s.full, tapSay: s.full ? "레몬 하나에 동전 네 개예요." : "하나씩 놓았어요.", text: s.full ? "이 가게는 레몬 하나에 동전 4개를 내는 셈이에요." : "가게 값이 싼지 알려면, 레몬 하나에 동전을 몇 개 내는지 봐요. 나눠 놓아 봐요." };
    },
    (P) => {
      const s = share(P, "b", 1, 6);
      return { title: "값이 내렸다! 싸졌을까?", body: s.body, wait: !s.full, tapSay: s.full ? "레몬 하나에 동전 여섯 개예요." : "하나 더 놓았어요.", text: s.full ? "값은 8개에서 6개로 내렸는데, 레몬 하나에는 4개에서 6개로 더 많이 내게 됐어요. 더 비싸진 거예요!" : "가게 값이 내렸어요. 그런데 버는 레몬도 줄었대요. 나눠 놓아 봐요." };
    },
    (P) => {
      const s = share(P, "c", 4, 12);
      return { title: "값이 올랐다! 비싸졌을까?", body: s.body, wait: !s.full, tapSay: s.full ? "레몬 하나에 동전 세 개예요." : "하나씩 놓았어요.", text: s.full ? "값은 8개에서 12개로 올랐는데, 레몬 하나에는 3개만 내요. 처음보다 싸진 거예요!" : "이번에는 가게 값이 올랐어요. 버는 레몬은 더 많이 늘었대요." };
    },
    () => ({
      title: "하지만 한 가지!",
      body: pic(`<div class="bigpic">🍋 → ❓</div><p class="center">레몬은 앞으로 늘 수도, 줄 수도 있어요.</p>`),
      text: "지금 싸 보여도, 앞으로 레몬이 줄면 싼 게 아니었던 거예요.",
      ask: { key: "next", q: "내년 레몬이 몇 개일지 누가 확실히 알까?", opts: ["🧒 나", "🧑 어른", "🙅 아무도 몰라"], reply: () => "아무도 확실히는 몰라요. 어른 전문가끼리도 생각이 달라요. 그래서 '왜 그렇게 생각하는지'가 중요해요." },
    }),
  ];

  // ---------- ③ 하나와 바구니: 직접 담기 ----------
  const BASKET = [
    (P) => {
      const picked = STORES.filter((s) => P[`b_${s}`]), x = picked.length ? mix(picked) : null;
      const chips = STORES.map((s) => `<button class="tap ${P[`b_${s}`] ? "on" : ""}" data-act="labflip" data-k="b_${s}" aria-pressed="${!!P[`b_${s}`]}">${label(s)}</button>`).join("");
      return {
        title: "바구니에 담아 봐요",
        body: pic(`<div class="chips">${chips}</div>`) + card(x ? `<p class="center">🧺 ${picked.map((s) => NAMES[s][0]).join(" ")} 에 동전 10개를 똑같이 나눠 담았어요</p>${graph([{ ys: x.ys, color: "#e8590c" }], { base: 10, left: "1월", right: "12월" })}${rows([["📉 가는 동안 가장 적을 때", `${c1(x.low)}개`], ["🏁 연말", `${c1(x.end)}개`]])}` : `<p class="center">🧺 아직 비어 있어요</p>`),
        text: picked.length < 3 ? "먼저 한 곳만 담아 보고, 세 곳 이상으로 늘려 봐요. 2020년 길이 어떻게 바뀔까요?" : "넣고 빼 보면서 길이 얼마나 흔들리는지 봐요. 여러 곳을 담으면 한 곳의 영향이 작아져요. 늘 더 많아지는 건 아니에요.",
        wait: picked.length < 3 && !P.three,
        tapSay: x ? `가장 적을 때 ${c1(x.low)}개, 연말 ${c1(x.end)}개.` : "바구니가 비었어요.",
      };
    },
    () => {
      const b = stat("SPY");
      return {
        title: "아주 큰 바구니",
        body: pic(`<p class="center">🧺 <b>S&amp;P 500</b>: 미국 큰 회사 약 500곳을 담아요</p>${graph([{ ys: b.ys, color: "#1f9e7f" }], { base: 10, left: "1월", right: "12월" })}`),
        text: "500곳이나 담은 바구니는 2020년에 어땠을까요?",
        ask: { key: "down", q: "큰 바구니는 안 내려갈까?", opts: ["🛡️ 안 내려가", "📉 내려갈 수 있어", "🤷 모르겠어"], reply: () => `봄에 동전 10개가 <b>${c1(b.low)}개</b>까지 내려갔고, 연말에는 ${c1(b.end)}개였어요. 큰 바구니도 크게 내려갈 수 있어요.` },
      };
    },
    () => ({
      title: "기억해요",
      body: pic(`<div class="two"><div><span>🏪</span><b>가게 하나</b><small>크게 늘 수도, 크게 줄 수도</small></div><div><span>🧺</span><b>바구니</b><small>한 곳의 영향이 작아요. 그래도 내려가요</small></div></div>`),
      text: "바구니는 안전 상자가 아니에요. 한 곳에 몰아 담지 않는 방법이에요.",
    }),
  ];

  // ---------- ④ 언제 팔까: 시간을 넘기며 ----------
  const PICK = ["💰 모두 팔기", "✂️ 절반 팔기", "🌳 그대로 두기"];
  const story = (set, sym, name, key) => (P) => {
    const t = target(set, sym), h = t.hit, end = t.ys.length - 1;
    const stops = [0, Math.round(h / 2), h, Math.round(h + (end - h) / 3), Math.round(h + (end - h) * 2 / 3), end];
    const s = P[`${key}s`] ?? 0, choice = P[`${key}c`], i = stops[s], price = t.ys[i];
    const afterHit = s >= 2 && choice !== undefined;
    // 지금 내 동전: 목표에서 판 만큼은 저금통에 두고, 남은 만큼만 값을 따라감
    const sold = [1, 0.5, 0], mine = afterHit ? sold[choice] * t.ys[h] + (1 - sold[choice]) * price : price;
    const asking = s === 2 && choice === undefined;
    const finished = s === stops.length - 1;
    const promise = P.rule;
    const control = asking
      ? `<div class="goal">🎯 목표 12개에 닿았어요! 다시 확인할 때예요.${promise === undefined ? "" : `<br><small>처음 약속: ${PICK[promise]}</small>`}</div><div class="chips">${PICK.map((p, v) => tap(p, `${key}c`, v)).join("")}</div>`
      : finished ? "" : tap("⏩ 시간 넘기기", `${key}s`, s + 1, "wide");
    const result = finished ? card(rows(PICK.map((p, v) => [`${p}${v === choice ? " <em>내가 고른 것</em>" : ""}`, `${c1(t.out[v])}개`, v === choice ? "mine" : ""]))) : "";
    return {
      title: name,
      body: pic(`${coins(mine)}<p class="center">${K.ym(t.d[i])}${afterHit && choice !== 2 ? ` · 가게 값만 따라갔다면 ${c1(price)}개` : ""}</p>${graph([{ ys: t.ys.slice(0, i + 1), color: "#2f6fe4" }], { base: 12, len: t.ys.length, left: "시작", right: "끝" })}${control}`) + result,
      text: finished ? (t.out[2] > t.out[0] ? "이번에는 그대로 둔 쪽이 더 많았어요." : "이번에는 판 쪽이 더 많았어요.") : asking ? "처음 약속대로 해도 되고, 다시 생각해서 바꿔도 돼요." : "동전 10개로 샀어요. 시간을 넘겨 봐요.",
      wait: !finished,
      tapSay: asking ? "목표에 닿았어요. 다시 확인할 때예요. 어떻게 할까요?" : finished ? "끝까지 왔어요. 세 가지를 비교해 봐요." : `동전 ${c1(mine)}개.`,
    };
  };
  const SELL = [
    () => ({
      title: "먼저 약속",
      body: pic(`<div class="bigpic">🪙10 → 🎯12</div><p class="center">동전 10개가 12개가 되면 어떻게 할까?</p>`),
      text: "파는 때를 알려 주는 정답은 없어요. 그래서 먼저 내 약속을 정해 봐요.",
      ask: { key: "rule", q: "12개가 되면?", opts: PICK, reply: (i) => `약속: <b>${PICK[i]}</b>. 맞고 틀린 답은 없어요.` },
    }),
    story("h2021", "TSLA", "🚗 전기차 회사 이야기", "t"),
    story("h2023", "NVDA", "🎮 그래픽 칩 회사 이야기", "n"),
    () => ({
      title: "기억해요",
      body: pic(`<div class="checks"><div>🏪 <b>산 이유</b>가 아직 맞아?</div><div>🏷️ <b>값표</b>가 너무 높아졌어?</div><div>🛒 곧 <b>쓸 돈</b>이야?</div><div>🧺 <b>한 곳</b>에 너무 많아?</div></div>`) + note(small),
      text: "늘 이기는 약속은 없어요. 목표에 닿으면 네 가지를 다시 확인해요. 목표에 못 닿아도, 산 이유가 틀렸다면 다시 정해요.",
    }),
  ];

  // ---------- ⑤ 긴 기다림: 한 해씩 ----------
  const years = (id, name, key, intro, outro) => (P) => {
    const L = long(id), n = P[key] ?? 0, y = n ? L.years[n - 1] : null, now = y ? y.end : 10;
    const finished = n === L.years.length;
    const face = !y ? "" : y.end < 8 ? "😟 많이 줄어 있어요" : y.end < 10 ? "🤔 처음보다 조금 적어요" : "😊 처음보다 많아요";
    return {
      title: name,
      body: pic(`${coins(now)}<p class="center">${y ? `<b>${n}년째</b> (${y.y}년 끝) · ${face}<br><small>그해 가장 적었을 때 ${c1(y.low)}개</small>` : `${L.from}년 첫 거래일에 10개로 시작`}</p>${graph([{ ys: L.ys.slice(0, n * 12 + 1), color: "#1f9e7f" }], { base: 10, len: L.ys.length, left: `${L.from}`, right: `${L.to}` })}${finished ? "" : tap("🗓️ 한 해 넘기기", key, n + 1, "wide")}`),
      text: finished ? outro : intro,
      wait: !finished,
      tapSay: y ? `${n}년째. 동전 ${c1(y.end)}개.${finished ? ` ${outro}` : ""}` : "",
    };
  };
  const WAIT = [
    years("spy2007", "🧺 큰 바구니 10년", "w7", "미국 큰 회사 바구니를 2007년에 샀어요. 한 해씩 넘겨 봐요.", `중간에 반 가까이 줄었지만, 10년 뒤에는 ${c1(long("spy2007").end)}개가 됐어요.`),
    years("spy2000", "🧺 같은 바구니, 다른 10년", "w0", "똑같은 바구니를 2000년에 샀다면 어땠을까요?", `이번에는 10년을 기다려도 ${c1(long("spy2000").end)}개예요. 처음보다 적어요.`),
    () => ({
      title: "가게 하나로 10년",
      body: pic(`<p class="center">2007년에 동전 10개씩, 10년 뒤에는</p><div class="two"><div><span>☂️</span><b>보험 회사 (AIG)</b><small>🪙 ${c1(long("aig2007").end)}개</small></div><div><span>🍎</span><b>애플</b><small>🪙 ${c1(long("aapl2007").end)}개</small></div></div>`) + note("결과를 알고 고른 두 회사예요. 2007년에는 어느 쪽이 될지 알 수 없었어요."),
      text: "어떤 가게는 오래 기다려도 돌아오지 못했고, 어떤 가게는 아주 크게 자랐어요.",
      ask: { key: "long", q: "오래 기다리면 늘 늘어날까?", opts: ["👍 늘 늘어나", "🙅 아닐 수도 있어", "🤷 모르겠어"], reply: () => "아닐 수도 있어요. 기다리기 전에, 무엇을 샀는지와 언제 쓸 돈인지를 먼저 봐요." },
    }),
    () => ({
      title: "기억해요",
      body: pic(`<div class="checks"><div>⏳ 곧 <b>쓸 돈</b>은 넣지 않기</div><div>🧺 <b>한 곳</b>에 몰지 않기</div><div>🔁 <b>산 이유</b>를 가끔 다시 보기</div></div>`) + note(small),
      text: "기다림은 도움이 될 수 있지만 약속은 아니에요.",
    }),
  ];

  // ③ 첫 화면: 한 번이라도 세 곳을 담아 봤으면 다시 빼도 '다음'을 열어 둠
  const basketPlay = BASKET[0];
  BASKET[0] = (P) => { if (STORES.filter((s) => P[`b_${s}`]).length >= 3) P.three = 1; return basketPlay(P); };

  return { lab1: GAP, lab2: CHEAP, lab3: BASKET, lab4: SELL, lab5: WAIT };
};
