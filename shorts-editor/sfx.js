// 파일 없이 브라우저가 만드는 합성 효과음 9종. play(id, ctx, dest, when, volume) 로 정해진 시각에 예약한다.
(function attachShortsSfx(root) {
  let noise = null;
  function noiseBuffer(ctx) {
    if (noise && noise.sampleRate === ctx.sampleRate) return noise;
    const length = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let seed = 1234567; // 같은 소리가 나오게 고정 시드
    for (let i = 0; i < length; i += 1) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = (seed / 4294967296) * 2 - 1; }
    return noise;
  }
  function env(gain, when, peak, attack, decay) {
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }
  function tone(ctx, dest, when, type, f0, f1, peak, attack, decay) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, when);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, when + attack + decay);
    env(gain, when, peak, attack, decay);
    osc.connect(gain).connect(dest);
    osc.start(when);
    osc.stop(when + attack + decay + 0.05);
  }
  function burst(ctx, dest, when, filterType, freq, q, peak, attack, decay, offset) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    env(gain, when, peak, attack, decay);
    src.connect(filter).connect(gain).connect(dest);
    src.start(when, offset || 0, attack + decay + 0.05);
  }

  const recipes = {
    click(ctx, dest, t) { burst(ctx, dest, t, "highpass", 2500, 0.7, 0.8, 0.001, 0.03, 0.1); tone(ctx, dest, t, "sine", 1400, 900, 0.35, 0.001, 0.04); },
    pop(ctx, dest, t) { tone(ctx, dest, t, "sine", 280, 900, 0.8, 0.005, 0.1); },
    bell(ctx, dest, t) { tone(ctx, dest, t, "sine", 880, 880, 0.5, 0.005, 1.2); tone(ctx, dest, t, "sine", 1760, 1760, 0.25, 0.005, 0.9); tone(ctx, dest, t, "sine", 2637, 2637, 0.1, 0.005, 0.5); },
    coin(ctx, dest, t) { tone(ctx, dest, t, "square", 988, 988, 0.22, 0.003, 0.07); tone(ctx, dest, t + 0.07, "square", 1319, 1319, 0.22, 0.003, 0.35); },
    whoosh(ctx, dest, t) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      filter.type = "bandpass";
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.4);
      env(gain, t, 0.9, 0.18, 0.25);
      src.connect(filter).connect(gain).connect(dest);
      src.start(t, 0.3, 0.5);
    },
    keys(ctx, dest, t) { [0, 0.09, 0.17, 0.3, 0.38, 0.5].forEach((d, i) => { burst(ctx, dest, t + d, "bandpass", 1800 + (i % 3) * 400, 2, 0.5, 0.001, 0.035, 0.2 + i * 0.1); tone(ctx, dest, t + d, "sine", 220, 160, 0.25, 0.001, 0.04); }); },
    tap(ctx, dest, t) { burst(ctx, dest, t, "lowpass", 900, 0.8, 0.7, 0.001, 0.05, 0.4); tone(ctx, dest, t, "sine", 190, 120, 0.5, 0.001, 0.08); },
    drop(ctx, dest, t) { tone(ctx, dest, t, "sine", 1300, 320, 0.7, 0.003, 0.14); tone(ctx, dest, t + 0.12, "sine", 900, 260, 0.25, 0.003, 0.12); },
    fire(ctx, dest, t) {
      burst(ctx, dest, t, "lowpass", 500, 0.7, 0.18, 0.2, 1.5, 0.6);
      let seed = 99;
      for (let i = 0; i < 26; i += 1) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        const at = t + (seed % 1700) / 1000;
        burst(ctx, dest, at, "highpass", 2200 + (seed % 2000), 1, 0.12 + (seed % 10) / 60, 0.001, 0.02 + (seed % 5) / 200, (seed % 15) / 10);
      }
    }
  };

  function play(id, ctx, dest, when, volume) {
    const recipe = recipes[id];
    if (!recipe) return false;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, Math.max(0, volume == null ? 0.8 : volume));
    gain.connect(dest);
    recipe(ctx, gain, Math.max(when, ctx.currentTime));
    return true;
  }
  root.SHORTS_SFX = { play, ids: Object.keys(recipes) };
})(typeof window !== "undefined" ? window : globalThis);
