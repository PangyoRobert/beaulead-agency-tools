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
for (const k of ["materialToSales", "composition", "income", "ratios"]) {
  assert.deepEqual(Object.keys(data[k]).sort(), [...manufacturingCodes].sort(), `${k} 업종 목록`);
}
assert.equal(data.compositionSource.table, "501Y003");
assert.equal(data.incomeSource.table, "501Y002");
assert.equal(data.materialToSales.C10, 50.43);
assert.equal(data.materialToSales.C204, 41.69);
assert.equal(data.materialToSales.C21, 21.9);
// 식료품 2024 기준값(2026-10-08 ECOS 조회): 손익계산서·비율.
assert.equal(data.income.C10.sales, 161006609);
assert.equal(data.income.C10.cogs, 127928242);
assert.deepEqual([data.ratios.C10.variableToSales, data.ratios.C10.fixedToSales, data.ratios.C10.breakEven, data.ratios.C10.operatingMargin],
  [64.61, 34.94, 91.4, 3.82]);
for (const code of manufacturingCodes) {
  const c = data.composition[code]; const inc = data.income[code]; const r = data.ratios[code];
  const pct = (x) => (x / inc.sales) * 100;
  // 당기총제조비용 = 재료비 + 노무비 + 경비, 매출 = 매출원가 + 판관비 + 영업손익 (원 자료 반올림 몇 백만원 허용)
  assert.ok(Math.abs(c.materials + c.labor + c.overhead - c.totalManufacturingCost) <= 5, `${code} 원가 합계`);
  assert.ok(Math.abs(inc.cogs + inc.sga + inc.operatingIncome - inc.sales) <= 5, `${code} 손익 합계`);
  assert.ok(c.overhead - c.depreciation - c.outsourcing - c.electricity - c.gasWater >= 0, `${code} 그 외 경비가 음수`);
  // 금액으로 계산한 비율이 한국은행 발표 비율과 같다(표시 자리수 0.01 허용).
  assert.ok(Math.abs(pct(inc.cogs) - data.values[code].A["2024"]) <= 0.01, `${code} 매출원가율 대조`);
  assert.ok(Math.abs(pct(inc.operatingIncome) - r.operatingMargin) <= 0.01, `${code} 영업이익률 대조`);
  assert.ok(Math.abs(pct(c.materials) - r.materialToSales) <= 0.02, `${code} 재료비율 대조`);
  // 공헌이익률 − 고정비율 = 세전이익률 − 영업외수익률 (한국은행 정의: 고정비에 영업외비용 포함)
  const cm = 100 - r.variableToSales;
  assert.ok(Math.abs(cm - r.fixedToSales - (r.pretaxMargin - pct(inc.nonOperatingIncome))) <= 0.05, `${code} 공헌이익 항등식`);
  // 손익분기점률 = (고정비율 − 영업외수익률) ÷ 공헌이익률
  assert.ok(Math.abs((r.fixedToSales - pct(inc.nonOperatingIncome)) / cm * 100 - r.breakEven) <= 0.3, `${code} 손익분기점 공식`);
}

// 도매·소매 업태 매출원가율(소비자가 대비 범위 계산용, 2024).
assert.deepEqual(Object.fromEntries(Object.entries(data.channels).map(([k, v]) => [k, v.cogsRatio])),
  { G46: 81.89, G4711: 71.12, G4712: 77.03, G479: 65.61, G4791: 59.4, G4718: 33.19 });

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
  "위탁생산 매입가", "매출 대비 {foodMatSales}%, 공장 원가 안에서는 {foodMatFactory}%",
  "한계이익", "판관비 전부(광고선전비·판매수수료 포함)", "실제 공헌이익률이 이 값보다 낮습니다",
  "손익분기점 매출 = (고정비 − 영업외수익) ÷ 공헌이익률", "영업외비용이 포함돼",
  "경향을 보는 대략 범위", "모든 상품의 평균", "수출·기업 납품", "할인·판촉", "백화점은 입점 수수료",
  "'참고'로만 표시", "의약품은 약값이 제도로 정해지고",
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
// 매출 100 원가 구조: 식료품 = 50.4 / 5.4 / 1.6 / 1.7 / 1.8 / 6.5 / 12.0 / 16.7 / 영업이익 3.8
const compText = fixed.get("comp-table").textContent;
assert.match(compText, /식료품C1050\.4%5\.4%1\.6%1\.7%1\.8%6\.5%12\.0%16\.7%3\.8%/);
for (const ind of config.groups[0].industries) {
  // 화면 글자가 "식료품C1050.4%"처럼 붙어 있어 코드만으로 찾으면 C107 이 다른 행에 걸릴 수 있다. 이름+코드로 찾는다.
  const label = (ind.parent ? "└ " : "") + ind.name + ind.code;
  assert.ok(compText.includes(label), `${ind.code} 행이 없다`);
  const row = compText.split(label)[1].match(/^((-?[\d.]+)%){9}/)[0].match(/-?[\d.]+/g).map(Number);
  assert.equal(row.length, 9);
  const sum = row.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) <= 0.5, `${ind.code} 매출 100 합계 ${sum}`);
}
// 공헌이익: 식료품 = 원재료비 50.4 / 변동비 64.6 / 공헌이익률 35.4 / 변동비 중 원재료비 78.1 / 고정비 34.9 / 손익분기점률 91.4 / 영업이익률 3.8
const cmText = fixed.get("cm-table").textContent;
assert.match(cmText, /식료품C1050\.4%64\.6%35\.4%78\.1%34\.9%91\.4%3\.8%/);
const exampleText = fixed.get("cm-example").textContent;
assert.match(exampleText, /식료품, 2024\): 매출 100 → 변동비 64\.6 \(그중 원재료비 50\.4\) → 공헌이익 35\.4 → 고정비 34\.9 차감, 영업외수익 2\.6 더하면 세전이익 3\.0/);
assert.match(exampleText, /손익분기점률 91\.4%라 매출이 약 8\.6% 줄면 이익이 0/);
const fills = created.filter((e) => e.className === "bar-fill");
assert.equal(fills.length, 11 * 9 + 11, "원가 구조 11×9 + 공헌이익률 11 막대(범위 막대는 따로 셈)");
assert.ok(fills.every((f) => /^\d+(\.\d)?%$/.test(f.style.width)), "막대 너비는 % 값");
assert.match(fixed.get("comp-legend").textContent, /막대 길이 = 매출 대비 비중/);
const tips = created.filter((e) => e.attrs.title).map((e) => e.attrs.title);
assert.ok(tips.includes("식료품 · 원재료비 매출 대비 50.4% (공장 원가 안에서는 74.8%)"), "툴팁에 두 기준 병기");
assert.doesNotMatch(text, /공장 원가 = 100/, "옛 '공장 원가 = 100' 표가 남아 있다");
// ── 소비자가 대비 범위 (식료품: 직거래·도매 경유 × 3개 소매 업태 = 6경로) ──
const consumerText = fixed.get("consumer-table").textContent;
assert.match(consumerText, /식료품C1067\.4%32\.9% ~ 47\.2%24\.6% ~ 35\.3%\(참고\) 36\.4%/);
assert.match(consumerText, /의료용 물질·의약품C21—약값이 제도로 정해지고/);
assert.equal(created.filter((e) => e.className === "range-fill").length, 10, "의약품을 뺀 10개 업종 범위 막대");
const channelText = fixed.get("channel-table").textContent;
assert.match(channelText, /온라인 판매 \(통신판매업\)G4791 통신 판매업59\.40%참고/);
assert.match(channelText, /백화점G47111 백화점33\.19%제외/);
assert.match(fixed.get("consumer-plain").textContent, /1,000원짜리 과자.*약 330~470원, 그중 원재료값은 약 250~350원/);
assert.equal(fixed.get("defense").children.length, 7);

// ── 쉬운 말: 용어 풀이 16개, 각 표 위 "쉽게 말하면", 자주 묻는 질문 10개 ──
assert.equal(fixed.get("glossary").children.length, 16);
for (const id of ["data-plain", "comp-plain", "cm-plain", "consumer-plain"]) {
  assert.match(fixed.get(id).textContent, /^쉽게 말하면: /, id);
}
assert.match(fixed.get("data-plain").textContent, /식료품 79\.46%는 과자를 100원어치 팔면 .* 약 79원/);
const faqItems = fixed.get("faq").children;
assert.equal(faqItems.length, 10, "자주 묻는 질문 10개");
const faqText = fixed.get("faq").textContent;
assert.match(faqText, /Q\. 손익분기점률 91\.4%는 무슨 뜻인가요\?/);
assert.match(faqText, /매출이 약 8\.6% 줄면 이익이 0/);
assert.match(faqText, /공장에서 만드는 데 약 330~470원, 그중 원재료값은 약 250~350원/);
assert.match(faqText, /'기타 화학제품'으로 묶여 있습니다\(71\.35%\)/);
assert.match(faqText, /2024년 값이며 한국은행이 2025-10-29에 공개/);
assert.doesNotMatch(text, /\{\w+\}/, "채우지 못한 자리표시가 화면에 남았다");
const caveatsRendered = fixed.get("caveats").textContent;
assert.match(caveatsRendered, /식료품 원재료비는 매출 대비 50\.4%, 공장 원가 안에서는 74\.8%/);
assert.match(caveatsRendered, /식료품은 손익분기점률이 91\.4%라 매출이 약 8\.6% 줄면 이익이 0/);
assert.match(faqText, /Q\. 식료품 원재료비가 74\.8%라고도 하고 50\.4%라고도 하던데/);

const groupsText = fixed.get("groups").textContent;
assert.equal((groupsText.match(/—/g) || []).length, 8 * 2, "규모별 값이 없는 8개 업종 × 2칸만 — 로 나온다");
assert.match(fixed.get("source").textContent, /개인사업자 제외/);
assert.match(fixed.get("footnote").textContent, /한국은행 「기업경영분석」/);

console.log("cost-ratio-benchmark OK");
