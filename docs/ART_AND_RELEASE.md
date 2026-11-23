# 라움스톡 아트 & 출시 계획 v0.1

> 목표: 컨셉 프로토타입(`prototype/`)을 **앱스토어·구글플레이에 올릴 수 있는 완성도**로 만든다.
> 그림은 Gemini 이미지 모델(Nano Banana 계열 / Imagen)로 만들고, 사람이 다듬어 일관성을 맞춘다.

---

## 1. 아트 디렉션 (아트 바이블)

### 세계관
- **타임머신 = "돼지저금통 열기구"**: 동전 투입구가 있는 분홍 저금통 모양 열기구를 타고 '비밀의 해'로 간다.
- **안내자 마스코트 "라우"**: 동그란 아기 부엉이. 배에 회중시계 무늬가 있고, 탐험가 스카프를 맨다. 시장 기분에 따라 표정이 바뀐다.
- **플레이어**: 아이가 고르는 탐험대원 아바타 4종 (성별·피부색 다양하게, 탐험 조끼 공통).

### 스타일 규칙
| 항목 | 규칙 |
|---|---|
| 화풍 | 플랫 2.5D 벡터풍 일러스트, 부드러운 그라데이션 1단계, **굵고 둥근 남색 외곽선** (프로토타입 스티커 스타일과 통일) |
| 팔레트 | 하늘 `#E6F0FA` · 잉크 `#16223D` · 해바라기 `#FFC83D` · 민트 `#1F9E7F` · 상승 빨강 `#D33131` · 하락 파랑 `#2360C4` · 저금통 분홍 `#FF9BB3` |
| 빛 | 왼쪽 위 광원, 그림자는 단색 오프셋 (사실적 그림자 금지) |
| 표현 금지 | 실제 회사 로고·상표, 실존 인물 얼굴, 아픈 사람·병원·무기·폭발 장면, 돈다발·카지노·슬롯머신 이미지 (도박 연상) |
| 텍스트 | 그림 안에 글자 넣지 않기 (글자는 앱에서 렌더링 → 번역·수정 쉬움) |

### 코로나·전쟁 같은 소재 처리
아이 대상이므로 **상징으로만** 표현: 바이러스 → 작은 회색 구름 캐릭터, 봉쇄 → 문 닫힌 상점가와 창문 안 가족, 중동 긴장 → 출렁이는 석유 드럼통.

---

## 2. 필요한 그림 목록

| # | 묶음 | 수량 | 크기/형식 | 용도 |
|---|---|---|---|---|
| A | 앱 아이콘 | 1 (+시안 3) | 1024×1024 PNG, 투명 X | 스토어·홈 화면 |
| B | 라우 캐릭터 시트 | 표정·포즈 10 | 2048 정사각, 투명 배경 | 안내, 결과, 튜토리얼 |
| C | 시장 기분 5단계 | 5 | 1024, 투명 | 😊🙂😟😨😱 이모지 대체 |
| D | 상품 아이콘 | 15 + 분류 6 | SVG 권장 (AI 생성 후 벡터화) | 시장 목록 |
| E | 뉴스 삽화 | 핵심 사건 15 | 1536×1024 | 신문 카드 |
| F | 시나리오 표지 / 연도 공개 | 2 | 2048×1365 | 시작·엔딩 |
| G | 배지 | 6 (+추가 시나리오별) | 1024, 투명 | 업적 |
| H | 온보딩 | 4 | 1290×2796 세로 | 첫 실행 |
| I | 레벨업·해금 카드 | 3 | 1024 | Lv2·Lv3 해금 |
| J | 스토어 이미지 | 아이폰 6~8, 아이패드 6, 플레이 피처 그래픽 1 | 1320×2868 / 2064×2752 / 1024×500 | 스토어 등록 |

총 **약 70~80장** (시안 포함 생성은 그 3~5배).

---

## 3. Gemini 프롬프트 팩

### 3.1 공통 스타일 블록 (모든 프롬프트 앞에 붙임)
```
STYLE: friendly flat 2.5D vector illustration for a children's educational app,
thick rounded dark-navy (#16223D) outlines, soft single-step gradients,
solid offset shadows (no realistic shading), light from top-left,
palette: sky blue #E6F0FA, sunflower yellow #FFC83D, mint #1F9E7F,
piggy pink #FF9BB3, red #D33131, blue #2360C4.
Clean shapes, high readability at small sizes. No text, no letters,
no logos, no brand marks, no real people.
```

### 3.2 캐릭터 고정 (먼저 1장 확정 → 이후 모든 생성에 참조 이미지로 첨부)
```
CHARACTER SHEET: "Rau", a round baby owl mascot, big friendly eyes,
a pocket-watch pattern on its cream belly, small yellow explorer scarf,
stubby wings that work like hands. Show front, 3/4, side, back views
on a plain white background, consistent proportions (2 heads tall).
```
이후 프롬프트는 "Use the attached Rau character sheet exactly; keep proportions, colors and scarf." 로 시작.

### 3.3 예시 프롬프트
| 그림 | 프롬프트 (STYLE 블록 뒤에) |
|---|---|
| 앱 아이콘 | `App icon: a pink piggy-bank hot-air balloon rising over a small rising line chart, Rau peeking from the basket, centered, bold simple silhouette, sky-blue background, no text.` |
| 라우-기쁨 | `Rau jumping with both wings up, sparkles, transparent background.` |
| 라우-걱정 | `Rau hugging its pocket-watch belly, small sweat drop, worried eyebrows, transparent background.` |
| 시장기분-공포 | `Weather metaphor for a scared market: dark storm cloud with nervous face, small lightning, Rau holding an umbrella underneath, transparent background.` |
| 시장기분-평온 | `Calm market weather: smiling sun over gentle green hills, Rau lying on the grass relaxed.` |
| 상품-채권 | `Icon: a classical government building with a ribbon-tied paper promise scroll, simple, 512px readable.` |
| 상품-원유 | `Icon: a cute oil barrel with a small droplet, simple.` |
| 뉴스-금리인하 | `A central bank building lowering a big dial labeled only with an arrow down, coins gently flowing out to small houses, calm mood.` |
| 뉴스-원유 마이너스 | `Overflowing oil storage tanks with barrels piled up, a confused oil barrel character holding an empty price tag, humorous not scary.` |
| 뉴스-집콕 | `Cozy apartment cross-section: family members on video calls, kids studying on tablets, delivery boxes at the door.` |
| 뉴스-백신 발표 | `Hopeful scene: a glowing shield over a city, airplanes and a cruise ship starting to move again, sunrise colors.` |
| 연도 공개 | `Piggy-bank balloon landing, a big calendar page flying open (blank, no numbers), confetti, Rau cheering.` |
| 배지-폭풍 속 버티기 | `Round badge: Rau standing firm in rain holding a small sapling, gold rim.` |

### 3.4 일관성 유지 요령
1. 캐릭터 시트·아이콘 1장을 먼저 확정하고, **이후 모든 요청에 참조 이미지로 같이 넣기** (Gemini는 여러 장 이미지 입력 가능).
2. 프롬프트·시드·결과를 `art/log.csv`에 기록 → 같은 묶음은 같은 날 한 번에 생성.
3. 묶음마다 4~8장 생성 → 베스트 1장 고르기 → 배경 제거 → 색을 팔레트 값으로 보정.
4. **아이콘(D)·배지(G)는 벡터화**(Illustrator 이미지 추적, Figma 플러그인 등)해서 SVG로 → 작은 크기에서도 선명.
5. 마스코트 애니메이션은 확정 그림을 바탕으로 **Rive** 또는 **Lottie**로 따로 제작 (눈 깜빡임, 점프, 우산 쓰기).

### 3.5 저작권·표기
- Gemini로 만든 이미지는 Google 약관상 상업적으로 쓸 수 있지만, AI 생성물만으로는 저작권 보호가 약할 수 있습니다. **마스코트처럼 브랜드 핵심 자산은 사람이 다듬어 최종본을 만들어 두는 것**을 권장합니다.
- 스토어에 올린 그림이 실제 회사 로고와 닮지 않았는지 마지막에 한 번 더 확인합니다.

---

## 4. 앱 개발 방향

| 영역 | 선택 | 이유 |
|---|---|---|
| 앱 | **Expo (React Native) + TypeScript** | iOS·Android 한 번에, 프로토타입 로직(app.js) 재사용 |
| 차트 | react-native-skia 기반 (victory-native) | 부드러운 애니메이션, 뉴스 핀 |
| 애니메이션 | Rive (마스코트), Reanimated (화면) | 아이가 반응을 바로 느낌 |
| 데이터 | 시나리오를 앱에 **내장** (JSON) | 오프라인 플레이, 서버 비용 0 |
| 저장 | 기기 안에만 저장 (AsyncStorage/SQLite) | 개인정보 수집 0 → 아동 심사가 쉬워짐 |
| 계정·서버 | **첫 출시엔 없음** | 가족 대결·동기화는 v1.1 이후 |
| 분석·광고 SDK | **넣지 않음** | Apple 키즈 카테고리·구글 가족 정책 요건 |

### 출시 전에 꼭 바꿀 것 (프로토타입 → 앱)
- 가격 데이터를 **상업 이용 가능한 출처**로 교체 (`data/SOURCES.md` 참고)
- 실제 회사 이름은 텍스트로만 표기, 로고 미사용, "투자 권유 아님" 고지
- 부모 영역(설정, 외부 링크, 결제)에 **부모 확인 장치(parental gate)**: 예) "37 × 2는?" 같은 어른용 문제

---

## 5. 스토어 출시 체크리스트

### 공통
- [ ] 앱 이름·부제 (예: 라움스톡 – 우리 아이 첫 투자 탐험)
- [ ] 개인정보처리방침 URL (수집 항목 "없음"이어도 필요)
- [ ] 연령 등급 설문, 카테고리: **교육** (게임 카테고리로 낼 경우 국내 게임물 등급 절차 확인 필요)
- [ ] 스크린샷·피처 그래픽 (2장 J 묶음)
- [ ] 유료 판매·인앱결제 시 사업자등록·통신판매업 신고 확인

### Apple App Store
- [ ] Apple Developer Program 가입 (연 $99)
- [ ] 키즈 카테고리 선택 시: 서드파티 광고·분석 금지, 외부 링크·결제 전에 부모 확인
- [ ] App Privacy(개인정보 라벨) "데이터 수집 안 함"
- [ ] TestFlight로 가족·지인 베타

### Google Play
- [ ] 개발자 계정 ($25, 1회)
- [ ] **신규 개인 계정은 공개 출시 전에 비공개 테스트(테스터 12명 이상, 14일) 필수**
- [ ] 타깃 연령에 아동 포함 → 가족 정책 준수, 데이터 보안 양식 작성

---

## 6. 일정 (안)

| 주차 | 그림 | 앱 |
|---|---|---|
| 1 | 아트 바이블 확정, 라우 캐릭터 시트·앱 아이콘 시안 | Expo 프로젝트, 프로토타입 로직 이식 |
| 2~3 | 시장 기분·상품 아이콘·배지·온보딩 | 화면 구현 (홈·시장·상세·결과·엔딩) |
| 4~5 | 뉴스 삽화 15장, Rive 마스코트 애니메이션 | 차트·애니메이션·사운드, 부모 확인 장치 |
| 6 | 스토어 스크린샷·피처 그래픽 | 아이와 플레이테스트 → 수정 |
| 7~8 | — | TestFlight / Play 비공개 테스트(14일) → 심사 제출 |

### 비용 감 (대략, 실제 요금은 Google 가격표 확인)
- Gemini 이미지 생성: 장당 수십~수백 원 수준 → 시안 300~400장 생성해도 수만~십수만 원대
- 개발자 계정: Apple 연 $99 + Google $25
- 선택: 마스코트 최종 보정·Rive 애니메이션 외주
