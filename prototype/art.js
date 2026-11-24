// 라움스톡 일러스트 (인라인 SVG). 아트 바이블(docs/ART_AND_RELEASE.md) 스타일:
// 굵고 둥근 남색 외곽선, 단색 오프셋 그림자, 팔레트 하늘·해바라기·민트·분홍.
// Gemini로 만든 정식 그림이 나오면 같은 이름으로 교체할 수 있게 함수 단위로 나눠 둡니다.
window.RAUM_ART = (() => {
  const INK = "#16223d";
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const svg = (vb, body, cls = "") => `<svg viewBox="${vb}" class="art ${cls}" aria-hidden="true">${body}</svg>`;

  // 안내자 부엉이 "라우" — mood: happy | ok | worried | scared | proud
  function owl(mood = "ok") {
    const eyes = {
      happy: `<path d="M34 54 q10 -10 20 0" fill="none" ${S}/><path d="M66 54 q10 -10 20 0" fill="none" ${S}/>`,
      proud: `<path d="M34 54 q10 -10 20 0" fill="none" ${S}/><path d="M66 54 q10 -10 20 0" fill="none" ${S}/><path d="M22 34 l6 4 M98 34 l-6 4" ${S}/>`,
      ok: `<circle cx="44" cy="52" r="13" fill="#fff" ${S}/><circle cx="76" cy="52" r="13" fill="#fff" ${S}/><circle cx="46" cy="53" r="6" fill="${INK}"/><circle cx="78" cy="53" r="6" fill="${INK}"/><circle cx="48" cy="51" r="2" fill="#fff"/><circle cx="80" cy="51" r="2" fill="#fff"/>`,
      worried: `<circle cx="44" cy="54" r="12" fill="#fff" ${S}/><circle cx="76" cy="54" r="12" fill="#fff" ${S}/><circle cx="44" cy="57" r="5" fill="${INK}"/><circle cx="76" cy="57" r="5" fill="${INK}"/><path d="M32 38 l20 6 M88 38 l-20 6" ${S}/>`,
      scared: `<circle cx="44" cy="52" r="14" fill="#fff" ${S}/><circle cx="76" cy="52" r="14" fill="#fff" ${S}/><circle cx="44" cy="52" r="3.5" fill="${INK}"/><circle cx="76" cy="52" r="3.5" fill="${INK}"/><path d="M30 34 l18 -4 M90 34 l-18 -4" ${S}/>`,
    }[mood] || "";
    const beak = mood === "scared" ? `<ellipse cx="60" cy="70" rx="6" ry="7" fill="#ffb23d" ${S}/>` : `<path d="M53 64 L60 74 L67 64 Z" fill="#ffb23d" ${S}/>`;
    return svg("0 0 120 120", `
      <ellipse cx="64" cy="112" rx="36" ry="5" fill="${INK}" opacity=".18"/>
      <path d="M26 30 L34 12 L46 26 Z" fill="#a0785a" ${S}/><path d="M94 30 L86 12 L74 26 Z" fill="#a0785a" ${S}/>
      <ellipse cx="60" cy="66" rx="42" ry="44" fill="#a0785a" ${S}/>
      <ellipse cx="20" cy="74" rx="9" ry="20" fill="#8a6447" ${S} transform="rotate(12 20 74)"/>
      <ellipse cx="100" cy="74" rx="9" ry="20" fill="#8a6447" ${S} transform="rotate(-12 100 74)"/>
      <ellipse cx="60" cy="88" rx="26" ry="20" fill="#f3e3c3" ${S}/>
      <circle cx="60" cy="90" r="11" fill="#fff" ${S}/><path d="M60 90 V83 M60 90 h6" ${S}/>
      <path d="M30 70 q30 16 60 0 l2 8 q-32 16 -64 0 Z" fill="#1f9e7f" ${S}/>
      <path d="M80 76 l10 20 l-10 -2 z" fill="#1f9e7f" ${S}/>
      ${eyes}${beak}
      <path d="M44 108 v6 M52 108 v6 M68 108 v6 M76 108 v6" ${S}/>`, `owl owl-${mood}`);
  }

  // 돼지저금통 열기구 (3D가 안 될 때 대신 보여주는 그림)
  function balloon() {
    return svg("0 0 160 170", `
      <ellipse cx="84" cy="164" rx="34" ry="4" fill="${INK}" opacity=".15"/>
      <path d="M50 36 L40 10 L66 26 Z" fill="#ff9bb3" ${S}/><path d="M110 36 L120 10 L94 26 Z" fill="#ff9bb3" ${S}/>
      <ellipse cx="80" cy="62" rx="58" ry="50" fill="#ff9bb3" ${S}/>
      <path d="M40 40 q16 -16 36 -18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
      <rect x="68" y="12" width="24" height="7" rx="3" fill="${INK}"/>
      <ellipse cx="80" cy="72" rx="18" ry="13" fill="#ff7f9f" ${S}/>
      <ellipse cx="74" cy="72" rx="3" ry="4.5" fill="${INK}"/><ellipse cx="86" cy="72" rx="3" ry="4.5" fill="${INK}"/>
      <circle cx="58" cy="54" r="4.5" fill="${INK}"/><circle cx="102" cy="54" r="4.5" fill="${INK}"/>
      <ellipse cx="48" cy="70" rx="7" ry="4" fill="#ff7f9f" opacity=".8"/><ellipse cx="112" cy="70" rx="7" ry="4" fill="#ff7f9f" opacity=".8"/>
      <path d="M50 102 L64 132 M110 102 L96 132 M70 110 L70 132 M90 110 L90 132" ${S}/>
      <rect x="60" y="130" width="40" height="26" rx="5" fill="#c98b4f" ${S}/>
      <path d="M60 140 h40" ${S}/>
      <circle cx="134" cy="112" r="9" fill="#ffc83d" ${S}/><path d="M134 107 v10" ${S}/>`, "balloon");
  }

  // 시장의 4계절 바퀴 — current: spring|summer|autumn|winter
  function seasonWheel(current) {
    const Q = [
      { id: "spring", name: "봄", tag: "금융장세", fill: "#ffc2d4", icon: "🌸", a0: -90 },
      { id: "summer", name: "여름", tag: "실적장세", fill: "#ffe08a", icon: "☀️", a0: 0 },
      { id: "autumn", name: "가을", tag: "역금융장세", fill: "#ffb27a", icon: "🍂", a0: 90 },
      { id: "winter", name: "겨울", tag: "역실적장세", fill: "#bcd7f5", icon: "❄️", a0: 180 },
    ];
    const cx = 100, cy = 100, r = 84;
    const pt = (deg, rr) => [cx + rr * Math.cos((deg * Math.PI) / 180), cy + rr * Math.sin((deg * Math.PI) / 180)];
    const parts = Q.map((q) => {
      const [x1, y1] = pt(q.a0, r), [x2, y2] = pt(q.a0 + 90, r);
      const [lx, ly] = pt(q.a0 + 45, 52);
      const on = q.id === current;
      return `<g class="wq ${on ? "on" : ""}">
        <path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${q.fill}" ${S} ${on ? "" : 'opacity=".55"'}/>
        <text x="${lx}" y="${ly - 6}" text-anchor="middle" font-size="20">${q.icon}</text>
        <text x="${lx}" y="${ly + 14}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">${q.name}</text>
        <text x="${lx}" y="${ly + 28}" text-anchor="middle" font-size="9.5" fill="${INK}">${q.tag}</text></g>`;
    }).join("");
    const cur = Q.find((q) => q.id === current);
    const needle = cur ? (() => { const [nx, ny] = pt(cur.a0 + 45, 30); return `<path d="M${cx} ${cy} L${nx} ${ny}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`; })() : "";
    return svg("0 0 200 200", `${parts}
      <path d="M${cx + 92} ${cy - 30} a96 96 0 0 1 0 60" fill="none" ${S} marker-end="url(#wa)"/>
      <defs><marker id="wa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${INK}"/></marker></defs>
      ${needle}<circle cx="${cx}" cy="${cy}" r="10" fill="#ffc83d" ${S}/>`, "wheel");
  }

  // 배우기 카드용 작은 그림들
  const lessons = {
    stock: () => svg("0 0 120 90", `
      <rect x="22" y="22" width="76" height="58" rx="4" fill="#e6f0fa" ${S}/>
      <path d="M16 24 L60 6 L104 24 Z" fill="#ff8a5b" ${S}/>
      <rect x="34" y="34" width="14" height="14" fill="#fff" ${S}/><rect x="72" y="34" width="14" height="14" fill="#fff" ${S}/>
      <rect x="52" y="54" width="16" height="26" fill="#ffc83d" ${S}/>
      <path d="M98 50 l14 -6 l2 22 l-16 4 z" fill="#ffc83d" ${S}/>`),
    fin: () => svg("0 0 120 90", `
      <path d="M14 30 h92 l-8 -18 h-76 z" fill="#ffc83d" ${S}/>
      <path d="M30 12 v18 M46 12 v18 M62 12 v18 M78 12 v18 M94 12 v18" stroke="#fff" stroke-width="5"/>
      <path d="M14 30 h92 l-8 -18 h-76 z" fill="none" ${S}/>
      <rect x="20" y="30" width="80" height="50" fill="#fff" ${S}/>
      <rect x="20" y="58" width="80" height="22" fill="#4fb3a1" ${S}/>
      <path d="M42 38 h10 l-2 18 h-6 z" fill="#ffe08a" ${S}/>
      <rect x="66" y="40" width="6" height="14" fill="#ff8a5b" ${S}/><rect x="76" y="34" width="6" height="20" fill="#d33131" ${S}/><rect x="86" y="44" width="6" height="10" fill="#2360c4" ${S}/>`),
    rate: () => svg("0 0 120 90", `
      <path d="M50 80 L60 60 L70 80 Z" fill="#a98bff" ${S}/>
      <g transform="rotate(-14 60 58)"><rect x="12" y="54" width="96" height="8" rx="4" fill="#c98b4f" ${S}/>
      <rect x="16" y="30" width="26" height="24" rx="4" fill="#d33131" ${S}/><rect x="78" y="34" width="26" height="20" rx="4" fill="#4fb3a1" ${S}/></g>
      <text x="29" y="54" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" transform="rotate(-14 60 58)">금리</text>
      <text x="91" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" transform="rotate(-14 60 58)">채권</text>`),
    spread: () => svg("0 0 120 90", `
      ${[18, 60, 102].map((x, i) => `<ellipse cx="${x}" cy="42" rx="7" ry="9" fill="#fff" ${S}/><ellipse cx="${x + 8}" cy="44" rx="6" ry="8" fill="#ffe08a" ${S}/>
        <path d="M${x - 16} 48 h36 l-5 26 h-26 z" fill="${["#ff8a5b", "#ffc83d", "#4fb3a1"][i]}" ${S}/><path d="M${x - 10} 48 q12 -26 26 0" fill="none" ${S}/>`).join("")}`),
    mix: () => {
      const parts = [[0.4, "#ff8a5b"], [0.3, "#4fb3a1"], [0.15, "#ffc83d"], [0.15, "#a98bff"]];
      let a = -Math.PI / 2;
      const arcs = parts.map(([p, c]) => {
        const a2 = a + p * Math.PI * 2;
        const d = `M60 45 L${60 + 36 * Math.cos(a)} ${45 + 36 * Math.sin(a)} A36 36 0 ${p > 0.5 ? 1 : 0} 1 ${60 + 36 * Math.cos(a2)} ${45 + 36 * Math.sin(a2)} Z`;
        a = a2;
        return `<path d="${d}" fill="${c}" ${S}/>`;
      }).join("");
      return svg("0 0 120 90", `${arcs}<circle cx="60" cy="45" r="13" fill="#fff" ${S}/>`);
    },
    season: () => seasonWheel(null),
    seed: () => svg("0 0 120 90", `
      <ellipse cx="58" cy="54" rx="38" ry="28" fill="#ff9bb3" ${S}/>
      <path d="M30 34 l-4 -14 l14 8" fill="#ff9bb3" ${S}/>
      <rect x="48" y="25" width="18" height="5" rx="2" fill="#16223d"/>
      <ellipse cx="92" cy="56" rx="9" ry="8" fill="#ff7f9f" ${S}/>
      <circle cx="74" cy="46" r="3.5" fill="#16223d"/>
      <path d="M34 80 v6 M50 82 v6 M66 82 v6 M82 80 v6" ${S}/>
      <circle cx="57" cy="10" r="9" fill="#ffc83d" ${S}/><path d="M57 5 v10" ${S}/>`),
    margin: () => svg("0 0 120 90", `
      <ellipse cx="46" cy="32" rx="26" ry="22" fill="#ff9bb3" ${S}/>
      <path d="M30 50 l8 14 M62 50 l-8 14" ${S}/><rect x="34" y="62" width="24" height="14" rx="3" fill="#c98b4f" ${S}/>
      <path d="M58 70 C78 70 80 60 92 62" fill="none" ${S} stroke-dasharray="4 5"/>
      <path d="M86 58 h22 l6 26 h-34 z" fill="#56627c" ${S}/>
      <text x="97" y="78" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">빚</text>`),
  };

  return { owl, balloon, seasonWheel, lessons };
})();
