// 숏츠 편집기의 순수 계산(문장 나누기, 장면 길이, 타임라인, 자막 끊기, 화면 움직임).
// DOM·오디오를 쓰지 않아 Node 테스트로 검증한다.
(function attachShortsEngine(root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  if (root) root.SHORTS_ENGINE = engine;
})(typeof window !== "undefined" ? window : globalThis, function createEngine() {
  const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const END_MARKS = ".!?…。！？";
  const CLOSERS = "\"'”’)]」』";

  /** 대본 → 문장 목록. 줄바꿈과 문장부호(뒤가 공백·끝일 때)에서 끊고, 3.5 같은 소수점은 끊지 않는다. */
  function splitSentences(text) {
    const out = [];
    String(text || "").split(/\r?\n+/).forEach((line) => {
      const src = line.trim();
      let current = "";
      for (let i = 0; i < src.length; i += 1) {
        current += src[i];
        if (!END_MARKS.includes(src[i])) continue;
        let j = i + 1;
        while (j < src.length && (END_MARKS.includes(src[j]) || CLOSERS.includes(src[j]))) { current += src[j]; j += 1; }
        if (j >= src.length || /\s/.test(src[j])) { out.push(current.trim()); current = ""; i = j - 1; }
        else i = j - 1;
      }
      if (current.trim()) out.push(current.trim());
    });
    return out.filter(Boolean);
  }

  /** 자막 끊기. maxChars <= 0 이면 통째로. 공백 단위로 채우고, 공백 없이 긴 낱말은 강제로 자른다. */
  function chunkText(text, maxChars) {
    const src = String(text || "").trim();
    if (!src) return [];
    if (!(maxChars > 0) || src.length <= maxChars) return [src];
    const chunks = [];
    let line = "";
    src.split(/\s+/).forEach((word) => {
      let rest = word;
      while (rest.length > maxChars) {
        if (line) { chunks.push(line); line = ""; }
        chunks.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      if (!rest) return;
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= maxChars) line += ` ${rest}`;
      else { chunks.push(line); line = rest; }
    });
    if (line) chunks.push(line);
    return chunks;
  }

  /** 목소리 파일이 없을 때의 읽는 시간 추정(초). */
  function estimateSpeechSeconds(text, rate, timing) {
    const n = String(text || "").replace(/\s/g, "").length;
    if (!n) return 0;
    const r = isNumber(rate) && rate > 0 ? rate : 1;
    return Math.max(timing.minSceneSeconds, n / (timing.charsPerSecond * r) + timing.speechPadSeconds);
  }

  /**
   * 장면 길이(초). 우선순위: 목소리 파일 길이 > 직접 정한 길이 > 글 읽기 추정 > 영상 구간 길이 > 정지 화면.
   * 거기에 "끝에 더 보여주기(hold)"를 더한다.
   */
  function sceneDuration(scene, info, timing) {
    let base;
    if (isNumber(info.voiceDuration) && info.voiceDuration > 0) base = info.voiceDuration;
    else if (isNumber(scene.duration) && scene.duration > 0) base = scene.duration;
    else if (scene.narrate && String(scene.text || "").trim()) base = estimateSpeechSeconds(scene.text, info.ttsRate, timing);
    else if (isNumber(info.clipSeconds) && info.clipSeconds > 0) base = info.clipSeconds;
    else base = timing.stillSeconds;
    const hold = isNumber(scene.hold) && scene.hold > 0 ? scene.hold : 0;
    return Math.max(timing.minSceneSeconds, base + hold);
  }

  /** 영상 구간(자르기). trimOut 이 null 이면 끝까지. 구간은 항상 [0, duration] 안에서 0.05초 이상. */
  function clipRange(scene, mediaDuration) {
    const d = isNumber(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0;
    const start = clamp(isNumber(scene.trimIn) ? scene.trimIn : 0, 0, Math.max(0, d - 0.05));
    const endRaw = isNumber(scene.trimOut) ? scene.trimOut : d;
    const end = clamp(endRaw, start + 0.05, Math.max(start + 0.05, d));
    return { start, end, length: end - start };
  }

  /**
   * 타임라인. 장면 5개 필드를 정리한다.
   * lookup.media(id) → { kind, duration } | null, lookup.voice(id) → { duration } | null
   * 화면을 고르지 않은 장면은 앞 장면 화면을 이어서 쓴다(holder = 화면을 정한 장면의 번호).
   */
  function buildTimeline(scenes, lookup, timing, ttsRate) {
    const items = [];
    let clock = 0;
    let holder = -1;
    scenes.forEach((scene, index) => {
      if (scene.mediaId && lookup.media(scene.mediaId)) holder = index;
      else if (scene.mediaId) holder = -1; // 지워진 파일
      const holderScene = holder >= 0 ? scenes[holder] : null;
      const media = holderScene ? lookup.media(holderScene.mediaId) : null;
      const voice = scene.voiceId ? lookup.voice(scene.voiceId) : null;
      const clip = media && media.kind === "video" ? clipRange(holderScene, media.duration) : null;
      const duration = sceneDuration(scene, { voiceDuration: voice ? voice.duration : null, clipSeconds: clip ? clip.length : null, ttsRate }, timing);
      items.push({ index, scene, start: clock, end: clock + duration, duration, holder, mediaId: media ? holderScene.mediaId : null, media, clip });
      clock += duration;
    });
    return { items, total: clock };
  }

  /** 시간 t(초)가 속한 장면. 끝 시각은 마지막 장면에 포함한다. */
  function sceneAt(timeline, t) {
    const { items, total } = timeline;
    if (!items.length) return null;
    const time = clamp(t, 0, total);
    for (let i = 0; i < items.length; i += 1) if (time < items[i].end) return items[i];
    return items[items.length - 1];
  }

  /** 장면 안의 원본 영상 위치(초). 화면을 이어 쓰는 장면은 화면을 정한 장면부터 이어서 재생한 위치. 끝나면 마지막 프레임에서 멈춘다. */
  function sourceTime(timeline, item, t) {
    if (!item.clip) return 0;
    const start = timeline.items[item.holder].start;
    return clamp(item.clip.start + (t - start), item.clip.start, item.clip.end);
  }

  /** 화면 움직임. p 는 장면 안 진행(0~1). scale 은 배율, tx·ty 는 화면 크기 대비 이동 비율. */
  function motionTransform(motion, p) {
    const q = clamp(p, 0, 1);
    switch (motion) {
      case "zoomIn": return { scale: 1 + 0.15 * q, tx: 0, ty: 0 };
      case "zoomOut": return { scale: 1.15 - 0.15 * q, tx: 0, ty: 0 };
      case "panLeft": return { scale: 1.12, tx: 0.04 - 0.08 * q, ty: 0 };
      case "panRight": return { scale: 1.12, tx: -0.04 + 0.08 * q, ty: 0 };
      default: return { scale: 1, tx: 0, ty: 0 };
    }
  }

  /** 원본을 화면 칸에 맞추는 사각형. fit: "cover"(가득 채움) | "contain"(전체 보임). */
  function fitRect(srcW, srcH, dstW, dstH, fit) {
    if (!(srcW > 0 && srcH > 0)) return { dx: 0, dy: 0, dw: dstW, dh: dstH };
    const scale = fit === "contain" ? Math.min(dstW / srcW, dstH / srcH) : Math.max(dstW / srcW, dstH / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    return { dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
  }

  /**
   * 장면 안 시각 local(초)에 보일 자막 조각. 글자 수에 비례해 말하는 구간(speakSeconds)을 나눈다.
   * 말하는 구간이 끝난 뒤(끝에 더 보여주기)에는 마지막 조각을 유지한다.
   */
  function subtitleAt(text, local, speakSeconds, maxChars) {
    const chunks = chunkText(text, maxChars);
    if (!chunks.length) return "";
    if (chunks.length === 1) return chunks[0];
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const span = speakSeconds > 0 ? speakSeconds : 1;
    let acc = 0;
    for (let i = 0; i < chunks.length; i += 1) {
      acc += (chunks[i].length / total) * span;
      if (local < acc) return chunks[i];
    }
    return chunks[chunks.length - 1];
  }

  /** 장면이 말하는 구간 길이(자막 분배용): 전체 길이에서 hold 를 뺀다. */
  function speakSeconds(item) {
    const hold = isNumber(item.scene.hold) && item.scene.hold > 0 ? item.scene.hold : 0;
    return Math.max(0, item.duration - hold);
  }

  /** 소리 일정: 목소리 파일, 효과음의 시작 시각(타임라인 초). from 이후에 시작하는 것만 돌려준다(재생 시작 위치용). */
  function audioPlan(timeline, from) {
    const events = [];
    timeline.items.forEach((item) => {
      const s = item.scene;
      if (s.voiceId) {
        const at = item.start;
        if (at + item.duration > from) events.push({ type: "voice", id: s.voiceId, at, offset: Math.max(0, from - at), sceneIndex: item.index });
      }
      if (s.sfxId) {
        const at = item.start + (isNumber(s.sfxDelay) && s.sfxDelay > 0 ? s.sfxDelay : 0);
        if (at >= from) events.push({ type: "sfx", id: s.sfxId, at, volume: isNumber(s.sfxVolume) ? s.sfxVolume : 0.8, sceneIndex: item.index });
      }
    });
    return events;
  }

  /** 내보내기 파일 이름: shorts-20261014-1530 */
  function exportName(date) {
    const p = (n) => String(n).padStart(2, "0");
    return `shorts-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  }

  function defaultScene(text) {
    return {
      id: `s${Math.random().toString(36).slice(2, 9)}`, text: text || "", mediaId: null, trimIn: 0, trimOut: null,
      duration: null, hold: 0, narrate: true, showSub: true, motion: "none", dim: 0, fit: "cover", videoVolume: 1,
      voiceId: null, sfxId: null, sfxVolume: 0.8, sfxDelay: 0
    };
  }

  return { splitSentences, chunkText, estimateSpeechSeconds, sceneDuration, clipRange, buildTimeline, sceneAt, sourceTime, motionTransform, fitRect, subtitleAt, speakSeconds, audioPlan, exportName, defaultScene };
});
