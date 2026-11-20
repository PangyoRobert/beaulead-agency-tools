const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../image-prompt/image-prompt-config.js");
const config = global.IMAGE_PROMPT_CONFIG;
const B = require("../image-prompt/prompt-builder.js");

let checks = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}
function ok(cond, message) {
  assert.ok(cond, message);
  checks += 1;
}
function throws(fn, pattern, message) {
  assert.throws(fn, pattern, message);
  checks += 1;
}

// --- 설정 형태: id 중복 없음, 모든 선택지에 영문 표현이 있다 ---
const groupIds = config.groups.map((g) => g.id);
check(new Set(groupIds).size, groupIds.length, "그룹 id 중복 없음");
config.groups.forEach((g) => {
  const ids = g.options.map((o) => o.id);
  check(new Set(ids).size, ids.length, g.id + " 선택지 중복 없음");
  g.options.forEach((o) => ok(o.id && o.en, g.id + "/" + o.id + " 영문 표현 있음"));
});
const genIds = config.generators.map((g) => g.id);
check(new Set(genIds).size, genIds.length, "생성기 id 중복 없음");
config.generators.forEach((g) => {
  ok(g.rule && g.aspectRule && g.usage, g.id + " 규칙·비율 규칙·사용법 있음");
  ok(g.aspectRule.includes("{aspect}"), g.id + " 비율 규칙에 {aspect} 자리 있음");
});
ok(genIds.includes(config.defaults.generator), "기본 생성기가 목록에 있음");
// 체형 선택지는 숫자(kg·cm)를 담지 않는다 — 이미지 AI가 해석하지 못한다.
const build = config.groups.find((g) => g.id === "build");
build.options.forEach((o) => ok(!/\d/.test(o.id + o.en), "체형 선택지에 숫자 없음: " + o.id));

// --- 사용자 예시: 겨울 라운딩 · 40대 여성 · 긴 생머리 · 56kg · 산뜻 ---
const state = {
  base: "u2 sample base prompt, studio lighting, product in the center",
  picks: { scene: "겨울 골프 라운딩", gender: "여성", age: "40대", hair: "긴 생머리", build: "슬림한 체형", mood: "산뜻한" },
  bodyRef: "56kg",
  extra: "",
  generator: "Midjourney",
  aspect: "4:5"
};
const text = B.buildInstruction(config, state);
ok(text.includes("u2 sample base prompt, studio lighting, product in the center"), "기존 프롬프트가 그대로 들어감");
ok(text.includes("- 계절·배경: 겨울 골프 라운딩 (winter golf course round)"), "배경 줄과 영문 표현");
ok(text.includes("- 성별: 여성 (woman)"), "성별 줄");
ok(text.includes("- 연령대: 40대 (in her/his 40s)"), "연령대 줄");
ok(text.includes("- 머리: 긴 생머리 (long straight hair)"), "머리 줄");
ok(text.includes("- 체형: 슬림한 체형 (slim build)"), "체형 줄");
ok(text.includes("- 분위기: 산뜻한 (fresh, clean, bright)"), "분위기 줄");
ok(text.includes("- 체형 참고 수치: 56kg"), "56kg 는 참고 수치 줄로만 들어감");
ok(text.includes("숫자를 쓰지 말고 눈에 보이는 묘사"), "수치→시각 묘사 규칙이 지시문에 있음");
ok(text.includes("[대상 생성기] Midjourney"), "생성기 표시");
ok(text.includes("--ar 4:5"), "Midjourney 비율 규칙 치환");
ok(text.includes("--no 뒤에 붙일 키워드"), "Midjourney 네거티브 규칙");
ok(!/\{\w+\}/.test(text), "치환되지 않은 {자리} 가 남지 않음");
ok(text.includes("[ENGLISH PROMPT]") && text.includes("[NEGATIVE PROMPT]") && text.includes("[바뀐 부분]"), "출력 형식 마커");

// --- 고르지 않은 그룹은 줄 자체가 없다 ---
const small = B.buildInstruction(config, { base: "", picks: { scene: "실내 스튜디오" }, generator: "Gemini", aspect: "" });
ok(small.includes("- 계절·배경: 실내 스튜디오 (indoor studio)"), "고른 그룹만 줄이 됨");
ok(!small.includes("- 성별:") && !small.includes("- 머리:") && !small.includes("체형 참고 수치"), "안 고른 그룹 줄 없음");
ok(small.includes(config.noBaseText), "기존 프롬프트가 비면 안내 문구");
ok(small.includes("[비율] 지정 안 함"), "비율 미지정");

// --- 선택·자유 입력 없으면 지시문을 만들지 않는다 ---
throws(() => B.buildInstruction(config, { base: "x", picks: {}, generator: "Gemini" }), /바꿀 점/, "바꿀 점이 없으면 거부");
throws(() => B.buildInstruction(config, { picks: { scene: "실내 스튜디오" }, generator: "없는생성기" }), /생성기/, "모르는 생성기 거부");
ok(B.hasChange(config, { picks: {}, extra: " 장갑 착용 " }), "추가 요청만 있어도 변경으로 인정");
ok(!B.hasChange(config, { picks: {}, extra: "  ", bodyRef: "" }), "공백뿐인 입력은 변경 아님");
// 기존 프롬프트 안의 {자리} 모양은 다시 치환되지 않는다.
const braces = B.buildInstruction(config, { base: "keep {changes} literally", picks: { scene: "실내 스튜디오" }, generator: "Gemini" });
ok(braces.includes("keep {changes} literally"), "입력 안의 {changes} 를 재해석하지 않음");

// --- 모든 생성기로 지시문이 만들어진다 ---
config.generators.forEach((g) => {
  const t = B.buildInstruction(config, { picks: { scene: "실내 스튜디오" }, generator: g.id, aspect: "1:1" });
  ok(t.includes(g.rule), g.id + " 규칙이 지시문에 포함");
  ok(!/\{\w+\}/.test(t), g.id + " 치환 누락 없음");
});

// --- 결과 파싱 ---
const good = "[ENGLISH PROMPT]\nA woman in her 40s on a winter golf course, slim build\n[NEGATIVE PROMPT]\ntext, logo\n[바뀐 부분]\n- 배경을 겨울 라운딩으로\n- 인물 추가";
check(B.parseResult(good), {
  prompt: "A woman in her 40s on a winter golf course, slim build",
  negative: "text, logo",
  summary: "- 배경을 겨울 라운딩으로\n- 인물 추가"
}, "정상 답변 파싱");
check(B.parseResult("```\n" + good + "\n```").prompt, "A woman in her 40s on a winter golf course, slim build", "코드펜스 허용");
check(B.parseResult("**[ENGLISH PROMPT]**\nabc\n**[NEGATIVE PROMPT]**\n없음").negative, "없음", "굵은 글씨 마커 허용");
check(B.parseResult("[ENGLISH PROMPT] inline text\n[NEGATIVE PROMPT]\nx").prompt, "inline text", "마커와 같은 줄의 내용");
check(B.parseResult("[english prompt]\nabc").prompt, "abc", "마커 대소문자 무시");
check(B.parseResult("[ENGLISH PROMPT]\nabc").negative, "", "네거티브 구간이 없어도 통과");
check(B.parseResult("앞말\n[ENGLISH PROMPT]\nline1\nline2\n[NEGATIVE PROMPT]\nn").prompt, "line1\nline2", "여러 줄 프롬프트와 앞말 무시");
throws(() => B.parseResult("그냥 문장입니다"), /\[ENGLISH PROMPT\]/, "마커 없으면 거부");
throws(() => B.parseResult("[ENGLISH PROMPT]\n\n[NEGATIVE PROMPT]\nx"), /비어/, "영문 프롬프트가 비면 거부");
throws(() => B.parseResult(""), /\[ENGLISH PROMPT\]/, "빈 입력 거부");

// --- 공개 저장소 규칙: 입력을 밖으로 내보내는 경로가 없다 ---
const dir = path.join(__dirname, "..", "image-prompt");
["index.html", "prompt-builder.js", "image-prompt-config.js"].forEach((name) => {
  const src = fs.readFileSync(path.join(dir, name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  [/localStorage/, /sessionStorage/, /\bfetch\s*\(/, /XMLHttpRequest/, /URLSearchParams/, /<form\b/i, /location\.(search|hash)/, /history\.(push|replace)State/, /sendBeacon/, /indexedDB/].forEach((pattern) => {
    ok(!pattern.test(src), name + " 에 " + pattern + " 없음");
  });
});

console.log(`image-prompt: ${checks} checks passed`);
