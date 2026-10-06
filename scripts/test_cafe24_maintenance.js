const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../cafe24-maintenance/maintenance-config.js");
const config = global.CAFE24_MAINTENANCE_CONFIG;

// 확정값: 월 50만원(공급가), 월 3회 이내, 월 단위 계약만 안내한다.
assert.equal(config.vatRate, 0.1);
assert.equal(config.plan.monthlyFeeSupplyPrice, 500000);
assert.equal(config.plan.includedCountPerMonth, 3);
assert.equal(config.plan.contract, "월 단위");

// 포함 업무 2분류, 별도 산정 3종.
assert.deepEqual(config.included.map((g) => g.id), ["publishing", "operation"]);
assert.deepEqual(config.separate.items, ["신규 내용 추가", "디자인 변경", "배너·상세페이지 제작"]);

// 업체별 값은 client 블록에만 있다. 필수 키가 비면 화면이 비어 보인다.
const { client } = config;
assert.ok(client.name && client.skin);
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

// 입력값을 밖으로 내보내는 경로가 없어야 한다(AGENTS.md 공개 저장소 안전 규칙).
const FORBIDDEN = /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.(search|hash)|history\.(push|replace)State|fetch\s*\(|XMLHttpRequest|sendBeacon|<form[^>]*action/i;
assert.doesNotMatch(html, FORBIDDEN);
assert.doesNotMatch(configSource, FORBIDDEN);

// 원가·마진은 공개 저장소에 두지 않는다.
assert.doesNotMatch(JSON.stringify(config), /원가|마진|cost|margin/i);

console.log("cafe24-maintenance config OK");
