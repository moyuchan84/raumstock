// 실전 훈련: 진실과 오해 · 차트 읽기 · 선택의 순간 (모두 실제 2020년 일별 수정 종가로 계산)
// 결과 숫자는 하드코딩하지 않고 daily.js에서 계산해 보여 줍니다. 수수료·세금은 계산에서 뺐어요(본문에 따로 설명).
window.RAUM_TRAIN = (() => {
  const D = window.RAUM_DAILY;
  const FIN = window.RAUM_FIN || {};
  const FX = D.usdKrw;
  const di = (d) => { const i = D.dates.findIndex((x) => x >= d); return i < 0 ? D.dates.length - 1 : i; };
  const px = (s, d) => D.prices[s][di(d)];
  const ret = (s, a, b) => px(s, b) / px(s, a) - 1;
  const fmt = (n, d = 0) => Number(n).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (x, d = 1) => (x > 0 ? "+" : "") + (x * 100).toFixed(d) + "%";
  const cls = (x) => (x > 1e-9 ? "up" : x < -1e-9 ? "down" : "flat");
  const won = (n) => (n < 0 ? "−" : "") + fmt(Math.abs(Math.round(n))) + "원";
  const md = (d) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
  const NAME = { AAPL: "애플", AMZN: "아마존", ZM: "줌", NFLX: "넷플릭스", AAL: "아메리칸항공", CCL: "카니발", XOM: "엑슨모빌", SPY: "S&P500 ETF" };
  const per = (s, d) => px(s, d) / FIN[s].eps;
  const sma = (s, n, i) => { if (i < n - 1) return null; let t = 0; for (let k = i - n + 1; k <= i; k++) t += D.prices[s][k]; return t / n; };
  // 정해 둔 날짜 이후 처음으로 조건을 만족한 날
  const firstAfter = (s, from, to, test) => { for (let i = di(from) + 1; i <= di(to); i++) if (test(D.prices[s][i], i)) return D.dates[i]; return null; };

  // ---------- 차트 ----------
  // opts: { from, to, cut(결정일), ma:[20,60], hlines:[{y,label,color}], marks:[{d,label}] }
  function chart(s, { from, to, cut, ma = [], hlines = [], marks = [], h = 190 }) {
    const a = di(from), b = di(to), c = cut ? di(cut) : b;
    const w = 360, pad = { l: 4, r: 50, t: 16, b: 18 };
    const vals = D.prices[s].slice(a, b + 1);
    const all = [...vals, ...hlines.map((x) => x.y)];
    const lo = Math.min(...all), hi = Math.max(...all), sp = hi - lo || 1;
    const y0 = lo - sp * 0.06, y1 = hi + sp * 0.06;
    const X = (i) => pad.l + ((i - a) / Math.max(b - a, 1)) * (w - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (h - pad.t - pad.b);
    const path = (i0, i1, f = (i) => D.prices[s][i]) => { const p = []; for (let i = i0; i <= i1; i++) { const v = f(i); if (v != null) p.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`); } return p.join(" "); };
    const maColors = { 20: "#ffc83d", 60: "#2fd3a5" };
    return `<svg viewBox="0 0 ${w} ${h}" class="tchart" role="img" aria-label="${NAME[s]} 차트">
      ${[lo, (lo + hi) / 2, hi].map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${w - pad.r + 5}" y="${Y(v) + 4}" class="tk">$${v.toFixed(v < 100 ? 2 : 0)}</text>`).join("")}
      ${hlines.map((l) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(l.y)}" y2="${Y(l.y)}" stroke="${l.color || "#ff5a5f"}" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${pad.l + 4}" y="${Y(l.y) - 4}" class="tk" style="fill:${l.color || "#ff5a5f"}">${l.label}</text>`).join("")}
      ${ma.map((n) => `<polyline points="${path(Math.max(a, n - 1), c, (i) => sma(s, n, i))}" fill="none" stroke="${maColors[n]}" stroke-width="1.4" opacity=".9"/>`).join("")}
      <polyline points="${path(a, c)}" fill="none" stroke="#e9eefb" stroke-width="2" stroke-linejoin="round"/>
      ${c < b ? `<polyline points="${path(c, b)}" fill="none" stroke="${D.prices[s][b] >= D.prices[s][c] ? "#ff5a5f" : "#4c8dff"}" stroke-width="2" stroke-linejoin="round"/>` : ""}
      ${cut ? `<line x1="${X(c)}" x2="${X(c)}" y1="${pad.t - 6}" y2="${h - pad.b}" stroke="#ffc83d" stroke-dasharray="3 3"/><circle cx="${X(c)}" cy="${Y(D.prices[s][c])}" r="4" fill="#ffc83d"/><text x="${X(c) + (X(c) > w / 2 ? -4 : 4)}" y="${pad.t - 4}" class="tk" style="fill:#ffc83d" text-anchor="${X(c) > w / 2 ? "end" : "start"}">${c < b ? "선택한 날" : "오늘"}</text>` : ""}
      ${marks.map((m) => { const i = di(m.d); return `<circle cx="${X(i)}" cy="${Y(D.prices[s][i])}" r="3.5" fill="none" stroke="#2fd3a5" stroke-width="1.5"/><text x="${X(i)}" y="${Y(D.prices[s][i]) + 15}" class="tk" text-anchor="middle" style="fill:#2fd3a5">${m.label}</text>`; }).join("")}
      <text x="${pad.l}" y="${h - 4}" class="tk">${md(D.dates[a])}</text><text x="${w - pad.r}" y="${h - 4}" class="tk" text-anchor="end">${md(D.dates[b])}</text>
    </svg>${ma.length ? `<p class="legend">${ma.map((n) => `<span><i style="background:${maColors[n]}"></i>${n}일 이동평균선</span>`).join("")}</p>` : ""}`;
  }

  // ---------- 1. 진실과 오해 ----------
  const lossNeed = [0.1, 0.2, 0.3, 0.5, 0.8].map((l) => `<tr><td>−${l * 100}%</td><td class="up">+${fmt((1 / (1 - l) - 1) * 100)}%</td></tr>`).join("");
  const myths = [
    {
      id: "m1", myth: "주식은 누가 따면 누가 잃는 제로섬 게임이다",
      truth: () => `<p><b>반은 맞고 반은 틀려요.</b> 회사가 돈을 벌고 커지면 그 가치가 새로 생겨서 <b>주주 모두</b>가 함께 부자가 될 수 있어요. S&P500 ETF를 2020년 1월 2일에 사서 연말까지 들고 있던 사람은 모두 <b class="up">${pct(ret("SPY", "2020-01-02", "2020-12-31"))}</b>를 얻었어요. 누군가 잃어서 생긴 돈이 아니에요.</p>
        <p>하지만 <b>짧게 자주 사고파는 것</b>은 제로섬에 가까워요. 내가 싸게 산 만큼 누군가는 싸게 판 거니까요. 게다가 거래할 때마다 수수료가 나가서 <b>마이너스섬</b>이 돼요. 이 게임 수수료(0.25%)로 사고팔기를 100번 하면 수수료만 원금의 약 ${fmt((1 - (1 - 0.0025) ** 200) * 100)}%가 사라져요.</p>`,
      kid: "피자 가게가 장사를 잘해서 가게가 커지면 조각 주인 모두가 부자가 돼요. 그런데 조각을 서로 자꾸 바꾸기만 하면, 누가 이득을 보면 누군가는 손해를 보고 심부름값(수수료)까지 나가요.",
    },
    {
      id: "m2", myth: "회사가 잘되면 주가는 무조건 오른다",
      truth: () => `<p><b>길게 보면 맞지만, 짧게 보면 아닐 때가 많아요.</b> 줌의 매출은 1년 만에 ${fmt(FIN.ZM.prev.rev * 10, 1)}억 달러에서 ${fmt(FIN.ZM.now.rev * 10, 1)}억 달러로 <b>4배</b>가 넘게 늘었어요. 그런데 주가는 10월 19일 고점에서 연말까지 <b class="down">${pct(ret("ZM", "2020-10-19", "2020-12-31"))}</b> 떨어졌어요.</p>
        <p>주가에는 이미 <b>앞으로의 기대</b>가 들어 있어요. 사람들이 '더 엄청나게 잘될 거야'라고 기대했는데 백신 소식에 '집콕이 끝나면 덜 쓰겠지'로 바뀌자 떨어진 거예요. 좋은 회사와 좋은 가격은 달라요.</p>`,
      chart: () => chart("ZM", { from: "2020-01-02", to: "2020-12-31", marks: [{ d: "2020-10-19", label: "고점" }] }),
      kid: "반에서 100점 맞을 거라고 모두 기대하던 친구가 95점을 받으면 '잘했다'보다 '어? 아쉽다'가 먼저 나와요. 주가도 기대보다 못하면 떨어져요.",
    },
    {
      id: "m3", myth: "PER이 낮으면 싸니까 좋은 주식이다",
      truth: () => `<p>2020년 1월 2일 PER은 아메리칸항공 <b>${per("AAL", "2020-01-02").toFixed(1)}배</b>, 애플 <b>${per("AAPL", "2020-01-02").toFixed(1)}배</b>, 줌 <b>${fmt(per("ZM", "2020-01-02"))}배</b>였어요. 숫자만 보면 아메리칸항공이 제일 '싸' 보여요.</p>
        <p>연말까지 결과는 아메리칸항공 <b class="down">${pct(ret("AAL", "2020-01-02", "2020-12-31"))}</b>, 애플 <b class="up">${pct(ret("AAPL", "2020-01-02", "2020-12-31"))}</b>, 줌 <b class="up">${pct(ret("ZM", "2020-01-02", "2020-12-31"))}</b>.</p>
        <p>PER이 낮은 데는 <b>이유</b>가 있는 경우가 많아요(빚이 많다, 성장이 느리다, 위기에 약하다). 그리고 업종마다 보통 PER이 달라서 항공사와 기술 회사를 같은 잣대로 비교하면 안 돼요. 같은 업종 안에서, 성장률·빚과 함께 봐야 해요. 이번엔 높은 PER이 이겼지만, 높은 PER은 기대가 꺾이면 크게 떨어지기도 해요(줌의 10월 이후처럼).</p>`,
      kid: "똑같이 1만 원 버는 가게라도, 손님이 늘어나는 가게와 빚이 많아 곧 문 닫을지 모르는 가게는 값이 달라야 해요. 싼 데는 이유가 있을 수 있어요.",
    },
    {
      id: "m4", myth: "좋은 뉴스를 보고 사면 돈을 번다",
      truth: () => `<p>11월 9일 '백신 효과 90%' 뉴스가 나온 날, 카니발은 <b>하루 만에</b> <b class="up">${pct(ret("CCL", "2020-11-06", "2020-11-09"))}</b> 올랐어요. 그 뉴스를 보고 그날 종가에 샀다면 다음 날 <b class="down">${pct(ret("CCL", "2020-11-09", "2020-11-10"))}</b>였어요.</p>
        <p>모두가 아는 뉴스는 <b>몇 분, 몇 시간 안에 가격에 반영</b>돼요. 뉴스를 보고 움직이면 대부분 이미 늦어요. '소문에 사고 뉴스에 팔아라'라는 말이 생긴 이유예요. 그렇다고 소문을 믿으라는 뜻은 아니에요. 중요한 건 <b>다른 사람들이 아직 모르는 것</b>이 아니라, 뉴스가 회사의 <b>몇 년 치 이익</b>을 얼마나 바꾸는지 따져 보는 거예요.</p>`,
      chart: () => chart("CCL", { from: "2020-10-01", to: "2020-12-31", marks: [{ d: "2020-11-09", label: "백신 뉴스" }] }),
      kid: "운동회 달리기에서 출발 소리를 듣고 나서야 뛰기 시작하면 이미 늦어요. 뉴스를 보고 사는 건, 다른 사람들이 다 출발한 뒤에 뛰는 것과 비슷해요.",
    },
    {
      id: "m5", myth: "많이 떨어졌으니 이제 오를 차례다",
      truth: () => `<p>떨어진 만큼 다시 오르려면 <b>더 많이</b> 올라야 해요.</p>
        <table class="ttable"><thead><tr><th>손실</th><th>원금 회복에 필요한 상승</th></tr></thead><tbody>${lossNeed}</tbody></table>
        <p>아메리칸항공은 2월 14일부터 3월 9일까지 <b class="down">${pct(ret("AAL", "2020-02-14", "2020-03-09"))}</b> 떨어졌는데, 거기서 끝이 아니라 3월 23일까지 <b class="down">${pct(ret("AAL", "2020-03-09", "2020-03-23"))}</b> 더 떨어졌어요. '많이 떨어졌다'는 '싸다'가 아니에요. <b>왜 떨어졌는지</b>, 그 이유가 아직 남아 있는지가 중요해요.</p>`,
      kid: "1만 원이 반으로 줄면 5천 원이에요. 5천 원이 다시 1만 원이 되려면 두 배(+100%)가 돼야 해요. 내려가기는 쉽고 올라오기는 어려워요.",
    },
    {
      id: "m6", myth: "오래 들고 있으면 언젠가는 다 오른다",
      truth: () => `<p><b>시장 전체</b>는 오랜 시간 동안 대체로 올라왔지만, <b>한 회사</b>는 다를 수 있어요. 2020년 1월 2일에 사서 연말까지 들고 있었다면 아메리칸항공 <b class="down">${pct(ret("AAL", "2020-01-02", "2020-12-31"))}</b>, 엑슨모빌 <b class="down">${pct(ret("XOM", "2020-01-02", "2020-12-31"))}</b>, S&P500 ETF <b class="up">${pct(ret("SPY", "2020-01-02", "2020-12-31"))}</b>.</p>
        <p>회사는 망하거나 영영 예전 같지 않을 수 있어요. 오래 들고 갈 거라면 <b>여러 회사에 나눠 담은 ETF</b>나, 오래 살아남을 이유가 분명한 회사여야 해요. '버티기'는 이유가 있을 때만 전략이에요.</p>`,
      kid: "동네 가게 하나는 문을 닫을 수 있지만, 동네 가게 500곳이 한꺼번에 다 닫기는 어려워요. 오래 들고 있으려면 여러 곳에 나눠 담는 게 안전해요.",
    },
    {
      id: "m7", myth: "차트 모양을 보면 내일 주가를 맞힐 수 있다",
      truth: () => `<p>차트는 사람들이 <b>지금까지</b> 얼마에 사고팔았는지 보여 주는 기록이에요. 지지선·저항선·이동평균선 같은 도구는 '이 근처에서 사람들이 어떻게 행동했나'를 보는 데 쓸모가 있지만, <b>미래를 정해 주지 않아요.</b></p>
        <p>그래서 차트는 '맞히기'보다 <b>계획 세우기</b>에 써요. 어디서 살지, 틀렸다면 어디서 인정하고 나올지(손절), 어디서 일부를 팔지(목표)를 미리 정하는 거예요. 실제로는 거래량도 함께 보지만 이 게임 데이터에는 거래량이 없어요.</p>`,
      kid: "발자국을 보면 사람들이 어디로 많이 걸어갔는지 알 수 있지만, 내일 누가 어디로 갈지는 몰라요. 차트는 발자국 지도예요.",
    },
  ];

  // ---------- 2. 차트 읽기 ----------
  const supSPY = Math.min(...D.prices.SPY.slice(di("2019-12-02"), di("2020-02-21") + 1));
  const peakAAPL = px("AAPL", "2020-09-01");
  const charts = [
    {
      id: "k1", title: "추세: 고점과 저점이 함께 높아지면 상승 추세",
      body: () => `<p>애플은 3월 23일 바닥 이후 <b>고점도 저점도 계속 높아졌어요.</b> 이걸 상승 추세라고 해요. 노란 선은 최근 20일 평균 가격(20일 이동평균선), 초록 선은 60일 평균이에요. 가격이 평균선들 위에 있고 평균선이 위를 향하면 상승 추세가 이어지는 중이라고 봐요.</p>`,
      chart: () => chart("AAPL", { from: "2020-03-02", to: "2020-08-31", ma: [20, 60] }),
      kid: "계단을 올라갈 때 발이 한 칸씩 높아지죠? 쉬었다 가도 쉬는 자리가 점점 높아지면 계속 올라가는 중이에요.",
    },
    {
      id: "k2", title: "지지와 저항: 사람들이 기억하는 가격",
      body: () => `<p>점선은 12월~2월 중순 사이 S&P500 ETF의 가장 낮은 종가(<b>$${supSPY.toFixed(2)}</b>)예요. 이 근처에서는 '이 정도면 싸다'며 사는 사람이 많아 가격이 받쳐졌어요. 이런 가격을 <b>지지선</b>이라고 해요. 반대로 위에서 자꾸 막히는 가격은 <b>저항선</b>이에요.</p>
        <p>2월 24일 가격이 지지선 아래로 내려가자(<b>지지선 이탈</b>) '받쳐 줄 줄 알았는데'라는 실망 매도가 겹치며 하락이 빨라졌어요. 한 번 깨진 지지선은 나중에 거꾸로 저항선이 되기도 해요.</p>`,
      chart: () => chart("SPY", { from: "2019-12-02", to: "2020-03-31", hlines: [{ y: supSPY, label: "지지선", color: "#2fd3a5" }], marks: [{ d: "2020-02-24", label: "이탈" }] }),
      kid: "트램펄린 바닥에서 공이 자꾸 튀어 오르다가, 바닥이 찢어지면 공이 쑥 떨어지는 것과 비슷해요.",
    },
    {
      id: "k3", title: "눌림목과 돌파: 언제 사면 좋을까?",
      body: () => `<p><b>눌림목</b>은 상승 추세 중에 잠깐 쉬며 내려오는 구간이에요. 애플은 9월 1일 고점($${peakAAPL.toFixed(2)})에서 9월 중순까지 약 20% 눌렸다가 다시 올라갔어요. 추세가 살아 있다면 눌림목은 '더 싸게 탈 기회'가 되지만, 추세가 끝나는 시작일 수도 있어요.</p>
        <p><b>돌파</b>는 저항선(예전 고점)을 넘어서는 순간이에요. 돌파에 사면 더 비싸게 사는 대신 '추세가 이어진다'는 확인을 받고 사는 거예요.</p>
        <p>어느 쪽이든 정답은 없어서 <b>나눠 사기</b>가 많이 쓰여요. 그리고 사기 전에 '여기 아래로 내려가면 내 판단이 틀린 것'인 가격(예: 직전 저점, 60일선)을 정해 둬요.</p>`,
      chart: () => chart("AAPL", { from: "2020-06-01", to: "2020-12-31", ma: [20, 60], hlines: [{ y: peakAAPL, label: "9/1 고점 (저항)", color: "#ff5a5f" }] }),
      kid: "공을 높이 던지려면 팔을 뒤로 한 번 당겨야 하죠? 오르던 주식이 잠깐 내려오는 게 눌림목이에요. 하지만 그게 당기는 건지 떨어지는 건지는 나중에야 알 수 있어요.",
    },
  ];

  // ---------- 3. 선택의 순간 ----------
  // 각 선택지 sim(h): h(평가일)까지의 수익률. 원금 100만 원 기준으로도 보여 줌.
  const split = (s, buys, end) => buys.reduce((t, d) => t + px(s, end) / px(s, d), 0) / buys.length - 1;
  const SC = [
    {
      id: "s1", tag: "뉴스", sym: "CCL", title: "백신 뉴스로 하루 39% 오른 크루즈 회사", decide: "2020-11-09", from: "2020-09-01", horizons: ["2020-11-10", "2020-11-30", "2020-12-31"],
      setup: () => `<p>11월 9일, 화이자가 '백신 효과 90%'를 발표했어요. 카니발은 오늘 하루 <b class="up">${pct(ret("CCL", "2020-11-06", "2020-11-09"))}</b> 올랐어요. 크루즈 여행이 곧 다시 시작될 거라는 기대 때문이에요. 지금(종가 $${px("CCL", "2020-11-09").toFixed(2)}) 어떻게 할까요?</p>`,
      choices: [
        { label: "지금 바로 산다 (놓치기 싫어!)", sim: (h) => ret("CCL", "2020-11-09", h) },
        { label: "흥분이 가라앉는 다음 날 산다", sim: (h) => (h <= "2020-11-10" ? 0 : ret("CCL", "2020-11-10", h)) },
        { label: "안 산다 (이미 오른 뉴스)", sim: () => 0 },
      ],
      lesson: () => `<p>뉴스 당일 산 사람은 다음 날 바로 <b class="down">${pct(ret("CCL", "2020-11-09", "2020-11-10"))}</b>를 겪었어요. 하루 기다린 사람은 더 싸게 샀고요. 연말까지 보면 둘 다 이익이었지만, 그 사이 출렁임을 버틸 수 있어야 했어요.</p>
        <p><b>배울 점:</b> 큰 뉴스로 급등한 날 사는 건 '감정'으로 사기 쉬워요. 산다면 ① 왜 사는지(뉴스가 몇 년 치 이익을 바꾸는가) ② 틀리면 어디서 나올지를 정하고, ③ 한 번에 말고 나눠서 사는 게 좋아요. 카니발은 매출이 1년 사이 ${fmt(FIN.CCL.prev.rev * 10)}억 달러 → ${fmt(FIN.CCL.now.rev * 10)}억 달러로 줄고 큰 손실을 내던 중이었다는 것도 함께 봐야 해요.</p>`,
      kid: "모두가 달려가는 놀이기구 줄에 뒤늦게 서면, 제일 비싼 순간에 타게 될 수 있어요. 한 번 숨을 고르고 '왜 타고 싶은지' 생각해 봐요.",
    },
    {
      id: "s2", tag: "PER", sym: "AAL", title: "PER 7배짜리 '싼' 항공사 vs 비싼 기술주", decide: "2020-01-02", from: "2019-07-01", horizons: ["2020-03-23", "2020-06-30", "2020-12-31"],
      setup: () => `<p>2020년 1월 2일. 세 회사 중 하나에 100만 원을 넣으려고 해요.</p>
        <ul><li>아메리칸항공: PER <b>${per("AAL", "2020-01-02").toFixed(1)}배</b>, 부채가 자산보다 많음(자본잠식)</li><li>애플: PER <b>${per("AAPL", "2020-01-02").toFixed(1)}배</b>, 이익률 약 25%, 빚보다 자산이 훨씬 많음</li><li>줌: PER <b>${fmt(per("ZM", "2020-01-02"))}배</b>, 매출이 1년에 거의 2배씩 성장</li></ul>`,
      choices: [
        { label: "아메리칸항공 (PER이 제일 낮아 싸다)", sim: (h) => ret("AAL", "2020-01-02", h) },
        { label: "애플 (튼튼하고 적당한 가격)", sim: (h) => ret("AAPL", "2020-01-02", h) },
        { label: "줌 (비싸지만 빠르게 성장)", sim: (h) => ret("ZM", "2020-01-02", h) },
        { label: "셋에 똑같이 나눠 담기", sim: (h) => (ret("AAL", "2020-01-02", h) + ret("AAPL", "2020-01-02", h) + ret("ZM", "2020-01-02", h)) / 3 },
      ],
      lesson: () => `<p>낮은 PER은 '싸다'는 뜻일 수도 있지만 '위험하다'는 신호일 수도 있어요. 아메리칸항공은 빚이 많아 위기가 오자 가장 크게 무너졌어요. 줌은 운 좋게 시대가 바뀌며 폭등했지만, 이건 코로나라는 예상 못 한 사건 덕분이기도 해요. <b>결과가 좋았다고 그 선택이 늘 옳았던 건 아니에요.</b></p>
        <p><b>배울 점:</b> PER은 업종이 같은 회사끼리, 성장률·빚과 함께 비교해요. 확신이 없으면 나눠 담는 게 가장 큰 실수를 막아 줘요.</p>`,
      kid: "가격표만 보고 제일 싼 우산을 샀는데 금방 찢어지면 오히려 손해예요. 싼 이유를 먼저 살펴봐요.",
    },
    {
      id: "s3", tag: "손절", sym: "AAL", title: "반 토막 난 항공주, 손절할까?", decide: "2020-03-09", from: "2020-01-02", horizons: ["2020-03-23", "2020-06-08", "2020-12-31"],
      setup: () => `<p>2월 14일에 아메리칸항공을 $${px("AAL", "2020-02-14").toFixed(2)}에 샀어요. 오늘(3월 9일)은 $${px("AAL", "2020-03-09").toFixed(2)}, <b class="down">${pct(ret("AAL", "2020-02-14", "2020-03-09"))}</b>예요. 여행 금지가 늘고 비행기가 텅 비어 가요. 이 회사는 원래 빚이 많았어요. 어떻게 할까요?</p>`,
      base: { buy: "2020-02-14" },
      choices: [
        { label: "손절한다 (지금 팔고 손실 확정)", sim: () => ret("AAL", "2020-02-14", "2020-03-09") },
        { label: "버틴다 (언젠가 회복하겠지)", sim: (h) => ret("AAL", "2020-02-14", h) },
        { label: "물타기 (같은 금액 더 사서 평균 단가 낮추기)", cap: 2, sim: (h) => { const q1 = 1 / px("AAL", "2020-02-14"), q2 = 1 / px("AAL", "2020-03-09"); return ((q1 + q2) * px("AAL", h)) / 2 - 1; } },
        { label: "손절하고 그 돈을 S&P500 ETF로 옮긴다", sim: (h) => (1 + ret("AAL", "2020-02-14", "2020-03-09")) * (1 + ret("SPY", "2020-03-09", h)) - 1 },
      ],
      lesson: () => `<p>이 회사를 산 이유('사람들이 비행기를 많이 탄다')가 사라졌고, 빚 때문에 위기를 버틸 힘도 약했어요. 이럴 때 손실은 <b>더 커지기 쉬워요.</b> 3월 23일까지 <b class="down">${pct(ret("AAL", "2020-03-09", "2020-03-23"))}</b> 더 떨어졌어요. 6월 8일에 반짝 반등했지만 연말엔 다시 내려왔어요.</p>
        <p><b>손절해야 할 때:</b> ① 산 이유가 사라졌을 때 ② 미리 정한 손실 한도(예: −10%)에 닿았을 때 ③ 그 돈을 더 좋은 곳에 써야 할 때(기회비용). '언젠가 오르겠지'는 이유가 아니에요.</p>
        <p><b>그런데 연말 결과표를 보면</b> 물타기가 가장 덜 잃었어요(${pct(SC_S3_WATER("2020-12-31"))}). 3월 바닥 근처에서 더 샀기 때문이에요. 하지만 그 대가로 돈을 <b>두 배</b> 걸었고, 3월 23일에는 200만 원이 ${pct(SC_S3_WATER("2020-03-23"))}였어요. 바닥을 운 좋게 맞힌 결과지, 늘 그렇게 되지는 않아요. 회사가 버티지 못했다면 두 배로 잃었을 거예요.</p>
        <p><b>물타기</b>는 산 이유가 그대로인데 가격만 내려갔을 때 쓰는 방법이에요. 이유가 깨진 주식에 물을 타는 건 위험이 커지는 쪽에 돈을 더 거는 셈이에요. 손절은 '틀렸을 때 피해를 정해진 만큼으로 막는 것'이지 늘 돈을 더 버는 방법은 아니에요.</p>`,
      kid: "장사가 안 되는 메뉴를 '언젠가 팔리겠지' 하며 재료를 계속 사면 가게 돈이 바닥나요. 안 팔리는 이유가 분명하면 메뉴를 빨리 바꾸는 게 가게를 지키는 길이에요.",
    },
    {
      id: "s4", tag: "목표 수익", sym: "ZM", title: "3배가 된 줌, 언제 팔까?", decide: "2020-06-01", from: "2020-01-02", horizons: ["2020-09-01", "2020-10-19", "2020-12-31"],
      setup: () => `<p>1월 2일에 줌을 $${px("ZM", "2020-01-02").toFixed(2)}에 샀어요. 오늘(6월 1일)은 $${px("ZM", "2020-06-01").toFixed(2)}, <b class="up">${pct(ret("ZM", "2020-01-02", "2020-06-01"))}</b>예요. 처음에 '+100%면 판다'고 정했었는데 이미 넘었어요.</p>`,
      choices: [
        { label: "전부 판다 (목표 달성, 이익 확정)", sim: () => ret("ZM", "2020-01-02", "2020-06-01") },
        { label: "절반만 판다 (분할 매도)", sim: (h) => (ret("ZM", "2020-01-02", "2020-06-01") + ret("ZM", "2020-01-02", h)) / 2 },
        { label: "계속 들고 간다", sim: (h) => ret("ZM", "2020-01-02", h) },
        { label: "들고 가되, 고점에서 20% 떨어지면 판다 (추적 손절)", sim: (h) => { const sell = trailing("ZM", "2020-06-01", h, 0.2); return ret("ZM", "2020-01-02", sell || h); } },
      ],
      lesson: () => { const ts = trailing("ZM", "2020-06-01", "2020-12-31", 0.2); return `<p>계속 들고 간 사람은 10월에 엄청난 이익을 봤지만, 연말까지 고점 대비 <b class="down">${pct(ret("ZM", "2020-10-19", "2020-12-31"))}</b>를 돌려줬어요. '고점에서 20% 떨어지면 판다'는 규칙은 ${ts ? `<b>${md(ts)}</b>에 팔게 했어요` : "연말까지 작동하지 않았어요"}. 오를 땐 따라가고, 꺾이면 이익을 지키는 방법이에요.</p>
        <p><b>배울 점:</b> 목표 수익률에 닿으면 <b>전부 아니면 전무</b> 대신 <b>나눠서 파는 것(분할 매도)</b>이 마음도 편하고 실수도 줄여요. '이익은 길게'는 오르는 주식을 너무 일찍 다 팔지 말라는 뜻이고, 그 대신 꺾일 때를 대비한 규칙을 함께 정해 둬요.</p>`; },
      kid: "잘 팔리는 메뉴는 계속 팔되, 손님이 확 줄기 시작하면 재료를 줄이는 것처럼요. 일부는 미리 챙겨 두고, 나머지는 '이만큼 떨어지면 정리' 규칙을 정해요.",
    },
    {
      id: "s5", tag: "눌림목", sym: "AAPL", title: "고점에서 20% 눌린 애플", decide: "2020-09-18", from: "2020-04-01", horizons: ["2020-10-12", "2020-11-30", "2020-12-31"],
      setup: () => `<p>애플은 3월 바닥부터 크게 올라 9월 1일 $${peakAAPL.toFixed(2)}를 찍었어요. 그 뒤 기술주가 한꺼번에 떨어져 오늘(9월 18일)은 $${px("AAPL", "2020-09-18").toFixed(2)}, 고점보다 <b class="down">${pct(ret("AAPL", "2020-09-01", "2020-09-18"))}</b>예요. 상승 추세 속 눌림목일까요, 하락의 시작일까요?</p>`,
      choices: [
        { label: "지금 산다 (눌림목 매수)", sim: (h) => ret("AAPL", "2020-09-18", h) },
        { label: "예전 고점을 넘을 때 산다 (돌파 매수)", sim: (h) => { const b = firstAfter("AAPL", "2020-09-18", "2020-12-31", (p) => p > peakAAPL); return b && b <= h ? ret("AAPL", b, h) : 0; } },
        { label: "3번 나눠 산다 (오늘, 1주 뒤, 2주 뒤)", sim: (h) => split("AAPL", ["2020-09-18", "2020-09-25", "2020-10-02"].filter((d) => d <= h), h) },
        { label: "안 산다", sim: () => 0 },
      ],
      lesson: () => { const b = firstAfter("AAPL", "2020-09-18", "2020-12-31", (p) => p > peakAAPL); return `<p>이번엔 눌림목이 기회가 됐어요. 돌파를 기다린 사람은 ${b ? `<b>${md(b)}</b>에야 샀어요` : "연말까지 고점을 넘지 못해 사지 못했어요"}. 나눠 산 사람은 그 중간이에요.</p>
        <p><b>배울 점:</b> 눌림목 매수는 싸게 사는 대신 '추세가 끝난 거면 어쩌지'라는 위험을, 돌파 매수는 확인을 받는 대신 비싸게 사는 위험을 져요. 어느 쪽이든 <b>틀렸을 때 나올 가격</b>(예: 직전 저점이나 60일선 아래)을 먼저 정해요.</p>`; },
      kid: "미끄럼틀을 올라가다 중간 계단에서 쉬는 친구를 보고 '다시 올라갈 거야'라고 생각할 수도, '내려가려나?' 할 수도 있어요. 그래서 조금씩 나눠서 따라가요.",
    },
    {
      id: "s6", tag: "분할 매수", sym: "SPY", title: "지지선이 깨졌다! S&P500을 언제 살까?", decide: "2020-02-24", from: "2019-12-02", horizons: ["2020-03-23", "2020-06-08", "2020-12-31"],
      setup: () => `<p>2월 24일, S&P500 ETF가 두 달 넘게 버티던 지지선($${supSPY.toFixed(2)}) 아래로 내려갔어요. 바이러스가 유럽·한국으로 퍼진다는 뉴스가 나왔어요. 들고 있는 현금 100만 원으로 미국 대표 500개 회사를 사고 싶어요.</p>`,
      choices: [
        { label: "오늘 한 번에 전부 산다", sim: (h) => ret("SPY", "2020-02-24", h) },
        { label: "3번 나눠 산다 (2/24, 3/9, 3/23)", sim: (h) => split("SPY", ["2020-02-24", "2020-03-09", "2020-03-23"].filter((d) => d <= h), h) },
        { label: "바닥을 확인하고 산다 (60일선 위로 올라오면)", sim: (h) => { const b = firstAfter("SPY", "2020-03-23", "2020-12-31", (p, i) => p > sma("SPY", 60, i)); return b && b <= h ? ret("SPY", b, h) : 0; } },
        { label: "무서우니 현금으로 계속 기다린다", sim: () => 0 },
      ],
      lesson: () => { const b = firstAfter("SPY", "2020-03-23", "2020-12-31", (p, i) => p > sma("SPY", 60, i)); return `<p>한 번에 산 사람은 3월 23일까지 <b class="down">${pct(ret("SPY", "2020-02-24", "2020-03-23"))}</b>를 견뎌야 했어요. 나눠 산 사람은 평균 가격이 낮아져 덜 아팠고 회복도 빨랐어요. 바닥을 확인하고 산 사람은 ${b ? `<b>${md(b)}</b>에 샀어요` : "사지 못했어요"}. 바닥 근처는 놓쳤지만 큰 하락은 피했어요.</p>
        <p><b>배울 점:</b> 바닥은 아무도 맞힐 수 없어요. <b>분할 매수</b>는 '얼마나 더 떨어질지 모른다'는 사실을 인정하는 방법이에요. 시장 전체(ETF)는 개별 회사보다 망할 위험이 훨씬 작아서 나눠 사기에 더 알맞아요. 반대로 이유가 깨진 개별 주식에 나눠 사는 건 물타기가 될 수 있어요(손절 훈련 참고).</p>`; },
      kid: "케이크를 한 번에 다 먹으면 배탈이 날 수 있지만, 세 번에 나눠 먹으면 괜찮아요. 언제가 제일 맛있을지 모를 때는 나눠서 먹어요.",
    },
    {
      id: "s7", tag: "이익은 길게", sym: "AAPL", title: "오른 주식과 내린 주식, 무엇을 팔까?", decide: "2020-06-08", from: "2020-01-02", horizons: ["2020-08-31", "2020-10-30", "2020-12-31"],
      setup: () => `<p>1월 2일에 애플과 아메리칸항공을 50만 원씩 샀어요. 오늘(6월 8일) 애플은 <b class="${cls(ret("AAPL", "2020-01-02", "2020-06-08"))}">${pct(ret("AAPL", "2020-01-02", "2020-06-08"))}</b>, 아메리칸항공은 <b class="${cls(ret("AAL", "2020-01-02", "2020-06-08"))}">${pct(ret("AAL", "2020-01-02", "2020-06-08"))}</b>예요(항공은 오늘 반짝 크게 올랐어요). 돈이 필요해서 하나를 팔아야 해요.</p>`,
      choices: [
        { label: "오른 애플을 판다 (이익 확정이 기분 좋아)", sim: (h) => ((1 + ret("AAPL", "2020-01-02", "2020-06-08")) + (1 + ret("AAL", "2020-01-02", h))) / 2 - 1 },
        { label: "내린 항공을 판다 (손실은 짧게)", sim: (h) => ((1 + ret("AAL", "2020-01-02", "2020-06-08")) + (1 + ret("AAPL", "2020-01-02", h))) / 2 - 1 },
        { label: "고르기 어려우니 둘 다 절반씩 판다", sim: (h) => ((1 + ret("AAPL", "2020-01-02", "2020-06-08")) * 0.5 + (1 + ret("AAPL", "2020-01-02", h)) * 0.5 + (1 + ret("AAL", "2020-01-02", "2020-06-08")) * 0.5 + (1 + ret("AAL", "2020-01-02", h)) * 0.5) / 2 - 1 },
      ],
      lesson: () => `<p>사람들은 이익 난 주식은 빨리 팔고(기분 좋으니까), 손실 난 주식은 오래 들고 있는(손실을 인정하기 싫으니까) 경향이 있어요. 이걸 <b>처분 효과</b>라고 해요. 이번에도 오른 애플을 판 사람은 그 뒤 애플의 상승(${pct(ret("AAPL", "2020-06-08", "2020-12-31"))})을 놓치고, 항공의 하락(${pct(ret("AAL", "2020-06-08", "2020-12-31"))})을 계속 떠안았어요.</p>
        <p><b>배울 점:</b> '이익은 길게, 손실은 짧게'. 무엇을 팔지는 지금까지 벌었는지 잃었는지가 아니라 <b>앞으로 어느 쪽이 더 좋을 이유가 있나</b>로 정해요. 물론 오른 주식이 계속 오른다는 보장도 없어서, 앞에서 배운 목표·추적 손절 규칙을 함께 써요.</p>`,
      kid: "가게에서 잘 팔리는 메뉴는 늘리고, 안 팔리는 메뉴는 정리해요. 반대로 잘 팔리는 메뉴를 빼고 안 팔리는 메뉴만 남기면 가게가 어려워져요.",
    },
  ];
  function SC_S3_WATER(h) { const q1 = 1 / px("AAL", "2020-02-14"), q2 = 1 / px("AAL", "2020-03-09"); return ((q1 + q2) * px("AAL", h)) / 2 - 1; }
  // 고점 대비 drop만큼 떨어진 첫날 (없으면 null)
  function trailing(s, from, to, drop) {
    let peak = px(s, from);
    for (let i = di(from) + 1; i <= di(to); i++) {
      const p = D.prices[s][i];
      peak = Math.max(peak, p);
      if (p <= peak * (1 - drop)) return D.dates[i];
    }
    return null;
  }

  // ---------- 화면 ----------
  let sub = "list";
  const kidBox = (S, t) => (S.kid && t ? `<div class="kidbox"><b>🧒 쉽게 말하면</b><p>${t}</p></div>` : "");
  const tagCls = { 뉴스: "t-news", PER: "t-per", 손절: "t-cut", "목표 수익": "t-goal", 눌림목: "t-pull", "분할 매수": "t-split", "이익은 길게": "t-long" };

  function view(S) {
    S.trainDone ||= {};
    S.trainPick ||= {};
    const [kind, id] = sub.split(":");
    if (kind === "myth") {
      const m = myths.find((x) => x.id === id);
      S.trainDone[id] = true;
      return `${back()}<article class="tcard"><p class="eyebrow">진실과 오해</p><h2><s>${m.myth}</s></h2>${m.chart ? m.chart() : ""}${m.truth()}${kidBox(S, m.kid)}</article>${nextBtn("myth", id)}`;
    }
    if (kind === "chart") {
      const c = charts.find((x) => x.id === id);
      S.trainDone[id] = true;
      return `${back()}<article class="tcard"><p class="eyebrow">차트 읽기</p><h2>${c.title}</h2>${c.chart()}${c.body()}${kidBox(S, c.kid)}</article>${nextBtn("chart", id)}`;
    }
    if (kind === "sc") return scenario(S, SC.find((x) => x.id === id));
    const done = (x) => (S.trainDone[x.id] ? `<span class="tdone">✓</span>` : "");
    return `<section class="hero thero"><p class="eyebrow">TRAINING</p><h1>실전 훈련</h1><p class="muted">흔한 오해를 실제 숫자로 확인하고, 2020년의 진짜 상황에서 직접 골라 보세요. 고른 뒤에는 모든 선택지의 실제 결과를 보여 줘요.</p></section>
      <h2 class="sec">진실과 오해 <small>${myths.filter((m) => S.trainDone[m.id]).length}/${myths.length}</small></h2>
      <ul class="tlist">${myths.map((m) => `<li><button data-train="myth:${m.id}"><span class="tq">오해</span><b>${m.myth}</b>${done(m)}</button></li>`).join("")}</ul>
      <h2 class="sec">차트 읽기 <small>${charts.filter((c) => S.trainDone[c.id]).length}/${charts.length}</small></h2>
      <ul class="tlist">${charts.map((c) => `<li><button data-train="chart:${c.id}"><span class="tq ch">차트</span><b>${c.title}</b>${done(c)}</button></li>`).join("")}</ul>
      <h2 class="sec">선택의 순간 <small>${SC.filter((c) => S.trainDone[c.id]).length}/${SC.length}</small></h2>
      <ul class="tlist">${SC.map((c) => `<li><button data-train="sc:${c.id}"><span class="tq ${tagCls[c.tag] || ""}">${c.tag}</span><b>${c.title}</b><small>${c.decide.slice(5).replace("-", "/")} · ${NAME[c.sym]}</small>${done(c)}</button></li>`).join("")}</ul>
      <section class="tcard rules"><h2>사기 전에 정하는 세 가지</h2><ol><li><b>왜 사는가</b> — 이 이유가 사라지면 판다.</li><li><b>어디서 일부를 팔까</b> — 목표 수익률(예: +30%에 절반), 나머지는 고점 대비 하락 규칙으로.</li><li><b>어디서 틀렸다고 인정할까</b> — 손절 가격(예: −10% 또는 직전 저점 아래).</li></ol>${kidBox(S, "놀이공원에 가기 전에 '몇 시까지 놀고, 돈은 얼마까지 쓰고, 비가 오면 집에 간다'를 정해 두면 그날 기분에 휘둘리지 않아요. 투자도 사기 전에 정해 둬요.")}
        <p class="small muted">이 훈련의 결과는 2020년 한 해의 실제 기록일 뿐, 다른 해에도 똑같이 되지는 않아요. 투자 권유가 아니에요.</p></section>`;
  }
  function back() { return `<button class="tback" data-train="list">‹ 실전 훈련</button>`; }
  function nextBtn(kind, id) {
    const list = kind === "myth" ? myths : charts;
    const i = list.findIndex((x) => x.id === id);
    const n = list[i + 1];
    return n ? `<button class="btn primary wide" data-train="${kind}:${n.id}">다음 ›</button>` : `<button class="btn wide" data-train="list">목록으로</button>`;
  }
  function scenario(S, c) {
    const pick = S.trainPick[c.id];
    const end = c.horizons.at(-1);
    let html = `${back()}<article class="tcard"><p class="eyebrow">선택의 순간 · ${c.tag}</p><h2>${c.title}</h2>
      ${chart(c.sym, { from: c.from, to: pick == null ? c.decide : end, cut: c.decide, ma: c.tag === "눌림목" || c.tag === "분할 매수" ? [20, 60] : [], hlines: c.id === "s5" ? [{ y: peakAAPL, label: "9/1 고점", color: "#ff5a5f" }] : c.id === "s6" ? [{ y: supSPY, label: "지지선", color: "#2fd3a5" }] : [] })}
      ${c.setup()}`;
    if (pick == null) {
      html += `<p class="small muted">${md(c.decide)}까지의 차트만 보여요. 미래는 고른 다음에 열려요.</p><div class="opts">${c.choices.map((o, i) => `<button class="opt" data-train="pick:${c.id}:${i}">${o.label}</button>`).join("")}</div></article>`;
      return html;
    }
    S.trainDone[c.id] = true;
    const best = c.choices.map((o) => o.sim(end)).reduce((m, v, i, a) => (v > a[m] ? i : m), 0);
    html += `<h3 class="sub">실제로 어떻게 됐을까? <small>원금 100만 원 기준(더 넣은 경우 표시) · 수수료 제외</small></h3>
      <div class="tres"><table class="ttable"><thead><tr><th>선택</th>${c.horizons.map((h) => `<th>${md(h)}</th>`).join("")}</tr></thead><tbody>
      ${c.choices.map((o, i) => `<tr class="${i === pick ? "mine" : ""}"><td>${i === pick ? "👉 " : ""}${o.label}</td>${c.horizons.map((h) => { const r = o.sim(h); return `<td class="${cls(r)}">${pct(r)}<small>${won(1e6 * (o.cap || 1) * (1 + r))}${o.cap ? ` / ${o.cap * 100}만 원` : ""}</small></td>`; }).join("")}</tr>`).join("")}
      </tbody></table></div>
      <p class="small muted">연말 기준으로 결과가 가장 좋았던 선택: <b>${c.choices[best].label}</b>. 하지만 그때는 아무도 미래를 몰랐어요. 결과(운)와 판단(과정)을 나눠서 생각해 봐요.</p>
      <div class="lesson">${c.lesson()}</div>${kidBox(S, c.kid)}</article>
      <div class="tnav"><button class="btn" data-train="repick:${c.id}">다시 고르기</button>${SC[SC.indexOf(c) + 1] ? `<button class="btn primary" data-train="sc:${SC[SC.indexOf(c) + 1].id}">다음 상황 ›</button>` : `<button class="btn primary" data-train="list">목록으로</button>`}</div>`;
    return html;
  }
  function click(cmd, S) {
    const [a, b, c] = cmd.split(":");
    if (a === "list") sub = "list";
    else if (a === "myth" || a === "chart" || a === "sc") sub = `${a}:${b}`;
    else if (a === "pick") { (S.trainPick ||= {})[b] = Number(c); sub = `sc:${b}`; }
    else if (a === "repick") { delete S.trainPick[b]; sub = `sc:${b}`; }
  }
  return { view, click, counts: (S) => ({ done: Object.keys(S.trainDone || {}).length, total: myths.length + charts.length + SC.length }) };
})();
