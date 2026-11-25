// 소리 읽기 (브라우저 내장 Web Speech API, 무료·오프라인 가능한 기기도 있음)
// RAUM_SPEAK.say(html, { onend }) · stop() · on / setOn(bool) · supported
window.RAUM_SPEAK = (() => {
  const synth = window.speechSynthesis;
  const supported = !!synth && typeof SpeechSynthesisUtterance !== "undefined";
  const KEY = "raum-speak";
  let on = localStorage.getItem(KEY) !== "0";
  let voice = null;

  function pickVoice() {
    if (!supported) return;
    const ko = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
    // 자연스러운 목소리(Google·Microsoft 온라인 음성)를 먼저 고름
    voice = ko.find((v) => /google/i.test(v.name)) || ko.find((v) => /natural|online|sunhi|heami/i.test(v.name)) || ko[0] || null;
  }
  if (supported) { pickVoice(); synth.addEventListener?.("voiceschanged", pickVoice); }

  const plain = (html) => {
    const d = document.createElement("div");
    d.innerHTML = String(html).replace(/<br\s*\/?>/gi, ". ");
    return d.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s+/g, " ").trim();
  };

  let token = 0;
  function say(html, opts = {}) {
    stop();
    const text = plain(html);
    if (!supported || !on || !text) { opts.onend?.(false); return; }
    const my = ++token;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; if (voice) u.voice = voice;
    u.rate = opts.rate || 0.95; u.pitch = opts.pitch || 1.1;
    u.onend = () => { if (my === token) opts.onend?.(true); };
    u.onerror = () => { if (my === token) opts.onend?.(false); };
    synth.speak(u);
  }
  function stop() { token++; if (supported) synth.cancel(); }
  function setOn(v) { on = !!v; localStorage.setItem(KEY, on ? "1" : "0"); if (!on) stop(); }

  return { say, stop, setOn, get on() { return on; }, supported, plain };
})();
