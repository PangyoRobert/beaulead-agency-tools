const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../cafe24-maintenance/maintenance-config.js");
const config = global.CAFE24_MAINTENANCE_CONFIG;

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

// 업체별 값은 client 블록에만 있다. 필수 키가 비면 화면이 비어 보인다.
const { client } = config;
assert.equal(client.name, "", "업체명 기본값은 비어 있어야 한다");
assert.ok(client.skin);
assert.ok(client.integrations.length > 0 && client.history.types.length > 0 && client.history.monthlyEstimate);

const dir = path.join(__dirname, "..", "cafe24-maintenance");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const configSource = fs.readFileSync(path.join(dir, "maintenance-config.js"), "utf8");

// 공개 저장소: 기본값은 가공 이름이고 실제 업체명이 들어오지 않는다. 본문도 업체명을 직접 쓰지 않는다.
const REAL_NAMES = /유투|u2sports|kumkang/i;
assert.doesNotMatch(client.name, REAL_NAMES);
assert.doesNotMatch(html, REAL_NAMES);
assert.doesNotMatch(configSource, REAL_NAMES);
assert.ok(html.includes("data-client-name"), "업체명은 data-client-name 자리로만 쓴다");

// 제목은 "유지보수 현황표"이고, 이전 기준(월 단위 요금·"안내" 제목·가공 업체명)이 남아 있으면 안 된다.
assert.match(html, /<h1>[^<]*<span id="client-line" hidden>[\s\S]*?카페24 자사몰 유지보수 현황표<\/h1>/);
assert.match(html, /<title>카페24 자사몰 유지보수 현황표 · Beaulead Agency Tools<\/title>/);
// "6개월 단위"처럼 "개월"(6개월 단위 등)은 새 문구이므로 제외하고, 단독 "월" 기준 표현만 옛 기준으로 본다.
for (const stale of [/(?<!개)월 단위/, /(?<!개)월 유지보수/, /(?<!개)월 포함/, /유지보수 안내/, /○○스포츠/, /monthlyFee/, /includedCountPerMonth/]) {
  assert.doesNotMatch(html, stale);
  assert.doesNotMatch(configSource, stale);
}

// 입력값을 밖으로 내보내는 경로가 없어야 한다(AGENTS.md 공개 저장소 안전 규칙).
const FORBIDDEN = /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.(search|hash)|history\.(push|replace)State|fetch\s*\(|XMLHttpRequest|sendBeacon|<form[^>]*action/i;
assert.doesNotMatch(html, FORBIDDEN);
assert.doesNotMatch(configSource, FORBIDDEN);

// 원가·마진은 공개 저장소에 두지 않는다.
assert.doesNotMatch(JSON.stringify(config), /원가|마진|cost|margin/i);

console.log("cafe24-maintenance config OK");
