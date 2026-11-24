# 데이터 출처

`data/raw/`의 CSV는 실제 시장 데이터를 2019-06 ~ 2020-12 구간만 잘라 `Date,Close` 형식으로 맞춘 것입니다.
`node scripts/build-data.mjs`를 실행하면 주 단위(주 마지막 거래일 종가)로 묶어 `prototype/data.js`를 만듭니다.

| 파일 | 내용 | 원 출처 |
|---|---|---|
| ZM, AMZN, AAL, CCL, XOM, AAPL, NFLX | 개별 주식 일별 종가 (분할 반영) | GitHub `Stonks/tickers` (Yahoo Finance 기반) |
| SPY, QQQ, EWY, XLE, TLT, SHY, GLD, USO | ETF 일별 수정 종가 (분할·배당 반영) | GitHub `fja05680/brownbear` symbol-cache (Yahoo Finance 기반) |
| WTI | WTI 원유 현물 일별 가격 (2020-04-20 −36.98 포함) | GitHub `datasets/oil-prices` (미국 EIA) |
| VIX | 변동성 지수 일별 종가 (→ "시장 기분") | GitHub `datasets/finance-vix` (CBOE) |
| US10Y_monthly | 미국 10년 국채금리 월 평균 | GitHub `datasets/s-and-p-500` (Shiller 데이터) |
| 미국 기준금리 | FOMC 결정값(상단) — `scripts/build-data.mjs`에 직접 입력 | 연방준비제도 발표 |

## 주의
- 프로토타입용입니다. 정식 출시 전에는 상업적 이용이 허락된 데이터(예: 한국투자증권·키움 OpenAPI, 한국거래소 정보데이터시스템, 한국은행 ECOS, FRED 등)로 교체하고 이용 약관을 확인해야 합니다.
- 원화 환산은 1달러 = 1,200원 고정값입니다 (2020년 실제 환율은 약 1,080~1,290원 사이에서 움직였음).
- 뉴스(`prototype/scenario-2020.js`)는 실제 사건을 초등학생 눈높이로 다시 쓴 것입니다.

## 회사 성적표 (`prototype/fin.js`)
- 7개 회사의 연간 매출·영업이익·순이익·자산·부채는 **SEC EDGAR XBRL companyfacts API**(`data.sec.gov/api/xbrl/companyfacts/CIK##########.json`)에서 각 회계연도 10-K 최초 제출본의 값을 가져왔습니다 (2026-11-24 확인, 단위: 미국 달러 10억).
- 매출은 `RevenueFromContractWithCustomerExcludingAssessedTax`(넷플릭스는 `Revenues`), 부채는 `Liabilities`가 없으면 자산 − 자본총계로 계산했습니다. 엑슨모빌은 영업이익 항목을 공시하지 않아 비워 두었습니다.
- 회사별 출처 10-K 접수번호는 `prototype/fin.js`의 `src`에 있습니다.
- 게임 중에는 탐험 직전 회계연도(2019년, 줌은 2020년 1월 결산)를 "작년 성적표"로, 마지막 공개 화면에서만 탐험한 해의 매출·순이익을 보여 줍니다.

## 시장의 4계절 (`prototype/scenario-2020.js`의 `seasons`)
- 우라가미 구니오의 주식시장 4계절(금융장세·실적장세·역금융장세·역실적장세)을 2020년에 적용한 것은 기획 판단입니다. 정답이 아니라 학습용 해석으로 표시합니다.
