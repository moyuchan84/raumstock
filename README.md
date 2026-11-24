# 라움스톡 (Raumstock)

아이와 함께 실제 과거 시장 데이터로 투자를 게임처럼 배우는 앱 — 컨셉 프로토타입 단계

- 컨셉: [docs/CONCEPT.md](docs/CONCEPT.md)
- 전체 기획서: [docs/PLANNING.md](docs/PLANNING.md)
- 아트 & 출시 계획: [docs/ART_AND_RELEASE.md](docs/ART_AND_RELEASE.md)
- 프로토타입: `node scripts/serve.mjs` 후 http://localhost:5179 (VS Code에서는 F5 → "Prototype (Chrome)")
  - `index.html` — 투자 아카데미: 스토리 챕터 1~7장 + 증권앱(MTS) 화면, 실제 2020년 일별 가격
  - 시작 화면(스플래시)에서 모드 선택: 스토리 · 스테이지 · 랜덤 도전 · 실전 훈련
  - `stage.js` — 스테이지: ⏳ 타임머신 실제 14개(1987 블랙 먼데이 ~ 2023 AI 랠리, 한국 동학개미 포함) + 가상 7개(시나리오 엔진), 랜덤(실제 구간 무작위 + 연도 맞히기 / 가상 시나리오 무작위)
  - `train.js` — 실전 훈련: 진실과 오해, 차트 읽기, 선택의 순간
  - `free.html` — 8장 자유 투자: 주 단위 1년, ETF·채권·금·원유, 자산배분, 시장의 4계절, 신용
- 배포: https://raumstock.vercel.app (Vercel poc 팀 `raumstock` 프로젝트, 이 브랜치에 푸시하면 자동 배포)
- 데이터: `data/raw/` (출처는 [data/SOURCES.md](data/SOURCES.md)). `node scripts/build-data.mjs` → `prototype/data.js`(주간), `node scripts/build-daily.mjs` → `prototype/daily.js`(일별). 역사 스테이지 데이터는 `node scripts/fetch-stages.mjs` → `prototype/stages-real.js`
- 3D 일러스트: `prototype/art3d.js`(three.js). 챕터 표지는 `node scripts/render-covers.mjs`로 다시 렌더링 → `prototype/img/cover-*.webp` (Microsoft Edge 필요). 홈의 마켓 시티는 실시간 3D
