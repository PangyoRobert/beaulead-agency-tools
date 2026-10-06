const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "cafe24-maintenance");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

// 설정은 index.html 안에 있다. 별도 .js 파일이면 브라우저가 파일마다 따로 캐시해서(GitHub Pages
// max-age=600) 새 HTML 에 옛 설정이 섞이고, 화면에 undefined·NaN 이 나온다(2026-10-06 실제 사고).
assert.doesNotMatch(html, /<script[^>]*\ssrc="\.{0,2}\/?[^"]*\.js[^"]*"/, "화면 코드가 로컬 .js 파일에 의존하면 안 된다");
const configMatch = html.match(/<script id="maintenance-config">([\s\S]*?)<\/script>/);
const renderMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(configMatch && renderMatch, "설정 스크립트와 렌더 스크립트가 index.html 에 있어야 한다");
const configSource = configMatch[1];
const renderSource = renderMatch[1];

function loadConfig(source) {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  // 다른 realm 의 배열·객체와 deepEqual 이 어긋나지 않게 JSON 으로 옮긴다.
  return JSON.parse(JSON.stringify(sandbox.CAFE24_MAINTENANCE_CONFIG));
}
const config = loadConfig(configSource);

// 확정값: 6개월 총액 100만원(공급가), 6개월간 18회 이내, 3개월씩 2회 분할, 6개월 단위 계약만 안내한다.
assert.equal(config.vatRate, 0.1);
const { plan } = config;
assert.equal(plan.termMonths, 6);
assert.equal(plan.totalSupplyPrice, 1000000);
assert.equal(plan.includedCount, 18);
assert.equal(plan.contract, "6개월 단위");
assert.equal(plan.installmentCount, 2);
assert.equal(plan.termMonths / plan.installmentCount, 3);
assert.ok(Number.isInteger(plan.totalSupplyPrice / plan.installmentCount), "분할 금액은 원 단위 정수여야 한다");

// 포함 업무 2분류, 별도 산정 3종.
assert.deepEqual(config.included.map((g) => g.id), ["publishing", "operation"]);
assert.deepEqual(config.separate.items, ["신규 내용 추가", "디자인 변경", "배너·상세페이지 제작"]);

// 업체별 값은 client 블록에만 있다.
const { client } = config;
assert.equal(client.name, "", "업체명 기본값은 비어 있어야 한다");
assert.ok(client.skin);
assert.ok(client.integrations.length > 0 && client.history.types.length > 0 && client.history.monthlyEstimate);

// 공개 저장소: 실제 업체명이 들어오지 않는다. 본문도 업체명을 직접 쓰지 않는다.
const REAL_NAMES = /유투|u2sports|kumkang/i;
assert.doesNotMatch(html, REAL_NAMES);
assert.ok(html.includes("data-client-name"), "업체명은 data-client-name 자리로만 쓴다");

// 제목은 "유지보수 현황표"이고, 이전 기준(월 단위 요금·"안내" 제목·가공 업체명)이 남아 있으면 안 된다.
assert.match(html, /<h1>[^<]*<span id="client-line" hidden>[\s\S]*?카페24 자사몰 유지보수 현황표<\/h1>/);
assert.match(html, /<title>카페24 자사몰 유지보수 현황표 · Beaulead Agency Tools<\/title>/);
// "6개월 단위"처럼 "개월"은 새 문구이므로 제외하고, 단독 "월" 기준 표현만 옛 기준으로 본다.
for (const stale of [/(?<!개)월 단위/, /(?<!개)월 유지보수/, /(?<!개)월 포함/, /유지보수 안내/, /○○스포츠/, /monthlyFee/, /includedCountPerMonth/]) {
  assert.doesNotMatch(html, stale);
}

// 입력값을 밖으로 내보내는 경로가 없어야 한다(AGENTS.md 공개 저장소 안전 규칙).
const FORBIDDEN = /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.(search|hash)|history\.(push|replace)State|fetch\s*\(|XMLHttpRequest|sendBeacon|<form[^>]*action/i;
assert.doesNotMatch(html, FORBIDDEN);

// 원가·마진은 공개 저장소에 두지 않는다.
assert.doesNotMatch(JSON.stringify(config), /원가|마진|cost|margin/i);

// ── 화면 코드를 실제로 실행해 undefined·NaN 이 보이는지 본다 ─────────────────────────────
class El {
  constructor() { this.children = []; this._text = ""; this.className = ""; this.hidden = false; this.value = ""; this.placeholder = ""; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute() {}
  addEventListener() {}
}

function renderText(configSourceText) {
  const byId = new Map();
  const slot = new El();
  const document = {
    createElement: () => new El(),
    getElementById: (id) => { if (!byId.has(id)) byId.set(id, new El()); return byId.get(id); },
    querySelectorAll: () => [slot],
  };
  const sandbox = { document, Intl };
  sandbox.window = sandbox;
  vm.runInNewContext(configSourceText + "\n" + renderSource, sandbox);
  return [...byId.values(), slot].map((el) => el.textContent).join("\n");
}

const rendered = renderText(configSource);
assert.doesNotMatch(rendered, /undefined|NaN|null/, "화면에 undefined·NaN 이 보인다");
assert.match(rendered, /6개월 유지보수비1,000,000원/);
assert.match(rendered, /VAT 포함 1,100,000원/);
assert.match(rendered, /3개월씩 2회 분할 납부 \(회당 500,000원, VAT 포함 550,000원\)/);
assert.match(rendered, /6개월간 18회 이내/);

// 대조 실험: 옛 설정(월 단위 기준 키)을 새 화면 코드에 섞으면 위 검사가 실제로 걸려야 한다.
const staleConfig = `window.CAFE24_MAINTENANCE_CONFIG = Object.freeze({ vatRate: 0.1,
  client: Object.freeze({ name: "○○스포츠", skin: "s", integrations: [], history: { types: [], monthlyEstimate: "e" } }),
  plan: Object.freeze({ monthlyFeeSupplyPrice: 500000, includedCountPerMonth: 3, contract: "월 단위" }),
  included: [], separate: { name: "n", items: [] }, extraFees: { name: "n", items: [], free: [] }, limits: { name: "n", items: [] } });`;
assert.match(renderText(staleConfig), /undefined|NaN/, "대조 실험이 실패했다: 옛 설정을 섞어도 검사가 걸리지 않는다");

console.log("cafe24-maintenance OK");
