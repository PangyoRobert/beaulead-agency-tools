// 숏츠 편집기 화면 로직. 영상·이미지·소리 파일은 브라우저 메모리에서만 다루고 어디에도 저장하거나 보내지 않는다.
(function () {
  const CONFIG = window.SHORTS_EDITOR_CONFIG;
  const E = window.SHORTS_ENGINE;
  const SFX = window.SHORTS_SFX;
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs, children) => {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "text") node.textContent = v;
      else if (k === "class") node.className = v;
      else if (v === true) node.setAttribute(k, "");
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    (children || []).forEach((c) => node.append(c));
    return node;
  };
  const uid = (p) => `${p}${Math.random().toString(36).slice(2, 9)}`;
  const fmt = (s) => { const m = Math.floor(s / 60); const r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, "0")}`; };

  const state = {
    ratioId: "9:16", outScale: 1, sub: { ...CONFIG.subtitleDefaults }, ttsRate: 1, ttsPitch: 1, ttsVoiceURI: "", ttsPreview: true,
    scenes: [], selected: -1, t: 0, playing: false, exporting: false, cancel: false
  };
  const media = new Map(); // id → { id, kind, name, url, el, duration, w, h, gain }
  const voices = new Map(); // id → { id, name, buffer, duration }
  const sfxFiles = new Map(); // id → { id, name, buffer }
  const userFonts = []; // { id, label, family }
  let audio = null; // { ctx, master, recDest, videoBus }
  let tlCache = null;
  let run = null; // 진행 중인 재생·내보내기
  const canvas = $("stage");
  const g = canvas.getContext("2d");

  // ---------- 타임라인 ----------
  const lookup = {
    media: (id) => (media.has(id) ? media.get(id) : null),
    voice: (id) => (voices.has(id) ? voices.get(id) : null)
  };
  const invalidate = () => { tlCache = null; };
  const timeline = () => tlCache || (tlCache = E.buildTimeline(state.scenes, lookup, CONFIG.timing, state.ttsRate));
  const ratio = () => CONFIG.ratios.find((r) => r.id === state.ratioId);

  function resizeCanvas() {
    const r = ratio();
    canvas.width = Math.round(r.w * state.outScale);
    canvas.height = Math.round(r.h * state.outScale);
    canvas.style.aspectRatio = `${r.w} / ${r.h}`;
    document.documentElement.style.setProperty("--stage-ratio", `${r.w} / ${r.h}`);
    $("stageWrap").dataset.portrait = r.h > r.w ? "1" : "0";
  }

  // ---------- 그리기 ----------
  function fontFamily(id) {
    const f = CONFIG.fonts.concat(userFonts).find((x) => x.id === id);
    return f ? f.family : CONFIG.fonts[0].family;
  }
  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    text.split("\n").forEach((para) => {
      let line = "";
      para.split(/(\s+)/).forEach((word) => {
        const test = line + word;
        if (line && ctx.measureText(test.trimEnd()).width > maxWidth) { lines.push(line.trimEnd()); line = word.trimStart(); }
        else line = test;
        while (ctx.measureText(line).width > maxWidth && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut -= 1;
          lines.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      });
      if (line.trim()) lines.push(line.trimEnd());
    });
    return lines;
  }
  function drawSubtitle(text) {
    const s = state.sub;
    const W = canvas.width;
    const H = canvas.height;
    const unit = Math.min(W, H) / 1080;
    const size = s.size * unit;
    g.save();
    g.font = `${s.weight} ${size}px ${fontFamily(s.font)}`;
    if ("letterSpacing" in g) g.letterSpacing = `${s.letterSpacing * unit}px`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const lines = wrapLines(g, text, W * 0.88);
    const lh = size * s.lineHeight;
    const top = H * s.y - (lh * lines.length) / 2 + lh / 2;
    if (s.box) {
      const widest = Math.max(...lines.map((l) => g.measureText(l).width));
      const padX = size * 0.45;
      const padY = size * 0.3;
      const bw = widest + padX * 2;
      const bh = lh * lines.length + padY * 2 - (lh - size);
      g.fillStyle = hexToRgba(s.boxColor, s.boxOpacity);
      roundRect(g, W / 2 - bw / 2, top - lh / 2 - padY + (lh - size) / 2, bw, bh, size * 0.3);
      g.fill();
    }
    g.shadowColor = s.shadowColor;
    g.shadowBlur = s.shadowBlur * unit;
    g.fillStyle = s.color;
    lines.forEach((line, i) => g.fillText(line, W / 2, top + i * lh));
    g.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function hexToRgba(hex, a) {
    const h = String(hex).replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  function drawFrame(t) {
    const W = canvas.width;
    const H = canvas.height;
    g.save();
    g.fillStyle = "#000000";
    g.fillRect(0, 0, W, H);
    const tl = timeline();
    const item = E.sceneAt(tl, t);
    if (!item) {
      g.fillStyle = "#8d8d8d";
      g.font = `600 ${Math.round(Math.min(W, H) / 22)}px Pretendard, sans-serif`;
      g.textAlign = "center";
      g.fillText("대본을 넣고 장면을 만들어 주세요", W / 2, H / 2);
      g.restore();
      return;
    }
    const local = Math.max(0, t - item.start);
    const p = item.duration > 0 ? local / item.duration : 0;
    const m = item.mediaId ? media.get(item.mediaId) : null;
    if (m) {
      const src = m.el;
      const sw = m.kind === "video" ? src.videoWidth : src.naturalWidth;
      const sh = m.kind === "video" ? src.videoHeight : src.naturalHeight;
      const ready = m.kind === "image" || src.readyState >= 2;
      if (ready && sw && sh) {
        const rect = E.fitRect(sw, sh, W, H, item.scene.fit);
        const tr = E.motionTransform(item.scene.motion, p);
        g.translate(W / 2 + tr.tx * W, H / 2 + tr.ty * H);
        g.scale(tr.scale, tr.scale);
        g.translate(-W / 2, -H / 2);
        g.drawImage(src, rect.dx, rect.dy, rect.dw, rect.dh);
        g.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    if (item.scene.dim > 0) { g.fillStyle = `rgba(0, 0, 0, ${item.scene.dim})`; g.fillRect(0, 0, W, H); }
    if (item.scene.showSub && item.scene.text.trim()) {
      const text = E.subtitleAt(item.scene.text, local, E.speakSeconds(item), state.sub.chunk);
      if (text) drawSubtitle(text);
    }
    g.restore();
  }
  const redraw = () => drawFrame(state.t);

  // ---------- 오디오 ----------
  function ensureAudio() {
    if (audio) return audio;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    const recDest = ctx.createMediaStreamDestination();
    const videoBus = ctx.createGain();
    master.connect(ctx.destination);
    master.connect(recDest);
    videoBus.connect(master);
    audio = { ctx, master, recDest, videoBus };
    media.forEach(hookVideoAudio);
    return audio;
  }
  function hookVideoAudio(m) {
    if (!audio || m.kind !== "video" || m.gain) return;
    try {
      const source = audio.ctx.createMediaElementSource(m.el);
      m.gain = audio.ctx.createGain();
      source.connect(m.gain).connect(audio.videoBus);
    } catch (error) { m.gain = null; }
  }
  async function decode(file) {
    const a = ensureAudio();
    const data = await file.arrayBuffer();
    return a.ctx.decodeAudioData(data);
  }

  // ---------- 파일 넣기 ----------
  function addMedia(file) {
    const id = uid("m");
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > CONFIG.limits.warnVideoBytes) toast(`"${file.name}"은 ${(file.size / 1073741824).toFixed(1)}GB예요. 브라우저 메모리가 부족해 멈출 수 있어요.`);
    const item = { id, kind: isVideo ? "video" : "image", name: file.name, url, el: null, duration: 0, w: 0, h: 0, gain: null };
    return new Promise((resolve) => {
      if (isVideo) {
        const v = el("video", { playsinline: true, preload: "auto" });
        v.muted = false;
        v.src = url;
        v.addEventListener("loadedmetadata", () => { item.duration = v.duration; item.w = v.videoWidth; item.h = v.videoHeight; item.el = v; media.set(id, item); hookVideoAudio(item); resolve(item); }, { once: true });
        v.addEventListener("error", () => { toast(`"${file.name}"을 열 수 없어요. 이 브라우저가 지원하지 않는 형식(예: 일부 HEVC)일 수 있어요. MP4(H.264)로 바꿔서 올려 주세요.`); URL.revokeObjectURL(url); resolve(null); }, { once: true });
      } else {
        const img = new Image();
        img.onload = () => { item.w = img.naturalWidth; item.h = img.naturalHeight; item.el = img; media.set(id, item); resolve(item); };
        img.onerror = () => { toast(`"${file.name}"을 열 수 없어요.`); URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      }
    });
  }
  async function addFiles(fileList) {
    const files = [...fileList];
    let last = null;
    for (const file of files) {
      if (file.type.startsWith("video/") || file.type.startsWith("image/")) { const item = await addMedia(file); if (item) last = item; }
      else if (file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac)$/i.test(file.name)) {
        try { const buffer = await decode(file); const id = uid("v"); voices.set(id, { id, name: file.name, buffer, duration: buffer.duration }); } catch (error) { toast(`"${file.name}"의 소리를 읽지 못했어요.`); }
      } else toast(`"${file.name}"은 지원하지 않는 파일이에요.`);
    }
    invalidate();
    renderLibrary();
    renderScenes();
    refresh();
    return last;
  }
  async function addSfxFiles(fileList) {
    for (const file of [...fileList]) {
      try { const buffer = await decode(file); const id = `file:${uid("f")}`; sfxFiles.set(id, { id, name: file.name, buffer }); } catch (error) { toast(`"${file.name}"의 소리를 읽지 못했어요.`); }
    }
    renderLibrary();
    renderScenes();
  }
  async function addFont(file) {
    const id = uid("font");
    const family = `UserFont_${id}`;
    try {
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      userFonts.push({ id, label: file.name.replace(/\.[^.]+$/, ""), family: `"${family}"` });
      state.sub.font = id;
      renderSubtitleControls();
      redraw();
    } catch (error) { toast(`"${file.name}"은 글꼴로 읽을 수 없어요.`); }
  }

  // ---------- 알림 ----------
  let toastTimer = null;
  function toast(message) {
    const box = $("toast");
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 6000);
  }

  // ---------- 재생·내보내기 ----------
  function speak(scene) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(scene.text);
    u.lang = "ko-KR";
    u.rate = state.ttsRate;
    u.pitch = state.ttsPitch;
    const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === state.ttsVoiceURI);
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
  function stopMedia() {
    media.forEach((m) => { if (m.kind === "video") { m.el.pause(); if (m.gain) m.gain.gain.value = 1; } });
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  function scheduleAudio(r, from, end) {
    const a = audio;
    const plan = E.audioPlan(timeline(), from).filter((e) => e.at < end);
    plan.forEach((e) => {
      const when = r.t0 + Math.max(0, e.at - from);
      if (e.type === "voice") {
        const v = voices.get(e.id);
        if (!v) return;
        const source = a.ctx.createBufferSource();
        source.buffer = v.buffer;
        source.connect(r.bus);
        source.start(when, e.offset);
      } else if (e.id.startsWith("file:")) {
        const f = sfxFiles.get(e.id);
        if (!f) return;
        const source = a.ctx.createBufferSource();
        const gain = a.ctx.createGain();
        gain.gain.value = e.volume;
        source.buffer = f.buffer;
        source.connect(gain).connect(r.bus);
        source.start(when);
      } else SFX.play(e.id, a.ctx, r.bus, when, e.volume);
    });
  }
  function syncVideo(item, t, playing) {
    media.forEach((m, id) => { if (m.kind === "video" && id !== item.mediaId && !m.el.paused) m.el.pause(); });
    const m = item.mediaId ? media.get(item.mediaId) : null;
    if (!m || m.kind !== "video") return;
    const want = E.sourceTime(timeline(), item, t);
    if (m.gain) m.gain.gain.value = item.scene.videoVolume;
    else m.el.volume = Math.min(1, item.scene.videoVolume);
    const frozen = want >= item.clip.end - 0.03;
    if (Math.abs(m.el.currentTime - want) > (playing ? 0.35 : 0.02)) m.el.currentTime = want;
    if (playing && !frozen) { if (m.el.paused) m.el.play().catch(() => {}); } else if (!m.el.paused) m.el.pause();
  }
  function startRun(opts) {
    const tl = timeline();
    if (!tl.items.length) { toast("장면이 없어요. 대본을 넣고 '문장으로 나누기'를 눌러 주세요."); return null; }
    const a = ensureAudio();
    stopRun();
    const from = opts.from || 0;
    const end = opts.to == null ? tl.total : opts.to;
    const r = { from, end, record: Boolean(opts.record), tts: opts.tts !== false, lastIndex: -1, bus: a.ctx.createGain(), done: null, raf: 0, t0: 0, w0: 0, finished: false };
    r.bus.connect(a.master);
    r.promise = new Promise((resolve) => { r.done = resolve; });
    run = r;
    // 소리 장치가 안 열려도(헤드리스·장치 없음) 화면은 벽시계로 진행한다. 소리 예약은 오디오 시계로 한다.
    Promise.race([a.ctx.resume(), new Promise((resolve) => setTimeout(resolve, 1500))]).then(() => {
      if (run !== r) return;
      r.t0 = a.ctx.currentTime + 0.15;
      r.w0 = performance.now() + 150;
      scheduleAudio(r, from, end);
      state.playing = true;
      updatePlayButton();
      const loop = () => {
        if (run !== r) return;
        const t = Math.min(end, from + Math.max(0, (performance.now() - r.w0) / 1000));
        state.t = t;
        const item = E.sceneAt(timeline(), Math.min(t, end - 1e-6));
        if (item) {
          if (item.index !== r.lastIndex) { r.lastIndex = item.index; if ("speechSynthesis" in window) speechSynthesis.cancel(); if (r.tts && item.scene.narrate && !item.scene.voiceId && item.scene.text.trim() && state.ttsPreview) speak(item.scene); state.selected = item.index; highlightScene(); }
          syncVideo(item, t, true);
        }
        drawFrame(t);
        updateTransport();
        if (t >= end - 1e-3) finishRun(r);
        else r.raf = requestAnimationFrame(loop);
      };
      r.raf = requestAnimationFrame(loop);
    });
    return r;
  }
  function finishRun(r) {
    if (r.finished) return;
    r.finished = true;
    cancelAnimationFrame(r.raf);
    stopMedia();
    try { r.bus.disconnect(); } catch (error) { /* 이미 끊김 */ }
    if (run === r) run = null;
    state.playing = false;
    updatePlayButton();
    r.done(true);
  }
  function stopRun() {
    if (!run) return;
    const r = run;
    run = null;
    r.finished = true;
    cancelAnimationFrame(r.raf);
    stopMedia();
    try { r.bus.disconnect(); } catch (error) { /* 이미 끊김 */ }
    state.playing = false;
    updatePlayButton();
    r.done(false);
  }
  function seek(t) {
    stopRun();
    state.t = Math.max(0, Math.min(t, timeline().total));
    const item = E.sceneAt(timeline(), state.t);
    if (item) {
      state.selected = item.index;
      highlightScene();
      const m = item.mediaId ? media.get(item.mediaId) : null;
      if (m && m.kind === "video") {
        const want = E.sourceTime(timeline(), item, state.t);
        if (Math.abs(m.el.currentTime - want) > 0.02) { m.el.addEventListener("seeked", redraw, { once: true }); m.el.currentTime = want; }
      }
    }
    redraw();
    updateTransport();
  }
  function togglePlay() {
    if (state.exporting) return;
    if (run) { stopRun(); return; }
    const tl = timeline();
    startRun({ from: state.t >= tl.total - 0.05 ? 0 : state.t });
  }
  function playScene(index) {
    const item = timeline().items[index];
    if (item) startRun({ from: item.start, to: item.end });
  }

  function pickMime() {
    const list = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return list.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  }
  async function exportVideo() {
    if (state.exporting) return;
    const tl = timeline();
    if (!tl.items.length) { toast("장면이 없어요."); return; }
    if (!window.MediaRecorder || !canvas.captureStream) { toast("이 브라우저는 내보내기를 지원하지 않아요. 최신 Chrome이나 Edge를 써 주세요."); return; }
    const mime = pickMime();
    if (!mime) { toast("이 브라우저에서 쓸 수 있는 영상 형식이 없어요."); return; }
    const useTab = $("tabAudio").checked;
    const a = ensureAudio();
    await a.ctx.resume();
    let tabStream = null;
    if (useTab) {
      try { tabStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true }); }
      catch (error) { toast("탭 소리 공유를 취소했어요. 내보내기를 멈춥니다."); return; }
      if (!tabStream.getAudioTracks().length) { tabStream.getTracks().forEach((t) => t.stop()); toast("소리 공유가 켜지지 않았어요. 공유 창에서 '탭 오디오 공유'를 체크해 주세요."); return; }
    }
    state.exporting = true;
    state.cancel = false;
    setExportUi(true);
    $("result").hidden = true;
    const out = canvas.captureStream(CONFIG.timing.fps);
    (useTab ? tabStream.getAudioTracks() : a.recDest.stream.getAudioTracks()).forEach((track) => out.addTrack(track));
    const chunks = [];
    const recorder = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 8000000, audioBitsPerSecond: 160000 });
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
    seekQuiet(0);
    recorder.start(500);
    const r = startRun({ from: 0, record: true, tts: useTab });
    const progress = setInterval(() => {
      const total = timeline().total || 1;
      const pct = Math.min(100, Math.round((state.t / total) * 100));
      $("exportBar").value = pct;
      $("exportLabel").textContent = `${pct}% · ${fmt(state.t)} / ${fmt(total)} (미리보기 속도로 녹화 중이에요. 이 탭을 닫거나 다른 탭으로 옮기지 마세요)`;
    }, 250);
    const completed = r ? await r.promise : false;
    clearInterval(progress);
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    if (tabStream) tabStream.getTracks().forEach((t) => t.stop());
    state.exporting = false;
    setExportUi(false);
    if (!completed || state.cancel) { toast("내보내기를 취소했어요."); return; }
    const blob = new Blob(chunks, { type: mime.split(";")[0] });
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    const name = `${E.exportName(new Date())}.${ext}`;
    const url = URL.createObjectURL(blob);
    const link = $("download");
    if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
    link.dataset.url = url;
    link.href = url;
    link.download = name;
    link.textContent = `${name} 저장 (${(blob.size / 1048576).toFixed(1)}MB)`;
    $("result").hidden = false;
    $("resultNote").textContent = ext === "mp4" ? "MP4로 만들어졌어요." : "이 브라우저는 MP4 녹화를 지원하지 않아 WebM으로 만들어졌어요. 최신 Chrome이면 MP4가 나와요.";
    window.__lastExport = { size: blob.size, type: blob.type, name };
  }
  function seekQuiet(t) { state.t = t; redraw(); }
  function setExportUi(on) {
    $("exportBtn").disabled = on;
    $("exportCancel").hidden = !on;
    $("exportProgress").hidden = !on;
    $("play").disabled = on;
    document.body.classList.toggle("busy", on);
  }

  // ---------- 화면 갱신 ----------
  function refresh() {
    invalidate();
    renderStrip();
    updateTransport();
    redraw();
  }
  function updateTransport() {
    const total = timeline().total;
    $("time").textContent = `${fmt(state.t)} / ${fmt(total)}`;
    const bar = $("scrub");
    bar.max = String(Math.max(total, 0.01));
    bar.value = String(state.t);
    const marker = $("marker");
    marker.style.left = total > 0 ? `${(state.t / total) * 100}%` : "0";
  }
  function updatePlayButton() { $("play").textContent = state.playing ? "⏸ 정지" : "▶ 재생"; }
  function renderStrip() {
    const strip = $("strip");
    const tl = timeline();
    strip.querySelectorAll(".block").forEach((n) => n.remove());
    tl.items.forEach((item) => {
      const block = el("button", { type: "button", class: "block", title: item.scene.text || `장면 ${item.index + 1}`, text: String(item.index + 1) });
      block.style.flex = `${item.duration} 0 0`;
      block.dataset.index = String(item.index);
      block.classList.toggle("sel", item.index === state.selected);
      block.addEventListener("click", () => seek(item.start));
      strip.insertBefore(block, $("marker"));
    });
    $("totalInfo").textContent = tl.items.length ? `장면 ${tl.items.length}개 · 총 ${fmt(tl.total)}` : "장면 없음";
  }
  function highlightScene() {
    document.querySelectorAll(".scene").forEach((n) => n.classList.toggle("sel", Number(n.dataset.index) === state.selected));
    document.querySelectorAll("#strip .block").forEach((n) => n.classList.toggle("sel", Number(n.dataset.index) === state.selected));
  }

  // ---------- 보관함 ----------
  function renderLibrary() {
    const box = $("library");
    box.replaceChildren();
    if (!media.size && !voices.size && !sfxFiles.size) box.append(el("p", { class: "empty", text: "영상·이미지(끌어다 놓기·붙여넣기), 목소리 파일, 효과음 파일을 넣어 주세요." }));
    media.forEach((m) => {
      const thumb = m.kind === "image" ? el("img", { src: m.url, alt: "" }) : (() => { const v = el("video", { src: `${m.url}#t=0.1`, preload: "metadata", muted: true, playsinline: true }); v.muted = true; return v; })();
      const del = el("button", { type: "button", class: "x", "aria-label": `${m.name} 지우기`, text: "×" });
      del.addEventListener("click", (e) => { e.stopPropagation(); removeMedia(m.id); });
      const card = el("div", { class: "thumb", role: "button", tabindex: "0", title: `${m.name} — 선택한 장면에 넣기` }, [thumb, el("span", { text: m.kind === "video" ? `🎞 ${m.name} (${fmt(m.duration)})` : `🖼 ${m.name}` }), del]);
      const assign = () => assignMedia(m.id);
      card.addEventListener("click", assign);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); assign(); } });
      box.append(card);
    });
    voices.forEach((v) => {
      const del = el("button", { type: "button", class: "x", "aria-label": `${v.name} 지우기`, text: "×" });
      del.addEventListener("click", () => { voices.delete(v.id); state.scenes.forEach((s) => { if (s.voiceId === v.id) s.voiceId = null; }); renderLibrary(); renderScenes(); refresh(); });
      box.append(el("div", { class: "thumb voice" }, [el("span", { text: `🎙 ${v.name} (${fmt(v.duration)})` }), del]));
    });
    sfxFiles.forEach((f) => {
      const del = el("button", { type: "button", class: "x", "aria-label": `${f.name} 지우기`, text: "×" });
      del.addEventListener("click", () => { sfxFiles.delete(f.id); state.scenes.forEach((s) => { if (s.sfxId === f.id) s.sfxId = null; }); renderLibrary(); renderScenes(); refresh(); });
      box.append(el("div", { class: "thumb voice" }, [el("span", { text: `🔔 ${f.name}` }), del]));
    });
  }
  function removeMedia(id) {
    const m = media.get(id);
    if (!m) return;
    if (m.kind === "video") m.el.pause();
    media.delete(id);
    URL.revokeObjectURL(m.url);
    state.scenes.forEach((s) => { if (s.mediaId === id) s.mediaId = null; });
    renderLibrary(); renderScenes(); refresh();
  }
  function assignMedia(id) {
    if (state.selected < 0 || !state.scenes[state.selected]) { toast("먼저 오른쪽에서 장면을 골라 주세요."); return; }
    const s = state.scenes[state.selected];
    s.mediaId = id; s.trimIn = 0; s.trimOut = null;
    renderScenes(); refresh();
    seek(timeline().items[state.selected].start);
  }
  function assignVoicesInOrder() {
    const list = [...voices.values()].sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
    if (!list.length) { toast("목소리 파일을 먼저 넣어 주세요."); return; }
    state.scenes.forEach((s, i) => { s.voiceId = list[i] ? list[i].id : null; });
    if (list.length !== state.scenes.length) toast(`목소리 파일 ${list.length}개, 장면 ${state.scenes.length}개예요. 순서대로 넣고 남는 쪽은 비워 뒀어요.`);
    renderScenes(); refresh();
  }

  // ---------- 장면 목록 ----------
  function sceneSelect(options, value, onChange, label) {
    const select = el("select", { "aria-label": label }, options.map((o) => el("option", { value: o.value, text: o.label })));
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }
  function numberField(label, value, attrs, onChange) {
    const input = el("input", { type: "number", ...attrs });
    input.value = value == null ? "" : String(value);
    input.addEventListener("change", () => onChange(input.value === "" ? null : Number(input.value)));
    return el("label", { class: "mini" }, [el("span", { text: label }), input]);
  }
  function renderScenes() {
    invalidate();
    const list = $("scenes");
    list.replaceChildren();
    if (!state.scenes.length) list.append(el("p", { class: "empty", text: "대본을 붙여 넣고 '문장으로 나누기'를 누르면 장면이 만들어져요." }));
    state.scenes.forEach((scene, index) => {
      const mediaOptions = [{ value: "", label: "앞 장면 화면 이어서" }, ...[...media.values()].map((m) => ({ value: m.id, label: `${m.kind === "video" ? "🎞" : "🖼"} ${m.name}` }))];
      const voiceOptions = [{ value: "tts", label: "컴퓨터 목소리(TTS)" }, { value: "none", label: "읽지 않음" }, ...[...voices.values()].map((v) => ({ value: `v:${v.id}`, label: `🎙 ${v.name}` }))];
      const voiceValue = scene.voiceId ? `v:${scene.voiceId}` : scene.narrate ? "tts" : "none";
      const sfxOptions = [{ value: "", label: "효과음 없음" }, ...CONFIG.sfx.map((s) => ({ value: s.id, label: s.label })), ...[...sfxFiles.values()].map((f) => ({ value: f.id, label: `🔔 ${f.name}` }))];
      const text = el("textarea", { rows: "2", "aria-label": `장면 ${index + 1} 문장`, placeholder: "화면에 나올 자막이자 읽을 문장" });
      text.value = scene.text;
      text.addEventListener("input", () => { scene.text = text.value; refresh(); });
      const ownMedia = timeline().items[index] && timeline().items[index].holder === index && timeline().items[index].media && timeline().items[index].media.kind === "video";
      const trimBtn = el("button", { type: "button", class: "ghost", text: "✂ 영상 자르기" });
      trimBtn.addEventListener("click", () => openTrim(index));
      trimBtn.hidden = !ownMedia;
      const dim = el("input", { type: "range", min: "0", max: "0.8", step: "0.05", "aria-label": "화면 어둡게" });
      dim.value = String(scene.dim);
      dim.addEventListener("input", () => { scene.dim = Number(dim.value); redraw(); });
      const vol = el("input", { type: "range", min: "0", max: "1", step: "0.05", "aria-label": "영상 소리 크기" });
      vol.value = String(scene.videoVolume);
      vol.addEventListener("input", () => { scene.videoVolume = Number(vol.value); });
      const sfxVol = el("input", { type: "range", min: "0", max: "1", step: "0.05", "aria-label": "효과음 크기" });
      sfxVol.value = String(scene.sfxVolume);
      sfxVol.addEventListener("input", () => { scene.sfxVolume = Number(sfxVol.value); });
      const preview = el("button", { type: "button", class: "ghost", text: "▶ 이 장면만" });
      preview.addEventListener("click", () => playScene(index));
      const sfxTry = el("button", { type: "button", class: "ghost", text: "효과음 듣기" });
      sfxTry.addEventListener("click", async () => {
        if (!scene.sfxId) return;
        const a = ensureAudio(); await a.ctx.resume();
        if (scene.sfxId.startsWith("file:")) { const f = sfxFiles.get(scene.sfxId); if (f) { const src = a.ctx.createBufferSource(); const gn = a.ctx.createGain(); gn.gain.value = scene.sfxVolume; src.buffer = f.buffer; src.connect(gn).connect(a.master); src.start(); } }
        else SFX.play(scene.sfxId, a.ctx, a.master, a.ctx.currentTime, scene.sfxVolume);
      });
      const up = el("button", { type: "button", class: "ghost", "aria-label": "위로", text: "↑" });
      const down = el("button", { type: "button", class: "ghost", "aria-label": "아래로", text: "↓" });
      const dup = el("button", { type: "button", class: "ghost", text: "복제" });
      const del = el("button", { type: "button", class: "ghost danger", text: "삭제" });
      up.addEventListener("click", () => moveScene(index, -1));
      down.addEventListener("click", () => moveScene(index, 1));
      dup.addEventListener("click", () => { state.scenes.splice(index + 1, 0, { ...scene, id: uid("s") }); renderScenes(); refresh(); });
      del.addEventListener("click", () => { state.scenes.splice(index, 1); state.selected = Math.min(state.selected, state.scenes.length - 1); renderScenes(); refresh(); });
      const row = (children) => el("div", { class: "row" }, children);
      const card = el("article", { class: "scene", "data-index": String(index) }, [
        el("header", {}, [el("b", { text: `장면 ${index + 1}` }), el("span", { class: "dur", text: "" }), el("span", { class: "grow" }), preview, up, down, dup, del]),
        text,
        row([
          el("label", { class: "mini wide" }, [el("span", { text: "화면" }), sceneSelect(mediaOptions, scene.mediaId || "", (v) => { scene.mediaId = v || null; scene.trimIn = 0; scene.trimOut = null; renderScenes(); refresh(); }, "화면")]),
          trimBtn
        ]),
        row([
          el("label", { class: "mini wide" }, [el("span", { text: "읽기" }), sceneSelect(voiceOptions, voiceValue, (v) => { if (v === "tts") { scene.voiceId = null; scene.narrate = true; } else if (v === "none") { scene.voiceId = null; scene.narrate = false; } else { scene.voiceId = v.slice(2); scene.narrate = true; } renderScenes(); refresh(); }, "읽기")]),
          numberField("길이(초)", scene.duration, { min: "0.5", step: "0.5", placeholder: "자동" }, (v) => { scene.duration = v; renderScenes(); refresh(); }),
          numberField("끝에 더(초)", scene.hold || 0, { min: "0", step: "0.5" }, (v) => { scene.hold = v || 0; renderScenes(); refresh(); })
        ]),
        row([
          el("label", { class: "mini" }, [el("span", { text: "화면 움직임" }), sceneSelect(CONFIG.motions.map((m) => ({ value: m.id, label: m.label })), scene.motion, (v) => { scene.motion = v; redraw(); }, "화면 움직임")]),
          el("label", { class: "mini" }, [el("span", { text: "맞춤" }), sceneSelect([{ value: "cover", label: "가득 채우기" }, { value: "contain", label: "전체 보이게" }], scene.fit, (v) => { scene.fit = v; redraw(); }, "맞춤")]),
          el("label", { class: "mini check" }, [(() => { const c = el("input", { type: "checkbox" }); c.checked = scene.showSub; c.addEventListener("change", () => { scene.showSub = c.checked; redraw(); }); return c; })(), el("span", { text: "자막 보이기" })])
        ]),
        row([el("label", { class: "mini" }, [el("span", { text: "화면 어둡게" }), dim]), el("label", { class: "mini" }, [el("span", { text: "영상 소리" }), vol])]),
        row([
          el("label", { class: "mini wide" }, [el("span", { text: "효과음" }), sceneSelect(sfxOptions, scene.sfxId || "", (v) => { scene.sfxId = v || null; }, "효과음")]),
          numberField("시작(초 뒤)", scene.sfxDelay || 0, { min: "0", step: "0.1" }, (v) => { scene.sfxDelay = v || 0; refresh(); }),
          el("label", { class: "mini" }, [el("span", { text: "크기" }), sfxVol]),
          sfxTry
        ])
      ]);
      card.addEventListener("focusin", () => { if (state.selected !== index) { state.selected = index; highlightScene(); } });
      card.addEventListener("click", (e) => { if (e.target.closest("button, input, select, textarea, label")) return; seek(timeline().items[index].start); });
      list.append(card);
    });
    updateDurations();
    highlightScene();
  }
  function updateDurations() {
    const tl = timeline();
    document.querySelectorAll(".scene").forEach((n) => {
      const item = tl.items[Number(n.dataset.index)];
      const d = n.querySelector(".dur");
      if (item && d) d.textContent = `${item.duration.toFixed(1)}초`;
    });
  }
  function moveScene(index, delta) {
    const to = index + delta;
    if (to < 0 || to >= state.scenes.length) return;
    const [s] = state.scenes.splice(index, 1);
    state.scenes.splice(to, 0, s);
    state.selected = to;
    renderScenes(); refresh();
  }
  function makeScenes() {
    const sentences = E.splitSentences($("script").value);
    if (!sentences.length) { toast("대본이 비어 있어요."); return; }
    if (state.scenes.length && !confirm("지금 장면을 모두 지우고 대본으로 새로 만들까요? (넣어 둔 영상·이미지는 보관함에 남아요)")) return;
    state.scenes = sentences.map((s) => E.defaultScene(s));
    state.selected = 0;
    renderScenes(); refresh(); seek(0);
  }

  // ---------- 영상 자르기 ----------
  let trimIndex = -1;
  function openTrim(index) {
    const scene = state.scenes[index];
    const m = media.get(scene.mediaId);
    if (!m || m.kind !== "video") return;
    trimIndex = index;
    const v = $("trimVideo");
    v.src = m.url;
    const range = E.clipRange(scene, m.duration);
    $("trimIn").value = range.start.toFixed(2);
    $("trimOut").value = range.end.toFixed(2);
    $("trimInfo").textContent = `원본 ${fmt(m.duration)} · 선택 ${range.length.toFixed(1)}초`;
    $("trimDlg").showModal();
    v.currentTime = range.start;
  }
  function trimClamp() {
    const m = media.get(state.scenes[trimIndex].mediaId);
    const a = Math.max(0, Number($("trimIn").value) || 0);
    const b = Math.min(m.duration, Number($("trimOut").value) || m.duration);
    $("trimInfo").textContent = b - a > 0.05 ? `원본 ${fmt(m.duration)} · 선택 ${(b - a).toFixed(1)}초` : "끝이 시작보다 뒤여야 해요.";
    return { a, b };
  }
  function bindTrim() {
    const v = $("trimVideo");
    $("trimSetIn").addEventListener("click", () => { $("trimIn").value = v.currentTime.toFixed(2); trimClamp(); });
    $("trimSetOut").addEventListener("click", () => { $("trimOut").value = v.currentTime.toFixed(2); trimClamp(); });
    ["trimIn", "trimOut"].forEach((id) => $(id).addEventListener("change", trimClamp));
    $("trimPlay").addEventListener("click", () => { const { a, b } = trimClamp(); v.currentTime = a; v.play(); const stop = () => { if (v.currentTime >= b) { v.pause(); v.removeEventListener("timeupdate", stop); } }; v.addEventListener("timeupdate", stop); });
    $("trimReset").addEventListener("click", () => { const m = media.get(state.scenes[trimIndex].mediaId); $("trimIn").value = "0"; $("trimOut").value = m.duration.toFixed(2); trimClamp(); });
    $("trimApply").addEventListener("click", () => {
      const { a, b } = trimClamp();
      if (b - a <= 0.05) return;
      const s = state.scenes[trimIndex];
      const m = media.get(s.mediaId);
      s.trimIn = a <= 0.01 ? 0 : a;
      s.trimOut = b >= m.duration - 0.01 ? null : b;
      v.pause();
      $("trimDlg").close();
      renderScenes(); refresh(); seek(timeline().items[trimIndex].start);
    });
    $("trimCancel").addEventListener("click", () => { v.pause(); $("trimDlg").close(); });
  }

  // ---------- 설정 ----------
  function renderSubtitleControls() {
    const box = $("subControls");
    box.replaceChildren();
    const s = state.sub;
    const sel = (label, options, value, key, parse) => el("label", { class: "mini" }, [el("span", { text: label }), (() => { const x = sceneSelect(options, String(value), (v) => { s[key] = parse ? parse(v) : v; refresh(); }, label); return x; })()]);
    const num = (label, key, attrs) => { const i = el("input", { type: "number", ...attrs, "aria-label": label }); i.value = String(s[key]); i.addEventListener("input", () => { s[key] = Number(i.value) || 0; redraw(); }); return el("label", { class: "mini" }, [el("span", { text: label }), i]); };
    const color = (label, key) => { const i = el("input", { type: "color", "aria-label": label }); i.value = s[key]; i.addEventListener("input", () => { s[key] = i.value; redraw(); }); return el("label", { class: "mini" }, [el("span", { text: label }), i]); };
    const check = (label, key) => { const i = el("input", { type: "checkbox" }); i.checked = s[key]; i.addEventListener("change", () => { s[key] = i.checked; redraw(); }); return el("label", { class: "mini check" }, [i, el("span", { text: label })]); };
    box.append(
      sel("글꼴", CONFIG.fonts.concat(userFonts).map((f) => ({ value: f.id, label: f.label })), s.font, "font"),
      num("크기", "size", { min: "20", max: "200", step: "2" }),
      num("자간", "letterSpacing", { min: "-5", max: "30", step: "1" }),
      num("줄 간격", "lineHeight", { min: "0.8", max: "2.5", step: "0.1" }),
      num("세로 위치(0~1)", "y", { min: "0.05", max: "0.95", step: "0.05" }),
      color("글자색", "color"), color("그림자 색", "shadowColor"), num("그림자 퍼짐", "shadowBlur", { min: "0", max: "60", step: "2" }),
      check("배경 박스", "box"), color("박스 색", "boxColor"), num("박스 투명도", "boxOpacity", { min: "0", max: "1", step: "0.05" }),
      sel("끊어 보여주기", CONFIG.chunkOptions.map((o) => ({ value: String(o.value), label: o.label })), s.chunk, "chunk", Number)
    );
  }
  function loadTtsVoices() {
    if (!("speechSynthesis" in window)) { $("ttsVoice").replaceChildren(el("option", { value: "", text: "이 브라우저는 TTS를 지원하지 않아요" })); return; }
    const all = speechSynthesis.getVoices();
    const ko = all.filter((v) => /^ko/i.test(v.lang));
    const list = ko.length ? ko : all;
    const select = $("ttsVoice");
    select.replaceChildren(el("option", { value: "", text: "기본 목소리" }), ...list.map((v) => el("option", { value: v.voiceURI, text: `${v.name} (${v.lang})` })));
    select.value = state.ttsVoiceURI;
  }

  function bindControls() {
    $("makeScenes").addEventListener("click", makeScenes);
    $("addScene").addEventListener("click", () => { state.scenes.push(E.defaultScene("")); state.selected = state.scenes.length - 1; renderScenes(); refresh(); });
    $("ratio").replaceChildren(...CONFIG.ratios.map((r) => el("option", { value: r.id, text: r.label })));
    $("ratio").addEventListener("change", () => { state.ratioId = $("ratio").value; resizeCanvas(); redraw(); });
    $("outScale").replaceChildren(...CONFIG.outputScales.map((o) => el("option", { value: String(o.scale), text: o.label })));
    $("outScale").addEventListener("change", () => { state.outScale = Number($("outScale").value) || 1; resizeCanvas(); redraw(); });
    $("ttsVoice").addEventListener("change", () => { state.ttsVoiceURI = $("ttsVoice").value; });
    $("ttsRate").addEventListener("input", () => { state.ttsRate = Number($("ttsRate").value); $("ttsRateVal").textContent = state.ttsRate.toFixed(1); refresh(); renderScenesDurationsOnly(); });
    $("ttsPitch").addEventListener("input", () => { state.ttsPitch = Number($("ttsPitch").value); $("ttsPitchVal").textContent = state.ttsPitch.toFixed(1); });
    $("ttsPreview").addEventListener("change", () => { state.ttsPreview = $("ttsPreview").checked; });
    $("play").addEventListener("click", togglePlay);
    $("rewind").addEventListener("click", () => seek(0));
    $("scrub").addEventListener("input", () => seek(Number($("scrub").value)));
    $("fileMedia").addEventListener("change", async (e) => { await addFiles(e.target.files); e.target.value = ""; });
    $("fileSfx").addEventListener("change", async (e) => { await addSfxFiles(e.target.files); e.target.value = ""; });
    $("fileFont").addEventListener("change", async (e) => { for (const f of e.target.files) await addFont(f); e.target.value = ""; });
    $("assignVoices").addEventListener("click", assignVoicesInOrder);
    $("exportBtn").addEventListener("click", exportVideo);
    $("exportCancel").addEventListener("click", () => { state.cancel = true; stopRun(); });
    $("example").addEventListener("click", () => { $("script").value = "안녕하세요. 이 편집기는 대본을 문장마다 장면으로 나눠 줘요.\n영상이나 이미지를 올리면 장면마다 화면을 넣을 수 있어요!\n자막과 효과음을 붙여서 MP4로 내보내 보세요."; });
    const stage = $("stageWrap");
    ["dragenter", "dragover"].forEach((n) => stage.addEventListener(n, (e) => { e.preventDefault(); stage.classList.add("drop"); }));
    ["dragleave", "drop"].forEach((n) => stage.addEventListener(n, (e) => { e.preventDefault(); stage.classList.remove("drop"); }));
    stage.addEventListener("drop", async (e) => {
      const last = await addFiles(e.dataTransfer.files);
      if (last && state.selected >= 0 && state.scenes[state.selected]) assignMedia(last.id);
    });
    document.addEventListener("paste", async (e) => {
      const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      const last = await addFiles(files);
      if (last && state.selected >= 0 && state.scenes[state.selected]) assignMedia(last.id);
    });
    window.addEventListener("beforeunload", (e) => { if (state.scenes.length) { e.preventDefault(); e.returnValue = ""; } });
    if ("speechSynthesis" in window) { speechSynthesis.addEventListener("voiceschanged", loadTtsVoices); }
  }
  function renderScenesDurationsOnly() { updateDurations(); }

  // ---------- 시작 ----------
  resizeCanvas();
  renderSubtitleControls();
  bindControls();
  bindTrim();
  loadTtsVoices();
  renderLibrary();
  renderScenes();
  renderStrip();
  updateTransport();
  redraw();
  if (!window.MediaRecorder) toast("이 브라우저는 MP4 내보내기를 지원하지 않아요. 최신 Chrome이나 Edge를 써 주세요.");
  window.SHORTS_APP = { state, media, voices, addFiles, makeScenes, exportVideo, seek, timeline, refresh, renderScenes, redraw, startRun, stopRun };
})();
