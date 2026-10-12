const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "viral-menu", "sns-power-page", "index.html"), "utf8");

// 설정은 index.html 안에 있다(별도 .js 파일이면 캐시가 어긋나 옛 설정이 섞인다).
assert.doesNotMatch(html, /<script[^>]*\ssrc="\.{0,2}\/?[^"]*\.js[^"]*"/, "화면 코드가 로컬 .js 파일에 의존하면 안 된다");
const configSource = html.match(/<script id="sns-power-page-config">([\s\S]*?)<\/script>/)[1];
const renderSource = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const box = {}; box.window = box; vm.runInNewContext(configSource, box);
const config = JSON.parse(JSON.stringify(box.SNS_POWER_PAGE_CONFIG));

// 원본 이미지(2026-10-06 사용자 제공) 그대로의 구조.
assert.equal(config.updated, "2026.07");
assert.equal(config.process.length, 4);
assert.equal(config.process[2].items.length, 4);
assert.equal(config.process[2].items[3].em, true);
assert.equal(config.process[3].items.length, 2);
assert.equal(config.notes.length, 11);
assert.equal(config.listNotes.length, 3);

// 제작·구매·방문촬영비(단위: 원).
assert.deepEqual(config.makeCosts.map((r) => [r.label, r.price]), [["SNS 파워 페이지 - 카드뉴스", 300000], ["숏폼 콘텐츠 제작", 400000]]);
assert.match(config.makeCosts[1].note, /TTS 진행 시 20만원 비용 추가/);
assert.deepEqual(config.buyCosts.rows.map((r) => [r.price, r.remark]), [[400000, "PSD 파일제공 불가"], [600000, "최종본만 제공"]]);
assert.deepEqual(config.visit.rows.map((r) => r.price), [50000, 250000, "개별 문의"]);
// 원본의 예시 계산이 맞는지: 65만 = 40만 + 25만, 35만 = 30만 + 5만.
assert.match(config.visit.examples[0], /65만원 \( 릴스 제작 비용 40만원 \+ 방문촬영 비용 25만원 \)/);
assert.match(config.visit.examples[1], /35만원 \( 카드뉴스 제작 비용 30만원 \+ 부천 근처 5만원 \)/);
assert.equal(config.makeCosts[1].price + config.visit.rows[1].price, 650000, "숏폼 제작 40만 + 인천/서울 방문 25만 = 예시의 65만원");
assert.equal(config.makeCosts[0].price + config.visit.rows[0].price, 350000, "카드뉴스 제작 30만 + 부천 근처 5만 = 예시의 35만원");
assert.equal(config.revise.length, 3);
assert.match(config.revise[1].text, /30,000원/);

// 채널 리스트(2026.07): 76개 채널, 80개 계정(FB 4개 + IG 76개).
const channels = config.channels;
assert.equal(channels.length, 76);
assert.equal(channels.reduce((s, c) => s + c.accounts.length, 0), 80);
assert.equal(new Set(channels.map((c) => c.name)).size, 76, "채널명이 중복되면 안 된다");
const byCategory = {};
channels.forEach((c) => { byCategory[c.category] = (byCategory[c.category] || 0) + 1; });
assert.deepEqual(byCategory, { "정보/꿀팁": 55, "연예 & 아이돌": 2, "여행": 6, "장소": 1, "팝업/전시": 5, "축제": 1, "팝업": 4, "팝업/뷰티": 1, "카페": 1 });
assert.deepEqual(channels.flatMap((c) => c.accounts).reduce((m, a) => { m[a.platform] = (m[a.platform] || 0) + 1; return m; }, {}), { IG: 76, FB: 4 });

// 단가는 개별+동시비용 구조이거나 합쳐진 단가 둘 중 하나여야 한다.
channels.forEach((c) => {
  assert.ok(c.accounts.length >= 1 && c.accounts.every((a) => Number.isInteger(a.followers) && a.followers > 0), `${c.name}: 팔로워`);
  assert.ok((c.flat === null) !== (c.together === null), `${c.name}: flat 과 together 중 정확히 하나`);
  if (c.together !== null) assert.ok(Number.isInteger(c.together), `${c.name}: 동시비용`);
});
const bundles = channels.filter((c) => c.together !== null);
assert.deepEqual(bundles.map((c) => [c.name, c.together, c.accounts.map((a) => a.individual)]), [["20대 뭐 하지?", 90, [70, 70]], ["청춘을 즐겨라", 55, [null, 50]]]);

// 값 스팟 체크(원본 이미지 대조용): 맨 처음·맨 끝·합쳐진 칸·피드/릴스 단가.
const at = (name) => channels.find((c) => c.name === name);
assert.deepEqual([at("자취생으로살아남기(life)").accounts[0].followers, at("자취생으로살아남기(life)").flat], [603000, "150~"]);
assert.deepEqual([at("인싸요정").accounts[0].followers, at("인싸요정").flat], [267000, 120]);
assert.deepEqual([at("20대 뭐 하지?").accounts.map((a) => a.followers)], [[1390000, 667000]]);
assert.deepEqual([at("감성여행").accounts.map((a) => a.followers), at("감성여행").flat], [[40000, 30000], 50]);
assert.deepEqual([at("썸데이").flat, at("팝업요정 당니").flat, at("뷰파").flat], ["피드 80 / 릴스 100", "피드 40 / 릴스 60", "피드 30 / 릴스 50"]);
assert.deepEqual([at("카페를 즐겨라").accounts[0].followers, at("카페를 즐겨라").flat], [33000, 50]);

// 링크는 아직 전부 비어 있다(이미지에서 주소를 정확히 옮길 수 없다).
assert.ok(channels.flatMap((c) => c.accounts).every((a) => a.url === ""), "링크는 아직 비워 둔다");

// 공개 저장소 규칙.
assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.(search|hash)|history\.(push|replace)State|fetch\s*\(|XMLHttpRequest|sendBeacon|<form[^>]*action/i);

// ── 화면 코드를 실행한다 ──
class El {
  constructor() { this.children = []; this._text = ""; this.className = ""; this.href = ""; this.attrs = {}; this.listeners = {}; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  append(...n) { this.children.push(...n); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  get parentNode() { return this._parent || (this._parent = new El()); }
}
function render(src) {
  const created = []; const fixed = new Map();
  const document = {
    createElement() { const e = new El(); created.push(e); return e; },
    getElementById(id) { if (!fixed.has(id)) fixed.set(id, new El()); return fixed.get(id); },
  };
  const sb = { document, Intl }; sb.window = sb;
  vm.runInNewContext(src + "\n" + renderSource, sb);
  return { text: [...fixed.values()].map((e) => e.textContent).join("\n"), created, fixed };
}

const page = render(configSource);
assert.doesNotMatch(page.text, /undefined|NaN|null|\[object/, "화면에 undefined·null 이 보인다");
const table = page.fixed.get("channel-table");
const rows = table.children[1].children;
assert.equal(rows.length, 80, "계정 80개가 행 80개로 그려진다");
assert.equal(page.created.filter((e) => e.className === "ref-link").length, 0, "비어 있는 링크는 그리지 않는다");
assert.equal(table.children[0].children[0].children.length, 6, "링크가 없으면 링크 열을 그리지 않는다(구분·플랫폼·채널명·팔로워·개별·동시)");

// 합쳐진 단가는 두 칸을 차지하고, 멀티 플랫폼 채널은 rowspan 으로 묶인다.
const firstRow = rows[0];
assert.match(firstRow.textContent, /정보\/꿀팁IG자취생으로살아남기\(life\)603,000150~/);
const mergedCell = firstRow.children.find((c) => c.attrs.colspan === "2");
assert.ok(mergedCell, "합쳐진 단가 칸에 colspan=2");
const twenty = rows.findIndex((r) => r.textContent.includes("20대 뭐 하지?"));
assert.match(rows[twenty].textContent, /FB.*1,390,000.*70.*90/);
assert.match(rows[twenty + 1].textContent, /^IG667,00070$/, "둘째 줄은 플랫폼·팔로워·개별단가만");
const young = rows.findIndex((r) => r.textContent.includes("청춘을 즐겨라"));
assert.match(rows[young].textContent, /FB.*42,000—55/, "원본이 '-' 로 비운 칸은 — 로 나온다");

// 구분 필터가 채널 수와 맞게 동작한다.
const chips = page.fixed.get("filters").children.map((li) => li.children[0]);
assert.equal(chips.length, 1 + 9, "전체 + 구분 9개");
chips[0].listeners.click();
assert.equal(table.children[1].children.length, 80);
const travel = chips.find((b) => b.textContent.startsWith("여행"));
travel.listeners.click();
assert.equal(table.children[1].children.length, 8, "여행 6개 채널 = 계정 8개(FB 2개 포함)");
assert.equal(travel.attrs["aria-pressed"], "true");
assert.equal(chips[0].attrs["aria-pressed"], "false");
const popup = chips.find((b) => b.textContent === "팝업4");
popup.listeners.click();
assert.equal(table.children[1].children.length, 4);

// 주소를 넣으면 링크 열이 생기고 https:// 만 새 탭 링크가 된다. 다른 스킴은 무시한다.
const withLinks = configSource.replace('accounts: accounts(list), flat: price', 'accounts: accounts(list).map(function (a) { return a.platform === "IG" && a.followers === 267000 ? Object.freeze(Object.assign({}, a, { url: "https://example.com/a" })) : a.platform === "IG" && a.followers === 88000 ? Object.freeze(Object.assign({}, a, { url: "javascript:alert(1)" })) : a; }), flat: price');
const linked = render(withLinks);
const linkedTable = linked.fixed.get("channel-table");
assert.equal(linkedTable.children[0].children[0].children.length, 7, "링크가 하나라도 있으면 링크 열이 생긴다");
const anchors = linked.created.filter((e) => e.className === "ref-link");
assert.equal(anchors.length, 1);
assert.equal(anchors[0].href, "https://example.com/a");
assert.equal(anchors[0].rel, "noopener noreferrer");

// 바이럴 메뉴 SNS 파워페이지 카드가 이 페이지로 링크한다(JS 로 만드는 링크라 validate_site 가 보지 못한다).
global.window = global;
require("../viral-menu/pricing-config.js");
const sp = global.VIRAL_MENU_CONFIG.groups.flatMap((g) => g.campaigns).find((c) => c.id === "sns-power-page");
assert.equal(sp.detailUrl, "./sns-power-page/");
assert.equal(sp.detailLabel, "상세 보기 →");
assert.ok(fs.existsSync(path.join(__dirname, "..", "viral-menu", "sns-power-page", "index.html")));

console.log("viral-menu/sns-power-page OK");
