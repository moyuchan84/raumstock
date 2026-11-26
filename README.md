# 라움스톡 (Raumstock)

아이와 함께 실제 과거 시장 데이터로 투자를 게임처럼 배우는 앱 — 컨셉 프로토타입 단계

- 컨셉: [docs/CONCEPT.md](docs/CONCEPT.md)
- 전체 기획서: [docs/PLANNING.md](docs/PLANNING.md)
- 아트 & 출시 계획: [docs/ART_AND_RELEASE.md](docs/ART_AND_RELEASE.md)
- 프로토타입: `node scripts/serve.mjs` 후 http://localhost:5179 (VS Code에서는 F5 → "Prototype (Chrome)")
  - `index.html` — 투자 아카데미: 스토리 챕터 1~7장 + 증권앱(MTS) 화면, 실제 2020년 일별 가격
  - `kid.html` — 🧒 꼬마 탐험가(7~9세): 그림 영상 3편(주식이 뭐야? · 값은 왜 바뀔까? · 어른들은 이렇게 사요) + 🏫 라우의 투자 학교 8편(이익 · 재무제표 · 차트 · 시가총액/PER · 금리 · 환율 · 물가 · 투자 습관, 편마다 퀴즈) + 🔐 어른도 잘 모르는 투자 비밀 8편(호가·시장가/지정가 · 수수료·세금 · 반 토막 · 복리 · 적립식 · 액면분할·상장 · 마음의 함정 · 시장 규칙·지수) + 📖 투자 말 사전 43개 + 🔍 겪어 보기 4개(`kid-lab.js`: 가게 실력과 값표 · 싼 걸까 비싼 걸까 · 개별 주식과 S&P 500 · 언제 팔까, 맞히기 보상 없음) + 동전 10개로 떠나는 2020년 여행 6구간(실제 일별 가격). 부엉이 라우가 소리로 읽어 줌(`speak.js`, 브라우저 내장 음성). Gemini 그림으로 바꾸는 방법: [docs/KID_IMAGES.md](docs/KID_IMAGES.md)
  - 시작 화면(스플래시)에서 모드 선택: 스토리 · 스테이지 · 랜덤 도전 · 실전 훈련
  - `stage.js` — 스테이지: ⏳ 타임머신 실제 14개(1987 블랙 먼데이 ~ 2023 AI 랠리, 한국 동학개미 포함) + 가상 7개(시나리오 엔진), 랜덤(실제 구간 무작위 + 연도 맞히기 / 가상 시나리오 무작위)
  - `train.js` — 실전 훈련: 진실과 오해, 차트 읽기, 선택의 순간
  - `free.html` — 8장 자유 투자: 주 단위 1년, ETF·채권·금·원유, 자산배분, 시장의 4계절, 신용
- 배포: https://raumstock.vercel.app (Vercel poc 팀 `raumstock` 프로젝트, 이 브랜치에 푸시하면 자동 배포)
- 데이터: `data/raw/` (출처는 [data/SOURCES.md](data/SOURCES.md)). `node scripts/build-data.mjs` → `prototype/data.js`(주간), `node scripts/build-daily.mjs` → `prototype/daily.js`(일별). 역사 스테이지 데이터는 `node scripts/fetch-stages.mjs` → `prototype/stages-real.js`
- 3D 일러스트: `prototype/art3d.js`(three.js). 챕터 표지는 `node scripts/render-covers.mjs`로 다시 렌더링 → `prototype/img/cover-*.webp` (Microsoft Edge 필요). 홈의 마켓 시티는 실시간 3D
