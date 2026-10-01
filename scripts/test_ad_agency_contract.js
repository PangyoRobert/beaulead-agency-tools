const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../ad-agency-contract/contract-config.js");
const contract = require("../ad-agency-contract/contract.js");
const config = global.AD_AGENCY_CONTRACT_CONFIG;

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

const plain = (segments) => segments.map((s) => (s.field ? s.value : s.text)).join("");

// 가공 샘플. 실제 고객사 정보는 테스트에도 쓰지 않는다.
const sample = {
  clientName: "주식회사 ○○",
  brandName: "○○몰",
  clientBizNo: "1234567890",
  clientCeoTitle: "대표이사",
  clientCeoName: "홍길동",
  contractDate: "2026-08-20",
  startDate: "2026-08-20",
  endDate: "2026-09-19",
  contractName: "온라인 광고대행",
  amountMode: "text",
  totalAmountText: "월별 매체별 진행",
  paymentTerms: "제7조 “광고비용의 청구 및 지급” 참조",
  attachments: "",
  scheduleRows: [],
  specialTerms: ""
};

// 날짜 — 원본 계약(8/20 ~ 9/19)은 정확히 1개월이다.
check(contract.formatDateKo("2026-08-20"), "2026년 8월 20일", "한국어 날짜");
check(contract.formatDateKo("2026-02-30"), "", "없는 날짜는 빈 값");
check(contract.termEnd("2026-08-20", 1), "2026-09-19", "1개월 종료일");
check(contract.termEnd("2026-01-31", 1), "2026-02-28", "다음 달에 같은 날이 없으면 그 달 말일");
check(contract.termEnd("2026-11-01", 3), "2027-01-31", "해를 넘긴다");
check(contract.exactMonths("2026-08-20", "2026-09-19"), 1, "정확히 1개월");
check(contract.exactMonths("2026-08-20", "2026-09-20"), null, "하루 더 길면 개월 수가 아니다");
check(contract.termPhrase("2026-08-20", "2026-09-19"), "2026년 8월 20일부터 1개월간으로", "개월 수로 표현");
check(contract.termPhrase("2026-08-20", "2026-10-05"), "2026년 8월 20일부터 2026년 10월 5일까지로", "개월 수가 아니면 종료일까지");

check(contract.formatBizNo("1234567890"), "123-45-67890", "사업자번호 하이픈");
check(contract.formatBizNo("123-45"), "123-45", "10자리가 아니면 그대로");

// 원본 조항 수 13개, 번호가 1부터 끊김 없이 이어진다.
const model = contract.build(sample, config);
check(model.articles.length, 13, "원본 13개 조");
check(model.articles.map((a) => a.no), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], "조 번호 연속");
model.articles.forEach((article) => {
  article.paragraphs.forEach((paragraph) => {
    check(paragraph.items.map((i) => i.marker), paragraph.items.map((_, n) => `${n + 1}.`), `${article.heading} 호는 1부터`);
  });
});
check(model.articles[2].paragraphs[0].items.length, 4, "제3조 1항 호 4개(원본 2~5호)");
check(model.articles[7].paragraphs[0].items.length, 5, "제8조 1항 호 5개(원본 2~6호)");
check(model.articles[7].paragraphs.map((p) => p.marker), ["①", "②", "③", "④"], "제8조 항 번호");
check(model.articles[4].paragraphs[0].marker, "", "항이 하나면 번호를 달지 않는다");

// 입력값이 모든 자리에 같은 값으로 들어간다(원본은 표지·전문과 서명란의 상호가 달랐다).
const preamble = plain(model.preamble);
assert.ok(preamble.startsWith("“주식회사 ○○”(이하 “갑”이라 한다)"), "전문 갑 상호");
assert.ok(preamble.includes("“○○몰”(이하 “본 사업”이라 한다)"), "전문 브랜드명 — 원본의 '브랜드명' 자리표시가 남지 않는다");
checks += 2;
check(plain(model.party.client.name), "주식회사 ○○", "서명란 상호");
check(plain(model.party.client.bizNo), "123-45-67890", "서명란 사업자번호");
check(plain(model.party.client.ceo), "대표이사 홍길동", "서명란 대표자");
check(plain(model.contractDate), "2026년 8월 20일", "계약일");
check(plain(model.articles[3].paragraphs[0].segments), "본 계약은 계약 체결일로부터 효력이 발생하며, 계약기간은 2026년 8월 20일부터 1개월간으로 한다.", "제4조 1항");
check(plain(model.articles[6].paragraphs[0].bullets[0].segments), `현금 입금계좌 : ${config.agency.bankAccount}`, "제7조 계좌");
check(plain(model.articles[12].paragraphs[0].segments).includes("서울중앙지방법원을 전속 관할법원"), true, "관할법원");
check(model.summary.map((row) => plain(row.value)), [
  "온라인 광고대행",
  "월별 매체별 진행",
  "2026년 8월 20일 ~ 2026년 9월 19일",
  "제7조 “광고비용의 청구 및 지급” 참조",
  ""
], "계약의 요강");
check(model.issues, [], "샘플은 경고가 없다");
check(contract.blanks(model), ["붙임문서"], "비워 둔 붙임문서만 빈칸");

// 채우지 않은 {{ }} 가 문서에 남지 않는다.
const allText = (node) => {
  if (Array.isArray(node)) return node.map(allText).join("");
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  return Object.values(node).map(allText).join("");
};
const rendered = allText(model);
check(/\{\{|\}\}/.test(rendered), false, "자리표시 잔존 없음");
check(rendered.includes("브랜드명 ”"), false, "원본의 빈 브랜드명 자리표시 없음");

// 설정에 모르는 키가 있으면 바로 실패한다.
assert.throws(() => contract.fill("{{nope}}", {}), /Unknown contract field/);
checks += 1;

// 필수값·날짜 검증.
const empty = contract.build({ amountMode: "text", totalAmountText: "월별 매체별 진행" }, config);
check(empty.issues.filter((i) => i.level === "error").length, 7, "필수 7개 누락");
check(contract.blanks(empty).includes("갑 상호"), true, "빈 상호는 빈칸으로 남는다");
const reversed = contract.validate({ ...sample, endDate: "2026-08-01" });
check(reversed.map((i) => i.field), ["endDate"], "종료일이 시작일보다 빠르면 오류");
check(contract.validate({ ...sample, clientBizNo: "12345" })[0].level, "warning", "사업자번호 자릿수 경고");

// 견적서1 — 사용자가 든 예시: 구글 500만·메타 2,000만, 둘 다 수수료 15%, 부가세 10%.
const scheduled = { ...sample, amountMode: "schedule", scheduleRows: [
  { media: "구글 광고", budget: 5000000, feeRate: 15 },
  { media: "메타 광고", budget: 20000000, feeRate: 15 }
] };
const table = contract.schedule(scheduled.scheduleRows, config.vatRate);
check(config.vatRate, 0.1, "부가세 10%");
check(table.lines[0], { media: "구글 광고", budget: 5000000, budgetVat: 500000, feeRate: 15, fee: 750000, feeVat: 75000, supply: 5750000, vat: 575000, total: 6325000 }, "구글 한 줄");
check(table.lines[1], { media: "메타 광고", budget: 20000000, budgetVat: 2000000, feeRate: 15, fee: 3000000, feeVat: 300000, supply: 23000000, vat: 2300000, total: 25300000 }, "메타 한 줄");
check([table.budget, table.budgetVat, table.fee, table.feeVat], [25000000, 2500000, 3750000, 375000], "광고비·수수료 합계와 각 부가세");
check([table.supply, table.vat, table.total], [28750000, 2875000, 31625000], "공급가액·부가세·VAT 포함 총액");

// 반올림은 항목마다 원 단위. 합계는 반올림한 항목을 더한다(표의 줄이 합계와 어긋나지 않게).
const odd = contract.schedule([{ media: "x", budget: 1234567, feeRate: 10 }], 0.1);
check([odd.lines[0].fee, odd.lines[0].budgetVat, odd.lines[0].feeVat, odd.lines[0].vat], [123457, 123457, 12346, 135803], "원 단위 반올림");
check(odd.vat, odd.budgetVat + odd.feeVat, "부가세 합 = 광고비 부가세 + 수수료 부가세");

const scheduledModel = contract.build(scheduled, config);
check(plain(scheduledModel.summary[1].value), "월 28,750,000원 (VAT 별도) · VAT 포함 31,625,000원", "요강 총계약금액");
check(scheduledModel.summary[1].details.map(plain), [
  "구글 광고 : 광고비 5,000,000원 + 대행수수료 750,000원(15%) = 5,750,000원, 부가세 10% 575,000원 → 6,325,000원",
  "메타 광고 : 광고비 20,000,000원 + 대행수수료 3,000,000원(15%) = 23,000,000원, 부가세 10% 2,300,000원 → 25,300,000원",
  "합계 : 공급가액 28,750,000원 + 부가세 10% 2,875,000원 = 31,625,000원 (세부 내역은 붙임 “견적서1”)"
], "요강에 매체별 내역");
check(model.summary[1].details, [], "문구 모드에는 내역이 없다");
check(plain(scheduledModel.summary[4].value), "견적서1 (매체별 광고비용)", "붙임문서 자동 기재");
check(scheduledModel.attachment.lines.length, 2, "붙임 표 2개 매체");
check(scheduledModel.attachment.total, 31625000, "붙임 표 총액");
check(contract.validate({ ...scheduled, scheduleRows: [] })[0].field, "scheduleRows", "매체 없이 표 모드면 오류");
check(contract.validate({ ...scheduled, scheduleRows: [{ media: "", budget: 0, feeRate: 120 }] }).length, 3, "매체명·금액·율 각각 검증");

// 특약은 14조로 붙고, 사용자가 쓴 {{ }} 는 해석하지 않는다.
const special = contract.build({ ...sample, specialTerms: "첫째 특약.\n\n둘째 {{clientName}}" }, config);
check(special.articles.length, 14, "특약 조 추가");
check(special.articles[13].heading, "제14조 (특약사항)", "특약 조 제목");
check(special.articles[13].paragraphs.map((p) => plain(p.segments)), ["첫째 특약.", "둘째 {{clientName}}"], "특약은 문자 그대로");

// 견적서1 매체별 세부 업무 — 견적서에만 들어가고 계약서 조항에는 들어가지 않는다.
const presets = config.mediaScope.presets;
check(presets.map((p) => p.id), ["meta-ecom-own", "meta-ecom-mall", "meta-cpa"], "메타 세부 업무 프리셋 3종");
const own = presets[0];
const ownText = own.items.map((i) => i.text).join("\n");
["Google Marketing Platform(GA4·GTM", "픽셀 및 전환 API(CAPI)", "GMC 및 카탈로그", "입금 후 24시간(영업일 기준 2일)"].forEach((t) =>
  check(ownText.includes(t), true, `이커머스(독립몰) 확정 문구: ${t}`)
);
check(own.items.filter((i) => i.status === "confirmed").length, 4, "독립몰 확정 항목 4개");
check(presets[2].items.every((i) => i.status === "draft"), true, "CPA 항목은 전부 초안(사용자 확정 전)");
check(presets.every((p) => p.items.every((i) => ["confirmed", "draft"].includes(i.status))), true, "항목 상태는 confirmed/draft");

const scoped = (row) => ({ ...sample, amountMode: "schedule", scheduleRows: [{ media: "메타 광고", budget: 1000000, feeRate: 10, ...row }] });
const none = contract.build(scoped({}), config);
check(none.attachment.scopes, [], "유형을 안 고르면 세부 업무가 없다");

const confirmedIdx = own.items.map((i, k) => (i.status === "confirmed" ? k : -1)).filter((k) => k >= 0);
const withScope = contract.build(scoped({ scopeId: "meta-ecom-own", scopeOn: confirmedIdx }), config);
check(withScope.attachment.scopes.length, 1, "세부 업무 1개 매체");
check(withScope.attachment.scopes[0].items, own.items.filter((i) => i.status === "confirmed").map((i) => i.text), "켜진 확정 항목만 나온다");
check(withScope.issues.filter((i) => /초안/.test(i.message)).length, 0, "초안을 안 켜면 초안 경고가 없다");

const draftOn = contract.build(scoped({ scopeId: "meta-ecom-own", scopeOn: [...confirmedIdx, 4] }), config);
check(draftOn.issues.some((i) => i.level === "warning" && /초안·미확정 항목 1개/.test(i.message)), true, "초안을 켜면 경고");

const emptyPick = contract.build(scoped({ scopeId: "meta-cpa", scopeOn: [] }), config);
check(emptyPick.attachment.scopes, [], "항목을 하나도 안 켜면 견적서에 나오지 않는다");
check(emptyPick.issues.some((i) => /선택된 항목이 없어/.test(i.message)), true, "빈 선택 경고");

const extra = contract.build(scoped({ scopeId: "meta-cpa", scopeOn: [], scopeExtra: "첫째 추가\n\n 둘째 추가 " }), config);
check(extra.attachment.scopes[0].items, ["첫째 추가", "둘째 추가"], "추가 항목은 줄마다 1개");

// 24시간 집행 문구는 견적서에만 있다. 계약서 조항(제7조 포함)에는 넣지 않는다.
const articleText = JSON.stringify(withScope.articles) + JSON.stringify(withScope.summary);
check(articleText.includes("24시간"), false, "계약서 본문에는 24시간 집행 문구가 없다");
check(JSON.stringify(config.articles).includes("24시간"), false, "조항 원문에도 없다");

// 공개 저장소 규칙 — 입력값을 밖으로 내보내는 경로가 없어야 한다.
const dir = path.join(__dirname, "..", "ad-agency-contract");
const source = ["index.html", "contract.js", "contract-config.js"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
for (const forbidden of ["localStorage", "sessionStorage", "URLSearchParams", "fetch(", "XMLHttpRequest", "<form", "innerHTML", "location.hash", "indexedDB", "sendBeacon"]) {
  check(source.includes(forbidden), false, `입력값 유출 경로 없음: ${forbidden}`);
}

console.log(`ad-agency-contract: ${checks} checks passed`);
