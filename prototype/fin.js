// 회사 성적표(재무제표) — 단위: 미국 달러 10억(billion).
// 출처: SEC EDGAR XBRL companyfacts API (data.sec.gov), 각 회계연도 10-K 최초 제출본의 값. 2026-11-24 확인.
//   rev = RevenueFromContractWithCustomerExcludingAssessedTax (넷플릭스는 Revenues)
//   op = OperatingIncomeLoss, net = NetIncomeLoss, assets = Assets
//   liab = Liabilities, 없으면 Assets − 자본총계(비지배지분 포함)
// prev: 탐험 직전 회계연도(게임 안에서 "작년 성적표"), now: 탐험한 해(마지막 공개 화면에서만)
// 회계연도가 달력과 다른 회사: 줌(1월 말 결산), 애플(9월 말), 카니발(11월 말).
// eps = EarningsPerShareDiluted, sharesM = WeightedAverageNumberOfDilutedSharesOutstanding (엑슨모빌은 dei:EntityCommonStockSharesOutstanding)
//   애플(4:1, 2020)·아마존(20:1, 2022)은 가격 데이터가 분할 반영 수정주가라 EPS는 나누고 주식수는 곱함
// src: prev 값이 실린 10-K의 접수번호(accession number)
window.RAUM_FIN = {
  ZM: {
    fy: "1월 결산", // 연도를 쓰면 비밀의 해가 드러나요
    eps: 0.09, sharesM: 254.3, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0001585521-20-000095",
    prev: { rev: 0.623, revBefore: 0.331, op: 0.013, net: 0.025, assets: 1.290, liab: 0.456 },
    now: { rev: 2.651, net: 0.672 },
    note: "회사가 아직 작지만 매출이 1년에 두 배 가까이 커지고 있어요.",
  },
  AMZN: {
    fy: "12월 결산",
    eps: 1.1505, sharesM: 10080, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0001018724-20-000004",
    prev: { rev: 280.522, revBefore: 232.887, op: 14.541, net: 11.588, assets: 225.248, liab: 163.188 },
    now: { rev: 386.064, net: 21.331 },
    note: "엄청나게 많이 팔지만, 번 돈을 창고·배송에 다시 써서 이익률은 낮은 편이에요.",
  },
  NFLX: {
    fy: "12월 결산",
    eps: 4.13, sharesM: 451.8, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0001065280-20-000040",
    prev: { rev: 20.156, revBefore: 15.794, op: 2.604, net: 1.867, assets: 33.976, liab: 26.394 },
    now: { rev: 24.996, net: 2.761 },
    note: "드라마·영화를 만들려고 빚을 많이 냈어요. 가입자가 늘어야 갚을 수 있어요.",
  },
  AAPL: {
    fy: "9월 결산",
    eps: 2.9725, sharesM: 18595.6, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0000320193-19-000119",
    prev: { rev: 260.174, revBefore: 265.595, op: 63.930, net: 55.256, assets: 338.516, liab: 248.028 },
    now: { rev: 274.515, net: 57.411 },
    note: "1,000원어치를 팔면 약 250원을 남기는, 아주 돈을 잘 버는 회사예요.",
  },
  AAL: {
    fy: "12월 결산",
    eps: 3.79, sharesM: 444.3, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0000006201-20-000023",
    prev: { rev: 45.768, revBefore: 44.541, op: 3.065, net: 1.686, assets: 59.995, liab: 60.113 },
    now: { rev: 17.337, net: -8.885 },
    note: "빚이 가진 것보다 많아요(자본잠식). 손님이 끊기면 버틸 힘이 가장 약해요.",
  },
  CCL: {
    fy: "11월 결산",
    eps: 4.32, sharesM: 692.0, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0000815097-20-000003",
    prev: { rev: 20.825, revBefore: 18.881, op: 3.276, net: 2.990, assets: 45.058, liab: 19.693 },
    now: { rev: 5.595, net: -10.236 },
    note: "큰 배를 많이 가지고 있어서, 손님이 없어도 배를 관리하는 돈이 계속 나가요.",
  },
  XOM: {
    fy: "12월 결산",
    eps: 3.36, sharesM: 4232.2, // 희석 EPS(달러), 희석 가중평균 주식수(백만 주) — 가격 데이터와 같은 분할 기준
    src: "0000034088-20-000016",
    // 엑슨모빌은 영업이익(OperatingIncomeLoss)을 따로 공시하지 않아서 비워 둠
    prev: { rev: 255.583, revBefore: 279.332, op: null, net: 14.340, assets: 362.597, liab: 163.659 },
    now: { rev: 178.574, net: -22.440 },
    note: "석유값이 오르면 많이 벌고, 내리면 적게 벌어요. 실적이 석유값을 따라가요.",
  },
};
