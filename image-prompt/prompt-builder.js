/* 지시문 조립과 결과 파싱 — 화면(index.html)과 테스트(scripts/test_image_prompt.js)가 같이 쓴다.
 * 설정값은 config 인자로만 받는다. 네트워크·저장소·URL을 쓰지 않는다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ImagePromptBuilder = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 고른 항목 + 자유 입력을 "- 라벨: 값 (영문)" 줄로 만든다. 고르지 않은 그룹은 줄 자체를 만들지 않는다.
  function changeLines(config, state) {
    const lines = [];
    config.groups.forEach((g) => {
      const id = state.picks && state.picks[g.id];
      if (!id) return;
      const o = g.options.find((x) => x.id === id);
      if (o) lines.push("- " + g.label + ": " + o.id + " (" + o.en + ")");
    });
    const bodyRef = (state.bodyRef || "").trim();
    if (bodyRef) lines.push("- 체형 참고 수치: " + bodyRef + " (숫자를 그대로 쓰지 말고 눈에 보이는 체형 묘사로 바꾸세요)");
    const extra = (state.extra || "").trim();
    if (extra) lines.push("- 추가 요청: " + extra);
    return lines;
  }

  function hasChange(config, state) {
    return changeLines(config, state).length > 0;
  }

  function buildInstruction(config, state) {
    const lines = changeLines(config, state);
    if (!lines.length) throw new Error("바꿀 점을 하나 이상 골라 주세요.");
    const gen = config.generators.find((g) => g.id === state.generator);
    if (!gen) throw new Error("대상 생성기를 골라 주세요.");
    const base = (state.base || "").trim() || config.noBaseText;
    const aspect = (state.aspect || "").trim();
    const aspectLine = aspect ? "[비율] " + aspect + " — " + gen.aspectRule.replace(/\{aspect\}/g, aspect) : "[비율] 지정 안 함";
    const vars = {
      base: base,
      changes: lines.join("\n"),
      generator: gen.id,
      genRule: gen.rule,
      aspectLine: aspectLine
    };
    // 한 번에 치환한다. 치환된 값 안에 {x} 모양이 있어도 다시 해석하지 않는다.
    return config.instruction.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m));
  }

  const MARKERS = { "ENGLISH PROMPT": "prompt", "NEGATIVE PROMPT": "negative", "바뀐 부분": "summary" };

  // Claude 답변을 [ENGLISH PROMPT] / [NEGATIVE PROMPT] / [바뀐 부분] 구간으로 나눈다.
  function parseResult(raw) {
    const text = String(raw || "").replace(/\r/g, "").split("\n")
      .filter((l) => !/^\s*```/.test(l)).join("\n");
    const out = { prompt: "", negative: "", summary: "" };
    let cur = null;
    let found = false;
    text.split("\n").forEach((line) => {
      const m = line.replace(/\*+/g, "").trim().match(/^\[(ENGLISH PROMPT|NEGATIVE PROMPT|바뀐 부분)\]\s*(.*)$/i);
      if (m) {
        const key = Object.keys(MARKERS).find((k) => k.toLowerCase() === m[1].toLowerCase());
        cur = MARKERS[key]; found = true;
        if (m[2]) out[cur] += m[2] + "\n";
      } else if (cur) {
        out[cur] += line + "\n";
      }
    });
    Object.keys(out).forEach((k) => { out[k] = out[k].trim(); });
    if (!found) throw new Error("[ENGLISH PROMPT] 구간을 찾지 못했어요. Claude 답변 전체를 그대로 붙여넣어 주세요.");
    if (!out.prompt) throw new Error("영문 프롬프트가 비어 있어요. 지시문 그대로 다시 요청해 주세요.");
    return out;
  }

  return { changeLines: changeLines, hasChange: hasChange, buildInstruction: buildInstruction, parseResult: parseResult };
});
