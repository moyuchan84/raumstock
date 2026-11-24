# 라움스톡 (Raumstock)

아이와 함께 실제 과거 시장 데이터로 투자를 게임처럼 배우는 앱 — 컨셉 프로토타입 단계

- 컨셉: [docs/CONCEPT.md](docs/CONCEPT.md)
- 전체 기획서: [docs/PLANNING.md](docs/PLANNING.md)
- 아트 & 출시 계획: [docs/ART_AND_RELEASE.md](docs/ART_AND_RELEASE.md)
- 프로토타입: `node scripts/serve.mjs` 후 http://localhost:5179 (VS Code에서는 F5 → "Prototype (Chrome)")
  - `index.html` — 투자 아카데미: 스토리 챕터 1~7장 + 증권앱(MTS) 화면, 실제 2020년 일별 가격
  - `free.html` — 8장 자유 투자: 주 단위 1년, ETF·채권·금·원유, 자산배분, 시장의 4계절, 신용
- 배포: https://raumstock.vercel.app (Vercel poc 팀 `raumstock` 프로젝트, 이 브랜치에 푸시하면 자동 배포)
- 데이터: `data/raw/` (출처는 [data/SOURCES.md](data/SOURCES.md)). `node scripts/build-data.mjs` → `prototype/data.js`(주간), `node scripts/build-daily.mjs` → `prototype/daily.js`(일별)
