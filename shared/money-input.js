/**
 * 금액 입력칸에 천 단위 쉼표를 붙인다.
 *
 * `<input type="number">` 로는 못 한다. 명세상 값이 유효한 부동소수점 문자열이어야
 * 해서 브라우저가 쉼표를 값으로 받지 않는다. 그래서 금액 칸은 `type="text"` +
 * `inputmode="decimal"` 로 두고 표시 형식을 여기서 직접 관리한다.
 *
 * 쓰는 법 — 칸에 `data-money` 를 달고 페이지에서 한 번 `upgrade()` 를 부른다.
 * 값을 읽을 때는 `input.value` 가 아니라 `read(input)` 을 쓴다. 쉼표가 섞여 있어
 * `Number(input.value)` 는 NaN 이 된다.
 *
 * 배수(ROAS)·비율(%)·명수처럼 금액이 아닌 칸에는 달지 않는다. 자릿수가 짧아
 * 쉼표가 도움이 안 되고, 명수에 쉼표가 붙으면 금액처럼 보인다.
 */
(function attachMoneyInput(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MONEY_INPUT = api;
})(typeof window !== "undefined" ? window : globalThis, function createMoneyInput() {
  /** 숫자와 소수점 하나만 남긴다. 쉼표는 우리가 붙인 표시라 그대로 버린다.
   *  입력 도중의 끝자리 점("29900.")은 지우지 않는다 — 지우면 소수를 못 친다. */
  function clean(text) {
    let out = "";
    let seenDot = false;
    for (const ch of String(text == null ? "" : text)) {
      if (ch >= "0" && ch <= "9") {
        out += ch;
      } else if (ch === "." && !seenDot) {
        out += ".";
        seenDot = true;
      }
    }
    return out;
  }

  /** 정수부에만 세 자리 쉼표를 넣는다. 소수부는 건드리지 않는다. */
  function format(text) {
    const value = clean(text);
    if (value === "") return "";
    const dot = value.indexOf(".");
    const whole = dot === -1 ? value : value.slice(0, dot);
    const rest = dot === -1 ? "" : value.slice(dot);
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + rest;
  }

  /** 빈 칸은 0 으로 읽는다 — 바꾸기 전 `Number("")` 과 같은 동작이다. */
  function parse(text) {
    const value = clean(text);
    if (value === "" || value === ".") return 0;
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  /** 쉼표를 뺀 글자 수를 기준으로 커서 자리를 되찾는다.
   *  이게 없으면 쉼표가 하나 늘어날 때마다 커서가 왼쪽으로 밀린다. */
  function caretAfter(formatted, meaningful) {
    if (meaningful <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i += 1) {
      if (formatted[i] !== ",") {
        seen += 1;
        if (seen === meaningful) return i + 1;
      }
    }
    return formatted.length;
  }

  function read(input) {
    return parse(input.value);
  }

  function write(input, number) {
    input.value = format(String(number));
  }

  function reformat(input) {
    const caret = typeof input.selectionStart === "number" ? input.selectionStart : null;
    const meaningful = caret === null ? 0 : clean(input.value.slice(0, caret)).length;
    const next = format(input.value);
    if (next === input.value) return;
    input.value = next;
    if (caret !== null && typeof input.setSelectionRange === "function") {
      const position = caretAfter(next, meaningful);
      input.setSelectionRange(position, position);
    }
  }

  /** `data-money` 가 달린 칸을 금액 칸으로 바꾼다. 여러 번 불러도 안전하다. */
  function upgrade(scope) {
    const container = scope || (typeof document !== "undefined" ? document : null);
    if (!container) return [];
    const fields = Array.prototype.slice.call(container.querySelectorAll("input[data-money]"));
    fields.forEach((input) => {
      if (input.dataset.moneyReady === "true") return;
      input.dataset.moneyReady = "true";
      input.type = "text";
      input.setAttribute("inputmode", "decimal");
      input.setAttribute("autocomplete", "off");
      reformat(input);
      input.addEventListener("input", () => reformat(input));
      // 칸을 떠날 때 "007" · "29900." 같은 중간 상태를 정리한다.
      input.addEventListener("blur", () => {
        if (clean(input.value) === "") {
          input.value = "";
          return;
        }
        write(input, parse(input.value));
      });
    });
    return fields;
  }

  return Object.freeze({ clean, format, parse, caretAfter, read, write, reformat, upgrade });
});
