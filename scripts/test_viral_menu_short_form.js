const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "viral-menu", "short-form", "index.html"), "utf8");

// 설정은 index.html 안에 있다(별도 .js 파일이면 캐시가 어긋나 옛 설정이 섞인다).
assert.doesNotMatch(html, /<script[^>]*\ssrc="\.{0,2}\/?[^"]*\.js[^"]*"/, "화면 코드가 로컬 .js 파일에 의존하면 안 된다");
const configSource = html.match(/<script id="short-form-config">([\s\S]*?)<\/script>/)[1];
const renderSource = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const box = {}; box.window = box; vm.runInNewContext(configSource, box);
const config = JSON.parse(JSON.stringify(box.SHORT_FORM_CONFIG));

// 원본 이미지(2026-10-06 사용자 제공) 그대로의 값.
assert.equal(config.mustRead.length, 3);
assert.match(config.mustRead[2].text, /섭외 비용 10만원/);
assert.equal(config.campaign.price, "TBA");
assert.equal(config.campaign.remarks.length, 5);
assert.match(config.campaign.remarks[3].text, /최소 집행 예산 : 300만원 이상/);
assert.equal(config.seedingProcess.length, 9);
assert.equal(config.creatorProcess.length, 9);
assert.deepEqual(config.categoryRefs.map((r) => r.category), ["뷰티 - 방문형", "뷰티 - 리뷰형", "먹스타그램", "패션"]);
assert.deepEqual(config.creatorRefs.map((r) => r.category), ["스킨케어", "색조", "올리브영", "다이소", "쿠팡", "콜라보"]);

// 크리에이터 10명 단가(단위: 만원, null = 원본의 빈 칸).
const table = config.creators.map((c) => [c.no, c.nickname, c.single, c.mirror2, c.mirror3, c.secondUse]);
assert.deepEqual(table, [
  [1, "현징이", null, null, 150, null],
  [2, "뷰요미", 100, 150, 200, 50],
  [3, "뷰돈나", null, null, 100, null],
  [4, "정윤경", null, null, 350, 100],
  [5, "영돌", null, null, "업데이트 예정", "업데이트 예정"],
  [6, "리뷰하는 미미짱", null, null, 500, 150],
  [7, "리뷰한다 송미니", null, null, 500, 50],
  [8, "리뷰인가예", null, null, 250, 40],
  [9, "리뷰는다롱", null, null, 200, 40],
  [10, "우쥬", 100, 180, 260, 100],
]);
assert.equal(config.creators[1].singleNote, "IG만, YT/TT 단독불가");

// 바로가기 링크는 아직 전부 비어 있다(담당자가 추후 추가).
const allUrls = [...config.categoryRefs, ...config.creatorRefs].map((r) => r.url)
  .concat(config.creators.flatMap((c) => Object.values(c.links)));
assert.equal(allUrls.length, 4 + 6 + 30);
assert.ok(allUrls.every((u) => u === ""), "링크는 아직 비워 둔다");

// 공개 저장소 규칙.
assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.(search|hash)|history\.(push|replace)State|fetch\s*\(|XMLHttpRequest|sendBeacon|<form[^>]*action/i);

// ── 화면 코드를 실행한다 ──
class El {
  constructor() { this.children = []; this._text = ""; this.className = ""; this.href = ""; this.attrs = {}; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  append(...n) { this.children.push(...n); }
  setAttribute(k, v) { this.attrs[k] = v; }
}
function render(src) {
  const created = []; const fixed = new Map();
  const document = {
    createElement() { const e = new El(); created.push(e); return e; },
    getElementById(id) { if (!fixed.has(id)) fixed.set(id, new El()); return fixed.get(id); },
  };
  const sb = { document }; sb.window = sb;
  vm.runInNewContext(src + "\n" + renderSource, sb);
  return { text: [...fixed.values()].map((e) => e.textContent).join("\n"), links: created.filter((e) => e.className === "ref-link"), fixed };
}

const page = render(configSource);
assert.doesNotMatch(page.text, /undefined|NaN|null|\[object/, "화면에 undefined·null 이 보인다");
assert.equal(page.links.length, 0, "비어 있는 링크는 그리지 않는다");
const creatorText = page.fixed.get("creator-table").textContent;
assert.match(creatorText, /우쥬100180260100/);
assert.match(creatorText, /뷰요미100\(IG만, YT\/TT 단독불가\)15020050/);
assert.equal((creatorText.match(/—/g) || []).length, 8 * 2 + 2, "원본의 빈 칸 18개(단일·2채널 8명×2, 2차 활용 2명)가 — 로 나온다");

// 주소를 넣으면 https:// 만 새 탭 링크가 되고, 다른 스킴은 무시한다.
const withLinks = configSource
  .replace('category: "뷰티 - 방문형", url: ""', 'category: "뷰티 - 방문형", url: "https://example.com/a"')
  .replace('category: "패션", url: ""', 'category: "패션", url: "javascript:alert(1)"');
const linked = render(withLinks);
assert.equal(linked.links.length, 1);
assert.equal(linked.links[0].href, "https://example.com/a");
assert.equal(linked.links[0].rel, "noopener noreferrer");

// 바이럴 메뉴 숏폼 카드가 이 페이지로 링크한다(JS 로 만드는 링크라 validate_site 가 보지 못한다).
global.window = global;
require("../viral-menu/pricing-config.js");
const sf = global.VIRAL_MENU_CONFIG.groups.flatMap((g) => g.campaigns).find((c) => c.id === "short-form");
assert.equal(sf.detailUrl, "./short-form/");
assert.equal(sf.detailLabel, "상세 보기 →");

console.log("viral-menu/short-form OK");
