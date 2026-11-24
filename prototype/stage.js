// 스테이지 & 랜덤 도전
// - 실제 스테이지: daily.js의 실제 일별 수정 종가 구간 (원화 환산 1달러=1,200원)
// - 가상 스테이지: 시나리오 엔진이 만든 가상 회사 가격 (시드가 같으면 같은 흐름)
// - 랜덤: 실제 구간 무작위(날짜 숨김) 또는 가상 시나리오 무작위
window.RAUM_STAGE = (() => {
  const D = window.RAUM_DAILY;
  const FX = D.usdKrw;
  const FEE = 0.0025;
  const START_CASH = 10_000_000;
  const PRE = 30; // 시작 전에 보여 주는 지난 거래일 수
  const NOISE = 0.7;

  const fmt = (n, d = 0) => Number(n).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const won = (n) => (n < 0 ? "−" : "") + fmt(Math.abs(Math.round(n))) + "원";
  const pct = (x, d = 1) => (x > 0 ? "+" : "") + (x * 100).toFixed(d) + "%";
  const cls = (x) => (x > 1e-9 ? "up" : x < -1e-9 ? "down" : "flat");
  const md = (d) => `${d.slice(0, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}`;

  // ---------- 난수 ----------
  function rng(seed) {
    let a = seed >>> 0 || 1;
    const u = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = () => { let x = 0, y = 0; while (!x) x = u(); while (!y) y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); };
    return { u, n, int: (k) => Math.floor(u() * k) };
  }

  // ---------- 실제 스테이지 ----------
  const REAL_ASSETS = {
    AAPL: { name: "애플", icon: "A", color: "#dfe5f2", desc: "아이폰을 만드는 기술 회사" },
    AMZN: { name: "아마존", icon: "A", color: "#ff9900", desc: "온라인 쇼핑·클라우드" },
    NFLX: { name: "넷플릭스", icon: "N", color: "#e50914", desc: "영상 구독 서비스" },
    ZM: { name: "줌", icon: "Z", color: "#2d8cff", desc: "화상회의 서비스" },
    AAL: { name: "아메리칸항공", icon: "A", color: "#5b7286", desc: "항공사 (기름값에 민감)" },
    CCL: { name: "카니발", icon: "C", color: "#2847a8", desc: "크루즈 여행" },
    XOM: { name: "엑슨모빌", icon: "X", color: "#d6212e", desc: "석유 회사" },
    SPY: { name: "S&P500 ETF", icon: "S", color: "#2fd3a5", desc: "미국 대표 500개 회사 (시장 전체)", index: true },
  };
  // 2019년 하반기 실제 사건 (scenario-2020.js에는 2020년 뉴스만 있어서 따로 둠)
  const NEWS_2019 = [
    { date: "2019-07-31", kind: "official", headline: "미국 중앙은행, 2008년 이후 처음으로 금리 인하", body: "기준금리를 0.25%p 내렸어요. 경기가 식을까 봐 미리 돈을 싸게 풀기로 했어요." },
    { date: "2019-08-01", kind: "news", headline: "미국, 중국산 3,000억 달러어치에 10% 관세 예고", body: "무역 분쟁이 다시 커졌어요. 물건값이 오르고 회사들 장사가 어려워질까 걱정이에요." },
    { date: "2019-08-05", kind: "news", headline: "중국 위안화 1달러=7위안 돌파… 미국, 중국을 '환율 조작국'으로 지정", body: "미국 주가가 하루 3% 가까이 떨어졌어요." },
    { date: "2019-08-14", kind: "news", headline: "미국 장단기 금리 역전… 2007년 이후 처음", body: "2년 국채 금리가 10년 국채보다 높아졌어요. 과거엔 경기 침체 전에 자주 나타났던 신호예요." },
    { date: "2019-08-23", kind: "news", headline: "중국 보복 관세 발표, 트럼프 '미국 회사들 중국에서 나와라'", body: "무역 분쟁이 더 거칠어지자 주가가 다시 크게 떨어졌어요." },
    { date: "2019-09-16", kind: "news", headline: "사우디 석유 시설 드론 공격… 유가 하루 15% 급등", body: "세계 석유 공급의 5%가 멈췄어요. 석유 회사는 웃고 항공사는 울상이에요." },
    { date: "2019-09-18", kind: "official", headline: "미국 중앙은행, 두 번째 금리 인하", body: "다시 0.25%p 내렸어요." },
    { date: "2019-10-11", kind: "news", headline: "미·중 '1단계 무역 합의' 큰 틀에서 합의", body: "다툼이 조금 누그러질 거라는 기대에 주가가 올랐어요." },
    { date: "2019-10-30", kind: "official", headline: "미국 중앙은행, 올해 세 번째 금리 인하", body: "하지만 '당분간은 더 내리지 않겠다'는 신호도 줬어요." },
    { date: "2019-12-13", kind: "official", headline: "미·중 1단계 무역 합의 타결", body: "추가 관세를 미루기로 했어요. 시장이 사상 최고치 근처에서 한 해를 마무리해요." },
  ];
  const ALL_NEWS = [...NEWS_2019, ...(window.RAUM_SCENARIO?.news || []), ...(window.RAUM_STORY?.extraNews || [])].sort((a, b) => a.date.localeCompare(b.date));
  const dIdx = (d) => D.dates.findIndex((x) => x >= d);

  function realBuild({ from, to, syms, hideDates }) {
    const a = Math.max(1, dIdx(from)), b = to ? dIdx(to) : a + 59;
    const s0 = Math.max(0, a - PRE);
    const series = Object.fromEntries(syms.map((s) => [s, D.prices[s].slice(s0, b + 1).map((v) => v * FX)]));
    const dates = D.dates.slice(s0, b + 1);
    const news = {};
    for (let i = a - s0; i < dates.length; i++) {
      const prev = dates[i - 1], cur = dates[i];
      const items = ALL_NEWS.filter((n) => n.date > prev && n.date <= cur);
      if (items.length) news[i] = items.map((n) => ({ ...n, headline: hideDates ? n.headline.replace(/20\d\d년\s?/g, "") : n.headline }));
    }
    return {
      assets: syms.map((s) => ({ sym: s, ...REAL_ASSETS[s] })), series, start: a - s0, end: dates.length - 1, news, dates,
      label: (i) => (hideDates ? `D+${i - (a - s0)}` : md(dates[i])),
      index: "SPY",
    };
  }

  // ---------- 역사 스테이지 (stages-real.js + stages-hist.js) ----------
  const H = window.RAUM_HIST || {};
  const HS = window.RAUM_HIST_STAGES || { A: {}, stages: [] };
  function histBuild({ hid, fromIdx, toIdx, hideDates }) {
    const src = H[hid], def = HS.stages.find((x) => x.id === hid);
    const a = fromIdx ?? src.start, b = toIdx ?? src.dates.length - 1;
    const s0 = Math.max(0, a - PRE);
    const syms = Object.keys(src.prices);
    const series = Object.fromEntries(syms.map((x) => [x, src.prices[x].slice(s0, b + 1).map((v) => v * def.fx)]));
    const dates = src.dates.slice(s0, b + 1);
    const news = {};
    for (let i = a - s0; i < dates.length; i++) {
      const items = def.news.filter((n) => n.date > dates[i - 1] && n.date <= dates[i]);
      if (items.length) news[i] = items;
    }
    return {
      assets: syms.map((x) => ({ sym: x, ...HS.A[x] })), series, start: a - s0, end: dates.length - 1, news, dates,
      label: (i) => (hideDates ? `D+${i - (a - s0)}` : md(dates[i])), index: def.index,
    };
  }

  // ---------- 가상 시나리오 엔진 ----------
  const V_ASSETS = [
    { sym: "RE", name: "라움전자", icon: "전", color: "#6aa8ff", desc: "반도체·스마트폰 (성장주, 금리에 약함)", b: { m: 1.35, rate: -0.0016, oil: 0, idio: 0.017 }, sector: "tech", p0: 72000 },
    { sym: "SA", name: "하늘항공", icon: "항", color: "#8aa1b6", desc: "항공사 (기름값이 오르면 비용 증가)", b: { m: 1.2, rate: 0, oil: -0.55, idio: 0.02 }, sector: "air", p0: 21000 },
    { sym: "RO", name: "라움정유", icon: "유", color: "#ff7b54", desc: "정유·석유 회사 (기름값이 오르면 이익 증가)", b: { m: 0.8, rate: 0, oil: 0.7, idio: 0.015 }, sector: "energy", p0: 98000 },
    { sym: "NF", name: "냠냠식품", icon: "식", color: "#ffc83d", desc: "라면·과자 (경기에 덜 흔들림)", b: { m: 0.5, rate: -0.0004, oil: -0.05, idio: 0.009 }, sector: "staples", p0: 41000 },
    { sym: "DB", name: "든든은행", icon: "은", color: "#2fd3a5", desc: "은행 (금리가 오르면 이자 이익 증가)", b: { m: 1.0, rate: 0.0012, oil: 0, idio: 0.012 }, sector: "bank", p0: 52000 },
    { sym: "R200", name: "라움200 ETF", icon: "R", color: "#e9eefb", desc: "라움 시장 전체 (지수 ETF)", index: true, p0: 10000 },
    { sym: "BOND", name: "국채 10년 ETF", icon: "채", color: "#a98bff", desc: "나라에 빌려주는 약속 (금리가 오르면 값이 내려감)", bond: true, p0: 100000 },
  ];
  // phase: { d, mkt:[평균, 표준편차](일), rate: 하루 금리 변화(bp), oil:[평균, 표준편차], sector:{tech: 추가 일간 수익}, revert: 지수 평균회귀 강도 }
  // event: { day, headline, body, kind, mkt, oil, rate, cos:{sym: 점프} }
  const SCEN = {
    bull: {
      title: "꾸준한 강세장", icon: "📈", sub: "모두가 웃는 시장. 오래 들고 있기 vs 자주 사고팔기",
      phases: [{ d: 60, mkt: [0.0011, 0.008] }],
      events: [{ day: 8, headline: "라움 경제 성장률 예상보다 높아요", body: "공장도 가게도 바빠요.", kind: "official", mkt: 0.012 }, { day: 30, headline: "기업들 실적 대부분 '기대 이상'", body: "장사가 잘된 회사가 많아요.", kind: "earnings", mkt: 0.008 }],
      reveal: "경제가 좋고 회사들 장사가 잘되는 강세장이었어요. 이런 장에서는 좋은 주식을 사서 <b>오래 들고 있는 것</b>이 가장 잘 통해요. 자주 사고팔면 수수료가 쌓이고 오르는 구간을 놓치기 쉬워요.",
    },
    bubble: {
      title: "버블과 붕괴", icon: "🫧", sub: "끝없이 오를 것 같던 기술주, 그다음은?",
      phases: [{ d: 25, mkt: [0.0012, 0.01], sector: { tech: 0.0045 } }, { d: 15, mkt: [-0.0055, 0.022], sector: { tech: -0.008 } }, { d: 20, mkt: [0.0006, 0.015], sector: { tech: -0.0005 } }],
      events: [
        { day: 3, headline: "'AI 붐' 라움전자 주문 폭발 기대", body: "반도체가 날개 돋친 듯 팔릴 거래요.", kind: "news", cos: { RE: 0.06 } },
        { day: 15, headline: "라움전자 주가, 1년 이익의 80배… '이번엔 다르다'", body: "너무 비싼 것 아니냐는 걱정과 '더 오른다'는 기대가 맞서요.", kind: "news", cos: { RE: 0.03 } },
        { day: 25, headline: "라움전자 실적, 기대에 못 미쳐", body: "실적은 좋았지만 사람들이 기대한 만큼은 아니었어요.", kind: "earnings", cos: { RE: -0.14 }, mkt: -0.025 },
        { day: 31, headline: "'거품이 꺼진다' 공포 확산", body: "빚을 내서 샀던 사람들이 한꺼번에 팔고 있어요.", kind: "news", mkt: -0.035 },
        { day: 45, headline: "저가 매수 들어오지만 분위기는 여전히 조심스러워요", body: "", kind: "news", mkt: 0.015 },
      ],
      reveal: "기대가 실적보다 훨씬 빨리 커진 <b>버블</b>이었어요. 마지막에 산 사람일수록 크게 잃었어요. PER이 지나치게 높을 때 '이번엔 다르다'는 말이 나오면 조심하고, 한 종목에 몰빵하지 않는 게 중요해요.",
    },
    autumn: {
      title: "금리 인상기 (시장의 가을)", icon: "🍂", sub: "중앙은행이 금리를 올려요. 누가 웃고 누가 울까?",
      phases: [{ d: 60, mkt: [-0.0004, 0.011], rate: 1.6, sector: { bank: 0.0012 } }],
      events: [
        { day: 4, headline: "중앙은행, 기준금리 0.5%p 인상", body: "물가가 너무 올라서 돈을 빌리는 값을 올렸어요.", kind: "official", rate: 40, mkt: -0.015 },
        { day: 24, headline: "중앙은행, 금리 또 0.5%p 인상… '물가 잡을 때까지'", body: "", kind: "official", rate: 35, mkt: -0.02 },
        { day: 46, headline: "중앙은행 '인상 속도를 늦추겠다'", body: "끝이 보인다는 기대가 생겨요.", kind: "official", rate: -15, mkt: 0.02 },
      ],
      reveal: "금리가 오르는 <b>시장의 가을</b>이었어요. 금리가 오르면 이미 있던 <b>채권값이 내려가고</b>, 미래 이익을 기대하는 <b>성장주(라움전자)</b>가 약해져요. 반대로 이자로 돈을 버는 <b>은행</b>은 버티거나 올라요.",
    },
    oil: {
      title: "오일 쇼크", icon: "🛢️", sub: "기름값이 폭등하면 어떤 회사가 흔들릴까?",
      phases: [{ d: 10, mkt: [0.0004, 0.009] }, { d: 30, mkt: [-0.0018, 0.014], oil: [0.008, 0.03] }, { d: 20, mkt: [0.0008, 0.011], oil: [-0.006, 0.025] }],
      events: [
        { day: 10, headline: "산유국 분쟁… 원유 공급 차질", body: "기름값이 하루 만에 25% 뛰었어요.", kind: "news", oil: 0.25, mkt: -0.02 },
        { day: 22, headline: "항공사들 '기름값 때문에 적자 날 판'", body: "비행기표 값을 올려도 손님이 줄어요.", kind: "news", cos: { SA: -0.06 } },
        { day: 41, headline: "분쟁 해결 기대… 기름값 내려가기 시작", body: "", kind: "news", oil: -0.12 },
      ],
      reveal: "기름값이 폭등한 <b>오일 쇼크</b>였어요. 석유를 파는 <b>정유 회사는 이익</b>이 늘고, 기름을 많이 쓰는 <b>항공사는 비용</b>이 커져요. 같은 뉴스가 회사마다 정반대로 작용해요.",
    },
    range: {
      title: "지루한 횡보장", icon: "↔️", sub: "오르지도 내리지도 않는 시장. 자주 사고팔면?",
      phases: [{ d: 60, mkt: [0, 0.009], revert: 0.08 }],
      events: [{ day: 12, headline: "경제 지표 '그럭저럭'", body: "좋지도 나쁘지도 않아요.", kind: "official" }, { day: 38, headline: "전문가들 '방향을 모르겠다'", body: "", kind: "news" }],
      reveal: "위아래로 출렁이기만 하는 <b>횡보장</b>이었어요. 이런 장에서 자주 사고팔면 <b>수수료만 쌓여요</b>. 지지선 근처에서 사고 저항선 근처에서 파는 방법이 통하기도 하지만, 언제 횡보가 끝날지는 아무도 몰라요.",
    },
    vshape: {
      title: "폭락과 V자 반등", icon: "⚡", sub: "갑작스러운 공포, 그리고 반전",
      phases: [{ d: 8, mkt: [0.0005, 0.008] }, { d: 12, mkt: [-0.008, 0.035] }, { d: 40, mkt: [0.0045, 0.018] }],
      events: [
        { day: 8, headline: "갑작스러운 위기! 시장 하루 9% 폭락", body: "무슨 일이 생길지 몰라 모두 팔고 있어요. 거래가 잠시 멈췄어요(서킷브레이커).", kind: "news", mkt: -0.09 },
        { day: 20, headline: "중앙은행·정부 '필요한 만큼 돕겠다' 긴급 발표", body: "금리를 0%로 내리고 돈을 풀어요.", kind: "official", mkt: 0.07, rate: -50 },
        { day: 35, headline: "생각보다 빨리 회복… 경제 다시 움직여요", body: "", kind: "news", mkt: 0.02 },
      ],
      reveal: "공포로 폭락했다가 빠르게 회복한 <b>V자 반등</b>이었어요. 바닥에서 판 사람은 손실을 확정했고, 버티거나 <b>나눠서 산 사람</b>은 회복의 열매를 가져갔어요. 금리가 내려가자 <b>채권</b>도 올랐어요.",
    },
    earnings: {
      title: "실적 시즌", icon: "📊", sub: "성적표 발표! 기대와 결과의 차이를 읽어요",
      phases: [{ d: 60, mkt: [0.0003, 0.008] }],
      events: [],
      gen: (r) => {
        const ev = [];
        V_ASSETS.filter((a) => !a.index && !a.bond).forEach((a, k) => {
          const day = 9 + k * 10, exp = r.n(), act = r.n();
          const g = (x) => Math.round(8 + x * 9);
          ev.push({ day: day - 4, headline: `${a.name} 실적 발표 다가와요 · 시장은 매출 +${g(exp)}% 기대`, body: exp > 0.3 ? "기대가 꽤 높아요." : exp < -0.3 ? "기대가 낮은 편이에요." : "기대는 보통이에요.", kind: "news", cos: { [a.sym]: exp * 0.025 } });
          ev.push({ day, headline: `${a.name} 실적: 매출 ${g(act) >= 0 ? "+" : ""}${g(act)}% (예상 +${g(exp)}%)`, body: act > exp ? "예상보다 좋았어요." : "예상에 못 미쳤어요.", kind: "earnings", cos: { [a.sym]: (act - exp) * 0.05 } });
        });
        return ev;
      },
      reveal: "회사마다 <b>예상</b>과 <b>실제</b>가 달랐어요. 실적이 성장했어도 예상보다 낮으면 주가가 떨어지고, 낮은 성장이어도 예상보다 좋으면 올랐어요. 발표 전에 기대만으로 미리 오른 주식은 발표 날 실망하기 쉬워요.",
    },
  };

  function virtualBuild(kind, seed) {
    const sc = SCEN[kind], r = rng(seed * 7919 + kind.length);
    const days = PRE + sc.phases.reduce((t, p) => t + p.d, 0);
    const events = [...sc.events, ...(sc.gen ? sc.gen(r) : [])].map((e) => ({ ...e, day: e.day + PRE }));
    const stocks = V_ASSETS.filter((a) => !a.index && !a.bond);
    const series = Object.fromEntries(V_ASSETS.map((a) => [a.sym, [a.p0 * (0.85 + r.u() * 0.3)]]));
    let lvl = 1;
    const phaseAt = (t) => { if (t < PRE) return { mkt: [0.0003, 0.008] }; let k = t - PRE; for (const p of sc.phases) { if (k < p.d) return p; k -= p.d; } return sc.phases.at(-1); };
    for (let t = 1; t < days; t++) {
      const ph = phaseAt(t), ev = events.filter((e) => e.day === t);
      // NOISE: 무작위 흔들림 비율 (시나리오 흐름이 묻히지 않도록 0.7로 줄임, 시드 300개로 보정)
      let m = ph.mkt[0] + NOISE * ph.mkt[1] * r.n() - (ph.revert ? ph.revert * Math.log(lvl) : 0);
      let oil = ph.oil ? ph.oil[0] + NOISE * ph.oil[1] * r.n() : 0.004 * r.n();
      let dRate = (ph.rate || 0) + 0.8 * r.n();
      const jump = {};
      for (const e of ev) { m += e.mkt || 0; oil += e.oil || 0; dRate += e.rate || 0; Object.assign(jump, e.cos || {}); }
      let idx = 0;
      for (const a of stocks) {
        const ret = a.b.m * m + a.b.oil * oil + a.b.rate * dRate + (ph.sector?.[a.sector] || 0) + 0.75 * a.b.idio * r.n() + (jump[a.sym] || 0);
        const last = series[a.sym].at(-1);
        series[a.sym].push(Math.max(last * (1 + ret), 50));
        idx += ret / stocks.length;
      }
      lvl *= 1 + m;
      series.R200.push(series.R200.at(-1) * (1 + idx));
      series.BOND.push(series.BOND.at(-1) * (1 - 0.08 * (dRate / 100) + 0.00012));
    }
    for (const a of V_ASSETS) series[a.sym] = series[a.sym].map((v) => Math.round(v));
    const news = {};
    for (const e of events) (news[e.day] ||= []).push(e);
    return { assets: V_ASSETS, series, start: PRE, end: days - 1, news, label: (i) => `${i - PRE + 1}일째`, index: "R200" };
  }

  // ---------- 스테이지 목록 ----------
  const REAL = [
    { id: "r1", title: "무역 분쟁의 여름", period: "2019.07–10", icon: "🌏", from: "2019-07-15", to: "2019-10-15", syms: ["AAPL", "AMZN", "NFLX", "XOM", "AAL", "SPY"], sub: "관세 전쟁, 금리 인하, 사우디 석유 시설 피습",
      reveal: "실제 2019년 여름이었어요. 미국과 중국이 관세로 다투며 주가가 출렁였고, 중앙은행은 경기를 지키려고 10여 년 만에 금리를 내렸어요. 9월엔 사우디 석유 시설이 공격받아 기름값이 하루 15% 뛰었어요." },
    { id: "r2", title: "팬데믹 폭락", period: "2020.02–05", icon: "🦠", from: "2020-02-14", to: "2020-05-08", syms: ["AAPL", "ZM", "AAL", "CCL", "XOM", "SPY"], sub: "역사상 가장 빠른 폭락, 그리고 반등",
      reveal: "실제 2020년 봄, 코로나19 팬데믹이었어요. 한 달 만에 시장이 30% 넘게 떨어졌고 서킷브레이커가 네 번 발동됐어요. 중앙은행이 돈을 풀자 빠르게 반등했지만, 여행 회사들은 회복하지 못했어요." },
    { id: "r3", title: "기술주 랠리와 9월 급락", period: "2020.07–09", icon: "🚀", from: "2020-07-01", to: "2020-09-30", syms: ["AAPL", "AMZN", "ZM", "NFLX", "XOM", "SPY"], sub: "끝없이 오르던 기술주가 갑자기 꺾였어요",
      reveal: "실제 2020년 여름이었어요. 집콕 시대의 기술 회사들이 쉬지 않고 올랐고 애플은 시가총액 2조 달러를 넘었어요. 그런데 9월 초 기술주가 며칠 만에 10% 넘게 빠졌어요. 오를 때의 기대가 컸던 만큼 실망도 빨랐어요." },
    { id: "r4", title: "백신 랠리", period: "2020.10–12", icon: "💉", from: "2020-10-01", to: "2020-12-31", syms: ["ZM", "AAL", "CCL", "XOM", "AAPL", "SPY"], sub: "같은 뉴스, 정반대 반응",
      reveal: "실제 2020년 가을이었어요. 11월 9일 백신 효과 발표 하루 만에 여행·석유 회사는 폭등하고 집콕 수혜주인 줌은 급락했어요. 시장의 주인공이 하루아침에 바뀌었어요." },
  ];
  REAL.forEach((x, i) => (x.year = i === 0 ? 2019 : 2020));
  const TIMELINE = [
    ...HS.stages.map((x) => ({ id: x.id, year: x.year, title: x.title, period: x.period, icon: x.icon, sub: x.sub, diff: x.diff, hist: true, kr: !!x.krw })),
    ...REAL.map((x) => ({ ...x, diff: x.id === "r2" ? 3 : 2 })),
  ].sort((a, b) => a.year - b.year || a.period.localeCompare(b.period));
  const YEARS = [...new Set(TIMELINE.map((x) => x.year))];
  const VIRTUAL = Object.entries(SCEN).map(([k, v], i) => ({ id: "v" + (i + 1), kind: k, title: v.title, icon: v.icon, sub: v.sub }));

  // ---------- 상태 ----------
  let cache = { key: null, data: null };
  function data(run) {
    const key = JSON.stringify([run.id, run.seed, run.kind, run.from, run.hid, run.fromIdx]);
    if (cache.key === key) return cache.data;
    let d;
    if (run.hid) d = histBuild({ hid: run.hid, fromIdx: run.fromIdx, toIdx: run.toIdx, hideDates: run.hidden });
    else if (run.real) d = realBuild({ from: run.from, to: run.to, syms: run.syms, hideDates: run.hidden });
    else d = virtualBuild(run.kind, run.seed);
    cache = { key, data: d };
    return d;
  }
  function newRun(S, spec) {
    S.stg = { ...spec, day: 0, cash: START_CASH, pos: {}, trades: 0, fees: 0, vals: [START_CASH], sel: null, done: false };
    const d = data(S.stg);
    S.stg.sel = d.assets.find((a) => !a.index)?.sym;
    S.stg.day = d.start;
    sub = "play";
  }
  const price = (d, sym, i) => d.series[sym][i];
  const value = (run, d, i = run.day) => run.cash + Object.entries(run.pos).reduce((t, [s, p]) => t + p.qty * price(d, s, i), 0);

  function trade(S, side, frac) {
    const run = S.stg, d = data(run), s = run.sel, p = price(d, s, run.day);
    if (side === "buy") {
      const q = Math.floor((run.cash * frac) / (p * (1 + FEE)));
      if (q < 1) return msg = "현금이 부족해요.";
      const cost = q * p, fee = cost * FEE;
      run.cash -= cost + fee; run.fees += fee; run.trades++;
      const ps = (run.pos[s] ||= { qty: 0, cost: 0 }); ps.qty += q; ps.cost += cost + fee;
      msg = `${name(d, s)} ${fmt(q)}주 샀어요.`;
    } else {
      const ps = run.pos[s];
      if (!ps) return msg = "가진 주식이 없어요.";
      const q = Math.max(1, Math.floor(ps.qty * frac));
      const amt = q * p, fee = amt * FEE;
      run.cash += amt - fee; run.fees += fee; run.trades++;
      ps.cost *= (ps.qty - q) / ps.qty; ps.qty -= q;
      if (!ps.qty) delete run.pos[s];
      msg = `${name(d, s)} ${fmt(q)}주 팔았어요.`;
    }
  }
  const name = (d, s) => d.assets.find((a) => a.sym === s).name;
  function advance(S, n) {
    const run = S.stg, d = data(run);
    for (let k = 0; k < n && run.day < d.end; k++) { run.day++; run.vals.push(value(run, d)); }
    if (run.day >= d.end) finish(S);
  }
  function finish(S) {
    const run = S.stg, d = data(run);
    run.done = true;
    const r = value(run, d) / START_CASH - 1, ir = price(d, d.index, d.end) / price(d, d.index, d.start) - 1;
    let peak = -Infinity, mdd = 0;
    for (const v of run.vals) { peak = Math.max(peak, v); mdd = Math.min(mdd, v / peak - 1); }
    const beat = r >= ir - 0.005; // 지수를 사서 들고만 있어도 수수료만큼 뒤처지므로 0.5%p는 봐줌
    const stars = (r > 0 ? 1 : 0) + (beat ? 1 : 0) + (mdd > -0.15 ? 1 : 0);
    run.result = { r, ir, mdd, stars };
    const key = run.random ? (run.real ? "random-real" : "random-virtual") : run.id;
    S.stgStars ||= {};
    S.stgStars[key] = Math.max(S.stgStars[key] || 0, stars);
    S.stgPlays = (S.stgPlays || 0) + 1;
    sub = "result";
  }

  // ---------- 화면 ----------
  let sub = "map", msg = "";
  const stars = (n) => "★".repeat(n) + "☆".repeat(3 - n);
  function chart(d, sym, to) {
    const v = d.series[sym].slice(0, to + 1), w = 360, h = 170, pad = { l: 4, r: 56, t: 10, b: 16 };
    const lo = Math.min(...v), hi = Math.max(...v), sp = hi - lo || hi * 0.05 || 1, y0 = lo - sp * 0.06, y1 = hi + sp * 0.06;
    const X = (i) => pad.l + (i / Math.max(v.length - 1, d.end)) * (w - pad.l - pad.r);
    const Y = (x) => pad.t + (1 - (x - y0) / (y1 - y0)) * (h - pad.t - pad.b);
    const pts = (a, b) => v.slice(a, b + 1).map((x, k) => `${X(a + k).toFixed(1)},${Y(x).toFixed(1)}`).join(" ");
    const up = v.at(-1) >= v[d.start];
    return `<svg viewBox="0 0 ${w} ${h}" class="tchart" role="img" aria-label="${name(d, sym)} 차트">
      ${[lo, (lo + hi) / 2, hi].map((x) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(x)}" y2="${Y(x)}" class="g"/><text x="${w - pad.r + 5}" y="${Y(x) + 4}" class="tk">${fmt(x)}</text>`).join("")}
      <line x1="${X(d.start)}" x2="${X(d.start)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#ffc83d" stroke-dasharray="3 3"/>
      <polyline points="${pts(0, Math.min(d.start, v.length - 1))}" fill="none" stroke="#56627c" stroke-width="1.6"/>
      ${v.length - 1 > d.start ? `<polyline points="${pts(d.start, v.length - 1)}" fill="none" stroke="${up ? "#ff5a5f" : "#4c8dff"}" stroke-width="2.2" stroke-linejoin="round"/>` : ""}
      <circle cx="${X(v.length - 1)}" cy="${Y(v.at(-1))}" r="3.5" fill="#ffc83d"/>
      <rect x="${X(v.length - 1) + 4}" y="${pad.t}" width="${Math.max(0, X(d.end) - X(v.length - 1) - 4)}" height="${h - pad.t - pad.b}" fill="#ffffff" opacity=".025"/>
      <text x="${(X(v.length - 1) + X(d.end)) / 2}" y="${h / 2}" class="tk" text-anchor="middle">${v.length - 1 < d.end ? "?" : ""}</text>
    </svg>`;
  }
  function kidBox(S, t) { return S.kid && t ? `<div class="kidbox"><b>🧒 쉽게 말하면</b><p>${t}</p></div>` : ""; }

  function viewMap(S) {
    const st = S.stgStars || {};
    const card = (s, real) => `<li><button class="stage ${real ? "real" : "virt"}" data-stg="start:${s.id}"><span class="sicon">${s.icon}</span><span class="sbody"><span class="sbadge">${real ? "실제 " + s.period : "가상"}</span><b>${s.title}</b><small>${s.sub}</small></span><span class="sstars">${stars(st[s.id] || 0)}</span></button></li>`;
    return `<section class="hero thero"><p class="eyebrow">STAGES</p><h1>스테이지 & 랜덤 도전</h1><p class="muted">60일 남짓의 짧은 판이에요. 1,000만 원으로 시작해 별 3개에 도전하세요.</p>
        <p class="goals"><span>★ 수익 내기</span><span>★ 시장(지수 ETF)보다 잘하기</span><span>★ 가장 크게 떨어졌을 때도 −15% 안쪽</span></p></section>
      <div class="rand">
        <button class="btn primary" data-stg="random:real">🎲 실제 랜덤<small>1987~2023 중 무작위 구간 · 몇 년인지 맞혀 봐요</small></button>
        <button class="btn primary alt" data-stg="random:virtual">🎲 가상 랜덤<small>무작위 시나리오 · 매번 다른 흐름</small></button>
      </div>
      <p class="small muted">랜덤 최고 기록: 실제 ${stars(st["random-real"] || 0)} · 가상 ${stars(st["random-virtual"] || 0)} · 지금까지 ${S.stgPlays || 0}판 · 연도 맞히기 ${S.stgYearHits || 0}번</p>
      ${S.stg && !S.stg.done ? `<button class="btn wide" data-stg="resume">▶ 하던 판 이어하기 · ${S.stg.title}</button>` : ""}
      <h2 class="sec">⏳ 타임머신 · 실제 역사 <small>${TIMELINE.length}개 · 1987 → 2023</small></h2>
      <ol class="timeline">${TIMELINE.map((s) => `<li><span class="tyear">${s.year}</span><button class="stage real" data-stg="start:${s.id}"><span class="sicon">${s.icon}</span><span class="sbody"><span class="sbadge">${s.kr ? "🇰🇷 한국 · " : ""}실제 ${s.period} · 난이도 ${"●".repeat(s.diff)}${"○".repeat(3 - s.diff)}</span><b>${s.title}</b><small>${s.sub}</small></span><span class="sstars">${stars(st[s.id] || 0)}</span></button></li>`).join("")}</ol>
      <h2 class="sec">가상 상황 <small>가상 회사 · 시나리오 엔진</small></h2><ul class="stages">${VIRTUAL.map((s) => card(s, false)).join("")}</ul>
      <p class="small muted">가상 상황의 회사와 뉴스는 모두 지어낸 것이에요. 실제 상황은 실제 일별 수정 종가(1달러=1,200원)예요. 역사 스테이지는 실제 일별 수정 종가(Yahoo Finance 기반)이고, 미국 주식은 1달러=1,200원으로 계산했어요.</p>`;
  }
  function viewPlay(S) {
    const run = S.stg, d = data(run), i = run.day;
    const v = value(run, d), r = v / START_CASH - 1, ir = price(d, d.index, i) / price(d, d.index, d.start) - 1;
    const s = run.sel, p = price(d, s, i), pc = price(d, s, i - 1), own = run.pos[s];
    const left = d.end - i;
    const story = i === d.start && run.intro && !run.hidden ? `<article class="newscard fresh story"><span class="ntag">⏳ 타임머신 도착 · ${run.year}년</span><p>${run.intro}</p>${kidBox(S, run.kidIntro)}</article>` : "";
    const todayNews = Object.entries(d.news).filter(([k]) => Number(k) <= i && Number(k) > i - 5).flatMap(([k, arr]) => arr.map((n) => ({ ...n, k: Number(k) }))).reverse();
    return `<div class="splay">
      <div class="shead"><button class="tback" data-stg="map">‹ 스테이지</button><span class="stitle">${run.icon || "🎲"} ${run.title}</span><span class="sday">${d.label(i)} · ${left}일 남음</span></div>
      <div class="sbar"><div><small>내 자산</small><b>${won(v)}</b><span class="${cls(r)}">${pct(r)}</span></div><div><small>시장(${name(d, d.index)})</small><b class="${cls(ir)}">${pct(ir)}</b></div><div><small>거래</small><b>${run.trades}번</b></div></div>
      ${story}
      <div class="chips sassets">${d.assets.map((a) => { const c = price(d, a.sym, i) / price(d, a.sym, i - 1) - 1; return `<button class="achip ${a.sym === s ? "on" : ""}" data-stg="sel:${a.sym}"><i style="background:${a.color}">${a.icon}</i>${a.name}<small class="${cls(c)}">${pct(c)}</small></button>`; }).join("")}</div>
      <div class="tcard sbox">
        <div class="sprice"><b>${name(d, s)}</b><span>${fmt(p)}원</span><small class="${cls(p - pc)}">${pct(p / pc - 1)}</small></div>
        <p class="small muted">${d.assets.find((a) => a.sym === s).desc}</p>
        ${chart(d, s, i)}
        ${own ? `<p class="small">보유 ${fmt(own.qty)}주 · 평균 ${fmt(own.cost / own.qty)}원 · <b class="${cls(own.qty * p - own.cost)}">${pct((own.qty * p) / own.cost - 1)}</b></p>` : ""}
        <div class="sbtns"><button class="btn buy" data-stg="buy:0.25">현금 25% 매수</button><button class="btn buy" data-stg="buy:1">전부 매수</button><button class="btn sell" data-stg="sell:0.5" ${own ? "" : "disabled"}>절반 매도</button><button class="btn sell" data-stg="sell:1" ${own ? "" : "disabled"}>전부 매도</button></div>
        <p class="smsg" aria-live="polite">${msg}</p>
      </div>
      ${todayNews.length ? `<div class="snews">${todayNews.map((n) => `<article class="newscard ${n.k === i ? "fresh" : ""}"><span class="ntag">${n.k === i ? "오늘 · " : ""}${n.kind === "official" ? "공식 발표" : n.kind === "earnings" ? "실적 발표" : "뉴스"}</span><h3>${n.headline}</h3>${n.body ? `<p>${n.body}</p>` : ""}</article>`).join("")}</div>` : `<p class="small muted">최근 큰 뉴스는 없어요. 차트와 시장 흐름을 보세요.</p>`}
      <h3 class="sub">내 주머니</h3>
      <ul class="orders">${[`<li>현금 <b style="margin-left:auto">${won(run.cash)}</b></li>`, ...Object.entries(run.pos).map(([k, ps]) => `<li>${name(d, k)} ${fmt(ps.qty)}주 <b class="${cls(ps.qty * price(d, k, i) - ps.cost)}" style="margin-left:auto">${won(ps.qty * price(d, k, i))}</b></li>`)].join("")}</ul>
      <div class="stime"><button class="btn ghost" data-stg="next:1">다음 날 ▶</button><button class="btn ghost" data-stg="next:5">5일 ▶</button><button class="btn ghost" data-stg="next:999">끝까지 ⏭</button></div>
    </div>`;
  }
  function yearQuiz(S) {
    const run = S.stg;
    if (!run.qopts) {
      const others = YEARS.filter((y) => y !== run.year).sort(() => Math.random() - 0.5).slice(0, 3);
      run.qopts = [run.year, ...others].sort((a, b) => a - b);
    }
    return `<section class="tcard sresult"><p class="eyebrow">🎲 비밀 공개 전에</p><h2>이 시장은 몇 년이었을까요?</h2>
      <p class="muted">뉴스와 회사들의 움직임에서 힌트를 찾아보세요.</p>
      <div class="opts yq">${run.qopts.map((y) => `<button class="opt" data-stg="guess:${y}">${y}년</button>`).join("")}</div></section>`;
  }
  function viewResult(S) {
    const run = S.stg, d = data(run), R = run.result;
    if (run.random && run.real && run.guess == null) return yearQuiz(S);
    const rows = d.assets.map((a) => ({ a, r: price(d, a.sym, d.end) / price(d, a.sym, d.start) - 1 })).sort((x, y) => y.r - x.r);
    const guessLine = run.guess != null ? `<p class="reveal ${run.guess === run.year ? "ok" : ""}">${run.guess === run.year ? "🎯 정답!" : `아쉬워요! ${run.guess}년이 아니라`} <b>${run.year}년</b>이었어요.</p>` : "";
    const reveal = run.real ? guessLine + (run.hidden ? `<p class="reveal">🔓 이 구간은 실제 <b>${md(d.dates[d.start])} ~ ${md(d.dates[d.end])}</b>이었어요.</p>` : "") + (run.revealText ? `<p>${run.revealText}</p>` : "")
      : `<p class="reveal">🔓 이번 시장은 <b>${SCEN[run.kind].icon} ${SCEN[run.kind].title}</b>이었어요.</p><p>${SCEN[run.kind].reveal}</p>`;
    const tip = R.r < R.ir - 0.005 ? (run.trades > 12 ? "거래가 많았어요. 수수료와 타이밍 실수가 쌓였을 수 있어요. 다음엔 사기 전에 '왜 사는지'를 정하고 덜 움직여 보세요." : "시장보다 뒤처졌어요. 시장 전체(지수 ETF)를 들고만 있어도 얻을 수 있었던 결과와 비교해 보세요.") : R.mdd <= -0.15 ? "결과는 좋았지만 중간에 크게 흔들렸어요. 나눠 사기와 손절 기준으로 흔들림을 줄여 보세요." : "결과와 흔들림 모두 잘 관리했어요. 운이었는지 판단이었는지 돌아보세요.";
    return `<section class="tcard sresult">
      <p class="eyebrow">결과</p><h2>${run.icon || "🎲"} ${run.title}</h2>
      <p class="bigstars">${stars(R.stars)}</p>
      <dl class="kv"><div><dt>내 수익률</dt><dd class="${cls(R.r)}">${pct(R.r)}</dd></div><div><dt>시장(지수 ETF)</dt><dd class="${cls(R.ir)}">${pct(R.ir)}</dd></div><div><dt>가장 크게 떨어졌을 때</dt><dd class="${R.mdd <= -0.15 ? "down" : ""}">${pct(R.mdd)}</dd></div></dl>
      <p class="small">★ 수익 ${R.r > 0 ? "✓" : "✗"} · ★ 시장보다 잘하기 ${R.r >= R.ir - 0.005 ? "✓" : "✗"} · ★ −15% 안쪽 ${R.mdd > -0.15 ? "✓" : "✗"} · 거래 ${run.trades}번 · 수수료 ${won(run.fees)}</p>
      ${reveal}
      <h3 class="sub">이 기간 각 상품의 성적</h3>
      <ul class="orders">${rows.map(({ a, r }) => `<li><i class="dotc" style="background:${a.color}"></i>${a.name} <b class="${cls(r)}" style="margin-left:auto">${pct(r)}</b></li>`).join("")}</ul>
      <p class="note">${tip}</p>
      ${kidBox(S, run.real ? "진짜 있었던 일로 연습했어요. 같은 일이 똑같이 다시 일어나지는 않지만, 비슷한 상황에서 사람들이 어떻게 움직이는지 배울 수 있어요." : "이번 시장은 만든 이야기였어요. 그래도 '금리가 오르면 채권이 내려간다', '기름값이 오르면 항공사가 힘들다' 같은 원리는 실제와 같아요.")}
      <div class="tnav"><button class="btn" data-stg="map">스테이지</button><button class="btn primary" data-stg="again">${run.random ? "🎲 한 판 더" : "다시 도전"}</button></div>
    </section>`;
  }
  function view(S) {
    if ((sub === "play" || sub === "result") && !S.stg) sub = "map";
    if (sub === "play" && S.stg?.done) sub = "result";
    return sub === "play" ? viewPlay(S) : sub === "result" ? viewResult(S) : viewMap(S);
  }
  function start(S, id) {
    const hs = HS.stages.find((x) => x.id === id);
    if (hs && H[id]) return newRun(S, { id, hid: id, real: true, title: hs.title, icon: hs.icon, revealText: hs.reveal, intro: hs.intro, kidIntro: hs.kid, year: hs.year });
    const re = REAL.find((x) => x.id === id);
    if (re) return newRun(S, { id, real: true, from: re.from, to: re.to, syms: re.syms, title: re.title, icon: re.icon, revealText: re.reveal });
    const vi = VIRTUAL.find((x) => x.id === id);
    newRun(S, { id, kind: vi.kind, seed: 1 + Math.floor(Math.random() * 1e6), title: vi.title, icon: vi.icon });
  }
  function random(S, real) {
    const r = rng((Date.now() ^ Math.floor(Math.random() * 2147483647)) >>> 0);
    if (real) {
      // 시대를 먼저 고르고(2019–20 데이터 포함), 그 안에서 최대 60거래일 구간을 무작위로
      const pool = [...HS.stages.filter((x) => H[x.id]).map((x) => x.id), "daily", "daily"];
      const pick = pool[r.int(pool.length)];
      if (pick === "daily") {
        const syms = ["AAPL", "AMZN", "NFLX", "ZM", "AAL", "CCL", "XOM"].sort(() => r.u() - 0.5).slice(0, 5).concat("SPY");
        const a = PRE + r.int(D.dates.length - 61 - PRE);
        newRun(S, { id: "random-real", random: true, real: true, hidden: true, from: D.dates[a], to: D.dates[a + 59], syms, title: "비밀의 60일", icon: "🎲", year: Number(D.dates[a + 29].slice(0, 4)) });
      } else {
        const src = H[pick], len = src.dates.length - src.start, span = Math.min(60, len);
        const fromIdx = src.start + r.int(Math.max(1, len - span + 1));
        const def = HS.stages.find((x) => x.id === pick);
        newRun(S, { id: "random-real", random: true, real: true, hidden: true, hid: pick, fromIdx, toIdx: fromIdx + span - 1, title: "비밀의 시대", icon: "🎲", revealText: def.reveal, year: Number(src.dates[fromIdx + Math.floor((span - 1) / 2)].slice(0, 4)) }); // 정답 연도 = 구간 가운데 날짜의 해
      }
    } else {
      const kinds = Object.keys(SCEN);
      newRun(S, { id: "random-virtual", random: true, kind: kinds[r.int(kinds.length)], seed: 1 + r.int(1e6), title: "알 수 없는 시장", icon: "🎲" });
    }
  }
  function click(cmd, S) {
    const [a, b] = cmd.split(":");
    msg = "";
    if (a === "map") sub = "map";
    else if (a === "resume") sub = "play";
    else if (a === "start") start(S, b);
    else if (a === "random") random(S, b === "real");
    else if (a === "again") { const run = S.stg; if (run.random) random(S, run.real); else start(S, run.id); }
    else if (a === "sel") S.stg.sel = b;
    else if (a === "buy" || a === "sell") trade(S, a, Number(b));
    else if (a === "next") advance(S, Number(b));
    else if (a === "guess") { S.stg.guess = Number(b); if (S.stg.guess === S.stg.year) S.stgYearHits = (S.stgYearHits || 0) + 1; }
  }
  return { _data: data, view, click, go: (s) => (sub = s), random, counts: (S) => Object.values(S.stgStars || {}).reduce((t, x) => t + x, 0) };
})();
