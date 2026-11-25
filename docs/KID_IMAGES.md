# 꼬마 탐험가 그림 영상 — Gemini 그림 주문서

`prototype/kid.html`의 그림 영상 3편은 `prototype/img/kid/<이름>.webp` 그림 14장을 써요 (2026-11-25, Gemini 웹 앱에서 한 대화로 생성 — 라우 기준 그림을 먼저 만들고 같은 대화에서 장면을 이어 요청해 모습을 맞춤).
목록은 `prototype/img/kid/list.js`에 있고, 목록에 없는 장면은 코드로 그린 기본 그림(SVG·이모지 애니메이션)으로 보여 줘요.

그림을 다시 만들거나 바꾸는 방법:
- **API로:** `node scripts/gen-kid-images.mjs [g1-2 ...] [--force]` → 만들고, webp로 바꾸고, `list.js`까지 다시 씀. 단 2026-11 현재 `.env`의 무료 등급 키는 이미지 모델 할당량이 0이라 결제 등급 키가 필요해요.
- **Gemini 웹에서 받은 PNG로:** `.cache/kid-art/<이름>.png`로 저장한 뒤 `node scripts/gen-kid-images.mjs none` → 변환과 목록만 다시 함.

투자 학교 4~11편(g4~g11)은 아직 Gemini 그림이 없어 코드로 그린 장면(계산표 · 재무상태표 막대 · 진짜 2020년 차트 · 촛불 막대 · 시소 · 환전 카드)으로 보여 줘요. 같은 이름 규칙(`g4-1.webp` …)으로 그림을 넣고 `list.js`에 추가하면 그 장면만 그림으로 바뀌어요. 단 숫자가 나오는 장면(계산표 · 차트)은 코드 그림이 더 정확해요.

자막과 목소리는 코드가 넣으니 **그림 속에 글자를 넣지 않아요** (AI 그림의 한글은 자주 깨져요).

## 공통 스타일 (모든 프롬프트 앞에 붙이기)

```
Children's picture-book illustration for 7–9 year olds, flat 2D sticker style,
thick rounded dark-navy (#16223d) outlines, solid offset drop shadows, no gradients,
palette: sky blue #dff0ff, sunflower yellow #ffc83d, mint #1f9e7f, pink #ff9bb3, tomato red #e5383b.
Warm, friendly, simple shapes, lots of empty space, 4:3 landscape. No text, no letters, no numbers, no logos.
Recurring character "Rau": a round brown owl with a cream belly, a mint-green scarf, and a small clock on its belly.
```

## 1편 · 주식이 뭐야?

| 이름 | 자막 | 그림 프롬프트 |
|---|---|---|
| g1-1 | 여기 맛있는 피자 가게가 있어요 | A cheerful small pizza shop with a red-and-white striped awning, a big pizza in the window, four happy customers lining up at the door. Rau the owl waves from the side. |
| g1-2 | 가게를 여러 조각으로 나눴어요 = 주식 | A whole pizza seen from above, cut into 8 slices that are slightly pulled apart; one slice glows with a golden outline. Rau points at the glowing slice. |
| g1-3 | 조각을 사면 작은 주인 | A smiling child holding one pizza slice proudly, a small golden crown floating above their head, the pizza shop in the background. |
| g1-4 | 장사를 잘하면 값이 올라요 | The pizza shop very busy with a long queue; a pizza slice on a little podium grows bigger with a red upward arrow beside it. |
| g1-5 | 장사가 안 되면 내려가요 | The same shop on a rainy day, almost empty; the pizza slice on the podium shrinks, with a blue downward arrow beside it. Rau looks a little worried. |

## 2편 · 값은 왜 바뀔까?

| 이름 | 자막 | 그림 프롬프트 |
|---|---|---|
| g2-1 | 갖고 싶은 사람이 많으면 값이 올라요 | Many people raising their hands eagerly toward one golden pizza slice on a stand; a simple red line chart rising in the sky behind them. |
| g2-2 | 팔고 싶은 사람이 많으면 내려가요 | People walking away from a stand, shaking their heads, holding slices out to sell; a simple blue line chart falling behind them. |
| g2-3 | 뉴스 → 마음 → 값 | A newspaper flying through the air; thought bubbles above a crowd show a scared face, a heart, and a question mark. |
| g2-4 | 내일은 아무도 몰라요 | Rau the owl shrugging with a puzzled face, big question marks floating around, a foggy road ahead. |

## 3편 · 어른들은 이렇게 사요

| 이름 | 자막 | 그림 프롬프트 |
|---|---|---|
| g3-1 | 어른들은 증권 앱으로 사고팔아요 | A parent and child sitting together on a sofa looking at a smartphone; the phone screen shows a simple list of rows with small red and blue triangles (no readable text). |
| g3-2 | 빨강 ▲ 올랐어요, 파랑 ▼ 내렸어요 | A giant friendly red upward triangle and a giant blue downward triangle as cute characters with faces, standing next to a smartphone. |
| g3-3 | 사기 · 팔기 버튼 | A close-up of a hand-drawn smartphone with two big rounded buttons at the bottom, one red and one blue, a child's finger about to tap the red one. |
| g3-4 | 동전 10개로 연습해요 | Ten shiny gold coins in a neat row next to a pink piggy bank; Rau holds one coin up happily. |
| g3-5 | 타임머신 타고 2020년으로! | A whimsical brass time machine with a big clock face, Rau and a child sitting inside, swirling stars and calendar pages flying past. |

> 그림에는 회사 로고나 실제 앱 화면을 따라 그리지 않아요. 실제 회사 이름은 게임 화면의 글자로만 보여 줘요.
