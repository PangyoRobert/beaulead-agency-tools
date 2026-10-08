const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "cost-ratio-benchmark", "index.html"), "utf8");
const fetcher = fs.readFileSync(path.join(root, "scripts", "fetch_cost_ratio.py"), "utf8");

// 설정·데이터는 HTML 안에 있다(별도 파일이면 캐시가 어긋난다). 실행 중에 API 를 부르지 않는다.
assert.doesNotMatch(html, /<script[^>]*\ssrc="\.{0,2}\/?[^"]*\.js[^"]*"/, "화면 코드가 로컬 .js 파일에 의존하면 안 된다");
assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|URLSearchParams|fetch\s*\(|XMLHttpRequest|sendBeacon|ecos\.bok\.or\.kr\/api/i);
assert.doesNotMatch(html, /ECOS_API_KEY/, "인증키 이름·값이 페이지에 들어가면 안 된다");

const configSource = html.match(/<script id="cost-ratio-config">([\s\S]*?)<\/script>/)[1];
const dataSource = html.match(/<script id="cost-ratio-data">([\s\S]*?)<\/script>/)[1];
const renderSource = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const box = {}; box.window = box;
vm.runInNewContext(configSource + "\n" + dataSource, box);
const config = JSON.parse(JSON.stringify(box.COST_RATIO_CONFIG));
const data = JSON.parse(JSON.stringify(box.COST_RATIO_DATA));
assert.ok(data, "데이터 블록이 비어 있다. python3 scripts/fetch_cost_ratio.py 를 돌린다");

// 출처: 한국은행 기업경영분석, ECOS 501Y006 / 612 매출원가대매출액.
assert.equal(data.source.table, "501Y006");
assert.equal(data.source.item, "612");
assert.equal(data.source.unit, "%");
assert.deepEqual(data.source.years, ["2020", "2021", "2022", "2023", "2024"]);

// 업종 목록은 설정·데이터·수집 스크립트 세 곳이 같아야 한다.
const configCodes = config.groups.flatMap((g) => g.industries.map((i) => i.code));
const fetchCodes = fetcher.match(/INDUSTRIES = \(([\s\S]*?)\)/)[1].match(/"([A-Z0-9]+)"/g).map((s) => s.replace(/"/g, ""));
assert.equal(configCodes.length, 14);
assert.deepEqual([...configCodes].sort(), [...fetchCodes].sort());
assert.deepEqual(Object.keys(data.values).sort(), [...fetchCodes].sort());

// 전체(A) 값은 업종마다 5년 모두 있다. 규모별(L·M) 값은 6개 업종에만 있다.
const withSizes = ["C10", "C11", "C14", "C15", "C21", "C32"];
for (const [code, v] of Object.entries(data.values)) {
  for (const y of data.source.years) {
    assert.ok(typeof v.A[y] === "number" && v.A[y] > 0 && v.A[y] < 100, `${code} ${y} 전체 값`);
  }
  const has = v.L !== null && v.M !== null;
  assert.equal(has, withSizes.includes(code), `${code} 규모별 값 유무`);
}
// 기준값(2026-10-08 ECOS 조회, 시험용 키 결과와도 일치).
assert.equal(data.values.C10.A["2024"], 79.46);
assert.equal(data.values.C10.L["2024"], 76.8);
assert.equal(data.values.C10.M["2024"], 82.2);
assert.equal(data.values.C204.A["2024"], 71.35);
assert.equal(data.values.G4791.A["2024"], 59.4);

// 재료비율(매출 대비, 617)과 제조원가 구성(501Y003)은 제조업 11개 업종만.
const manufacturingCodes = fetchCodes.filter((c) => c.startsWith("C"));
assert.equal(manufacturingCodes.length, 11);
assert.deepEqual(Object.keys(data.materialToSales).sort(), [...manufacturingCodes].sort());
assert.deepEqual(Object.keys(data.composition).sort(), [...manufacturingCodes].sort());
assert.equal(data.compositionSource.table, "501Y003");
assert.equal(data.materialToSales.C10, 50.43);
assert.equal(data.materialToSales.C204, 41.69);
assert.equal(data.materialToSales.C21, 21.9);
for (const [code, c] of Object.entries(data.composition)) {
  // 당기총제조비용 = 재료비 + 노무비 + 경비 (원 자료 반올림 차이 몇 백만원까지 허용)
  assert.ok(Math.abs(c.materials + c.labor + c.overhead - c.totalManufacturingCost) <= 5, `${code} 원가 합계`);
  const rest = c.overhead - c.depreciation - c.outsourcing - c.electricity - c.gasWater;
  assert.ok(rest >= 0, `${code} 그 외 경비가 음수`);
  assert.ok(c.materials / data.materialToSales[code] > 0, `${code} 재료비`);
}
assert.equal(data.composition.C10.totalManufacturingCost, 108562763);
assert.equal(data.composition.C10.materials, 81200132);

// 원가 기준이 다른 업종은 다른 묶음에 있다.
assert.deepEqual(config.groups.map((g) => [g.id, g.basis]), [
  ["manufacturing", "원가 = 제조원가"],
  ["retail", "원가 = 상품 매입원가"],
  ["food-service", "원가 = 식자재 등"],
]);
const byCode = Object.fromEntries(config.groups.flatMap((g) => g.industries.map((i) => [i.code, i])));
assert.match(byCode.C204.flag, /화장품 단독 아님/);

// 주의사항은 전부 병기한다(2026-10-08 담당자 요청). 사용자가 지정한 문단은 문구 그대로.
const caveatText = JSON.stringify(config.caveats);
for (const must of [
  "개인사업자는 빠집니다", "961,336", "2025-10-29", "매출 비중이 가장 큰 업종",
  "화장품만 따로 볼 수 없습니다", "제품 단위 값은 없습니다", "6개 업종만",
  "대기업 영향이 큽니다", "분포(상위·중위·하위)는 보여 줄 수 없습니다",
  "업종끼리 원가의 뜻이 다릅니다.",
  "제조업(식료품·의복 등): 원재료비, 생산 인건비, 공장 감가상각까지 포함한 제조원가입니다.",
  "소매업·통신판매업: 상품을 사 온 매입원가입니다.",
  "음식점: 식자재 등입니다.",
  "그래서 '식료품 79% vs 통신판매업 59%'를 나란히 놓고 효율이 좋다·나쁘다로 비교하면 안 됩니다.",
  "브랜드사 원가율과 다릅니다", "통신판매업도 한 가지 모델이 아닙니다",
  "제조업에서만 제공합니다", "부재료(포장재 등)", "당기총제조비용", "복리후생비는 '그 외 공장 경비'",
  "위탁생산 매입가",
]) {
  assert.ok(caveatText.includes(must), `주의사항 누락: ${must}`);
}

// ── 화면 코드를 실행한다 ──
class El {
  constructor() { this.children = []; this._text = ""; this.className = ""; this.attrs = {}; this.style = {}; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  append(...n) { this.children.push(...n); }
  setAttribute(k, v) { this.attrs[k] = v; }
}
const fixed = new Map(); const created = [];
const document = {
  createElement() { const e = new El(); created.push(e); return e; },
  getElementById(id) { if (!fixed.has(id)) fixed.set(id, new El()); return fixed.get(id); },
};
const sb = { document }; sb.window = sb;
vm.runInNewContext(configSource + "\n" + dataSource + "\n" + renderSource, sb);
const text = [...fixed.values()].map((e) => e.textContent).join("\n");
assert.doesNotMatch(text, /undefined|NaN|null|\[object/, "화면에 undefined·NaN 이 보인다");
assert.match(text, /식료품C1079\.46%76\.80%82\.20%50\.43%78\.81%79\.55%80\.70%80\.02%79\.46%/);
// 제조원가 구성: 식료품 = 원재료비 74.8 / 생산 인건비 8.0 / 감가상각 2.3 / 외주가공 2.5 / 전력·가스·수도 2.7 / 그 외 9.7
const compText = fixed.get("comp-table").textContent;
assert.match(compText, /식료품C1074\.8%8\.0%2\.3%2\.5%2\.7%9\.7%/);
for (const ind of config.groups[0].industries) {
  // 화면 글자가 "식료품C1074.8%"처럼 붙어 있어 코드만으로 찾으면 C107 이 C10 행의 "C1074.8"에 걸린다. 이름+코드로 찾는다.
  const label = (ind.parent ? "└ " : "") + ind.name + ind.code;
  assert.ok(compText.includes(label), `${ind.code} 행이 없다`);
  const row = compText.split(label)[1].match(/^([\d.]+)%([\d.]+)%([\d.]+)%([\d.]+)%([\d.]+)%([\d.]+)%/);
  const sum = row.slice(1).map(Number).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) <= 0.3, `${ind.code} 구성비 합계 ${sum}`);
}
const fills = created.filter((e) => e.className === "bar-fill");
assert.equal(fills.length, 11 * 6, "업종 11 × 항목 6 막대");
assert.ok(fills.every((f) => /^\d+(\.\d)?%$/.test(f.style.width)), "막대 너비는 % 값");
assert.match(fixed.get("comp-legend").textContent, /막대 길이 = 그 항목이 공장 원가에서 차지하는 비중/);
const groupsText = fixed.get("groups").textContent;
assert.equal((groupsText.match(/—/g) || []).length, 8 * 2, "규모별 값이 없는 8개 업종 × 2칸만 — 로 나온다");
assert.match(fixed.get("source").textContent, /개인사업자 제외/);
assert.match(fixed.get("footnote").textContent, /한국은행 「기업경영분석」/);

console.log("cost-ratio-benchmark OK");
