// 소리 읽기
// 1) 미리 만든 자연스러운 음성(voice/*.mp3, scripts/gen-kid-voice.mjs가 만듦)을 먼저 틀고
// 2) 음성 파일이 없는 문장만 브라우저 내장 Web Speech API로 읽어요.
// RAUM_SPEAK.say(html | [html, ...], { onstart(ms), onend }) · stop() · on / setOn(bool) · supported
// 배열은 문장 조각을 차례로 읽어요 (퀴즈처럼 보기 순서가 바뀌어도 조각 파일을 다시 쓸 수 있게).
window.RAUM_SPEAK = (() => {
  const synth = window.speechSynthesis;
  const canSynth = !!synth && typeof SpeechSynthesisUtterance !== "undefined";
  const clips = () => window.RAUM_VOICE || {}; // { 열쇠: 길이(ms) }
  const player = typeof Audio !== "undefined" ? new Audio() : null; // 하나를 계속 써야 휴대폰에서 이어 재생돼요
  const supported = canSynth || !!player;
  const KEY = "raum-speak";
  let on = localStorage.getItem(KEY) !== "0";
  let voice = null;

  function pickVoice() {
    const ko = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
    // 자연스러운 목소리(Google·Microsoft 온라인 음성)를 먼저 고름
    voice = ko.find((v) => /google/i.test(v.name)) || ko.find((v) => /natural|online|sunhi|heami/i.test(v.name)) || ko[0] || null;
  }
  if (canSynth) { pickVoice(); synth.addEventListener?.("voiceschanged", pickVoice); }

  // 화면용 HTML → 읽을 글. 음성 만들 때(Node)도 같은 함수를 쓰므로 DOM 없이 처리해요.
  const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', nbsp: " " };
  const plain = (html) => String(html)
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&(amp|lt|gt|quot|nbsp);/g, (_, e) => ENT[e])
    .replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ").trim();
  // 음성 파일 이름 (읽을 글의 해시)
  const keyOf = (text) => {
    let a = 0x811c9dc5, b = 0x1000193;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x85ebca6b); }
    return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
  };

  let token = 0;
  function say(content, opts = {}) {
    stop();
    const parts = [].concat(content).map(plain).filter(Boolean);
    if (!supported || !on || !parts.length) { opts.onend?.(false); return; }
    const my = token;
    const end = (ok) => { if (my === token) opts.onend?.(ok); };
    const keys = parts.map(keyOf);
    if (player && keys.every((k) => clips()[k])) playClips(parts, keys, my, opts, end);
    else speakSynth(parts.join(". "), opts, end);
  }
  function playClips(parts, keys, my, opts, end) {
    opts.onstart?.(keys.reduce((a, k) => a + clips()[k], 0));
    let i = 0;
    const next = () => {
      if (my !== token) return;
      if (i >= keys.length) return end(true);
      // 파일을 못 받으면 남은 부분은 내장 음성으로. 자동 재생이 막힌 경우는 조용히 넘어가요.
      let failed = false;
      const fail = () => { if (failed || my !== token) return; failed = true; speakSynth(parts.slice(i).join(". "), opts, end); };
      player.onended = () => { i++; next(); };
      player.onerror = fail;
      player.src = `voice/${keys[i]}.mp3`;
      player.play()?.catch((e) => {
        if (e.name === "NotAllowedError") end(false);
        else if (e.name !== "AbortError") fail();
      });
    };
    next();
  }
  function speakSynth(text, opts, end) {
    if (!canSynth) return end(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; if (voice) u.voice = voice;
    u.rate = opts.rate || 0.95; u.pitch = opts.pitch || 1.1;
    u.onend = () => end(true);
    u.onerror = () => end(false);
    synth.speak(u);
  }
  function stop() {
    token++;
    if (player) { player.onended = player.onerror = null; player.pause(); }
    if (canSynth) synth.cancel();
  }
  function setOn(v) { on = !!v; localStorage.setItem(KEY, on ? "1" : "0"); if (!on) stop(); }

  return { say, stop, setOn, get on() { return on; }, supported, plain, keyOf };
})();
