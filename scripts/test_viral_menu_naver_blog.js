const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "viral-menu", "naver-blog");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

// 설정은 index.html 안에 있다. 별도 .js 파일이면 파일마다 따로 캐시돼 새 화면 코드에 옛 설정이 섞인다.
assert.doesNotMatch(html, /<script[^>]*\ssrc="\.{0,2}\/?[^"]*\.js[^"]*"/, "화면 코드가 로컬 .js 파일에 의존하면 안 된다");
const configSource = html.match(/<script id="naver-blog-config">([\s\S]*?)<\/script>/)[1];
const renderSource = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const sandboxForConfig = {};
sandboxForConfig.window = sandboxForConfig;
vm.runInNewContext(configSource, sandboxForConfig);
const config = JSON.parse(JSON.stringify(sandboxForConfig.NAVER_BLOG_QUOTE_CONFIG));
const byId = Object.fromEntries(config.campaigns.map((c) => [c.id, c]));

// 원본 표(2026-10-06 사용자 제공 이미지) 그대로의 값.
assert.equal(config.vatRate, 0.1);
assert.deepEqual(config.campaigns.map((c) => c.id), ["influencer", "power-blog", "general-blog", "kin", "press"]);
assert.equal(byId.influencer.unitPrice, 300000);
assert.equal(byId["power-blog"].unitPrice, 250000);
assert.equal(byId["general-blog"].unitPrice, 20000);
assert.equal(byId.kin.unitPrice, null, "지식인 상위노출은 개별 문의");
assert.equal(byId.press.unitPrice, null, "언론송출은 개별 문의");
assert.equal(byId.influencer.options.highInvolvement.unitPrice, 400000, "고관여 키워드 인플루언서 체험단 1인 단가");
assert.equal(byId["power-blog"].options.highInvolvement.unitPrice, 350000, "고관여 키워드 파워블로그 체험단 1인 단가");
assert.equal(byId.influencer.options.retrieval.addPerPerson, 20000);
assert.equal(byId["power-blog"].options.retrieval.addPerPerson, 20000);
assert.equal(byId["general-blog"].options.retrieval, undefined, "일반 블로그 체험단은 회수형 진행 불가");
assert.ok(byId["general-blog"].restrictions.includes("회수형 체험단 진행 불가"));
assert.equal(config.process.length, 9);
assert.equal(config.process[4].condition, "파워블로그 이상 진행 시");

// 공개 저장소 규칙.
assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.(search|hash)|history\.(push|replace)State|fetch\s*\(|XMLHttpRequest|sendBeacon|<form[^>]*action/i);
assert.doesNotMatch(JSON.stringify(config), /원가|마진|margin|매체비/i);

// ── 화면 코드를 실제로 실행한다 ──────────────────────────────────────────────
class El {
  constructor(tag) { this.tag = tag; this.children = []; this._text = ""; this.className = ""; this.value = ""; this.checked = false; this.listeners = {}; this.attrs = {}; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => (typeof c === "string" ? c : c.textContent)).join(""); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this._text = ""; this.children = nodes; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
}

function render(configText) {
  const created = [];
  const fixed = new Map();
  const document = {
    createElement(tag) { const el = new El(tag); created.push(el); return el; },
    getElementById(id) {
      const made = created.find((el) => el.id === id);
      if (made) return made;
      if (!fixed.has(id)) fixed.set(id, new El("div"));
      return fixed.get(id);
    },
  };
  const sandbox = { document, Intl };
  sandbox.window = sandbox;
  vm.runInNewContext(configText + "\n" + renderSource, sandbox);
  const calc = fixed.get("calc");
  return {
    text: () => [...fixed.values()].map((el) => el.textContent).join("\n"),
    totals: () => fixed.get("totals").textContent,
    flags: () => fixed.get("flags").textContent,
    count: (id) => created.find((el) => el.id === "count-" + id),
    checkbox: (campaignId, label) => {
      const row = created.find((el) => el.className === "calc-row" && el.children[1].children.includes(created.find((x) => x.id === "count-" + campaignId)));
      const lab = row.children[2].children.find((l) => l.children[1] && l.children[1].textContent === label);
      return lab && lab.children[0];
    },
    fire: () => calc.listeners.input(),
  };
}

const page = render(configSource);
assert.doesNotMatch(page.text(), /undefined|NaN|null/, "첫 화면에 undefined·NaN 이 보인다");
assert.match(page.totals(), /공급가 합계0원부가세 \(10%\)0원합계 \(VAT 포함\)0원/);

// 고관여 단가가 있으므로 계산기에서 고를 수 있다.
assert.ok(page.checkbox("influencer", "가구/병원/피부과 등 고관여 방문 키워드"));
assert.ok(page.checkbox("power-blog", "가구/병원/피부과 등 고관여 방문 키워드"));
assert.doesNotMatch(page.text(), /…/, "잘린 문장 표시(…)가 남아 있다");

// 대표 시나리오: 인플루언서 3명(회수형), 파워블로그 2명, 일반 블로그 10명.
page.count("influencer").value = "3";
page.checkbox("influencer", "회수형 체험단").checked = true;
page.count("power-blog").value = "2";
page.count("general-blog").value = "10";
page.fire();
// 3 × (300,000 + 20,000) + 2 × 250,000 + 10 × 20,000 = 1,660,000 / 부가세 166,000 / 합계 1,826,000
assert.match(page.totals(), /공급가 합계1,660,000원/);
assert.match(page.totals(), /부가세 \(10%\)166,000원/);
assert.match(page.totals(), /합계 \(VAT 포함\)1,826,000원/);
assert.equal(page.flags(), "");

// 네이버 클립은 금액 없이 "별도 문의" 안내만 붙는다.
page.checkbox("influencer", "네이버 클립 진행").checked = true;
page.fire();
assert.match(page.flags(), /네이버 인플루언서 체험단: 네이버 클립 진행 추가 비용 발생 \(별도 문의\)/);
assert.match(page.totals(), /공급가 합계1,660,000원/, "클립은 금액에 더하지 않는다");

// 잘못된 인원 입력은 0 또는 정수로 정리한다.
for (const [input, expected] of [["-3", "0원"], ["2.7", "500,000원"], ["abc", "0원"], ["", "0원"]]) {
  page.count("influencer").value = "0";
  page.count("general-blog").value = "0";
  page.count("power-blog").value = input;
  page.fire();
  assert.match(page.totals(), new RegExp("공급가 합계" + expected), `인원 "${input}"`);
  assert.doesNotMatch(page.text(), /undefined|NaN/);
}

// 고관여 단가는 기본 단가 대신 쓰이고, 회수형 추가금은 그 위에 붙는다.
const high = render(configSource);
high.count("influencer").value = "1";
high.checkbox("influencer", "가구/병원/피부과 등 고관여 방문 키워드").checked = true;
high.checkbox("influencer", "회수형 체험단").checked = true;
high.count("power-blog").value = "1";
high.checkbox("power-blog", "가구/병원/피부과 등 고관여 방문 키워드").checked = true;
high.fire();
// (400,000 + 20,000) + 350,000 = 770,000 / 부가세 77,000 / 합계 847,000
assert.match(high.totals(), /공급가 합계770,000원/);
assert.match(high.totals(), /부가세 \(10%\)77,000원/);
assert.match(high.totals(), /합계 \(VAT 포함\)847,000원/);

// 단가를 비우면(null) 계산기에서 그 옵션을 고를 수 없다.
const noHigh = configSource.replace("unitPrice: 400000 }", "unitPrice: null }");
assert.notEqual(noHigh, configSource, "null 치환이 적용되지 않았다");
assert.equal(render(noHigh).checkbox("influencer", "가구/병원/피부과 등 고관여 방문 키워드"), undefined);

// 대조 실험: 화면 코드가 기대하는 키가 빠진 옛 설정이면 검사가 실제로 걸려야 한다.
const broken = configSource.replace(/unitPrice: 300000/, "price: 300000");
const bad = render(broken);
bad.count("influencer").value = "1";
bad.fire();
assert.match(bad.text(), /undefined|NaN/, "대조 실험이 실패했다");

// 바이럴 메뉴의 네이버 블로그 카드가 이 페이지로 링크한다(JS 로 만드는 링크라 validate_site 가 보지 못한다).
global.window = global;
require("../viral-menu/pricing-config.js");
const naver = global.VIRAL_MENU_CONFIG.groups.flatMap((g) => g.campaigns).find((c) => c.id === "naver-blog");
assert.equal(naver.detailUrl, "./naver-blog/");
assert.ok(fs.existsSync(path.join(__dirname, "..", "viral-menu", "naver-blog", "index.html")));

console.log("viral-menu/naver-blog OK");
