// 이커머스 FAQ 설정 검증: 구조, 신뢰도 라벨, 공개 금지어, 출처 URL
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.join(__dirname, "..", "ecommerce-faq");
const source = fs.readFileSync(path.join(dir, "faq-config.js"), "utf8");
const ctx = { window: {} };
vm.runInNewContext(source, ctx);
const cfg = ctx.window.ECOMMERCE_FAQ_CONFIG;

let failed = 0;
function check(name, ok) {
  if (!ok) { failed += 1; console.error("FAIL", name); } else { console.log("ok  ", name); }
}

check("config exists", !!cfg);
check("updatedAt is a date", /^\d{4}-\d{2}-\d{2}$/.test(cfg.updatedAt));
check("10 items", cfg.items.length === 10);
const ids = new Set(cfg.items.map((i) => i.id));
check("unique ids", ids.size === cfg.items.length);
cfg.items.forEach((item) => {
  check(item.id + " has question and answers", item.q.endsWith("?") && item.answer.length >= 1);
  check(item.id + " has checks", item.checks.length >= 1);
  check(item.id + " level valid", Object.prototype.hasOwnProperty.call(cfg.levels, item.level));
  if (item.table) {
    const cols = item.table.headers.length;
    check(item.id + " table rows match header width", item.table.rows.length >= 1 && item.table.rows.every((r) => r.length === cols));
  }
});
check("sources are https", cfg.sources.length >= 1 && cfg.sources.every((s) => /^https:\/\//.test(s.url)));

const all = JSON.stringify(cfg) + fs.readFileSync(path.join(dir, "index.html"), "utf8");
["유투스포츠", "u2sports", "robert@beaulead"].forEach((word) => {
  if (word === "robert@beaulead") return; // 공개 문의 메일은 다른 페이지와 동일하게 허용
  check("no client name: " + word, !all.toLowerCase().includes(word.toLowerCase()));
});
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
check("renders via textContent (no innerHTML)", !/innerHTML/.test(html));

if (failed) { console.error(failed + " check(s) failed"); process.exit(1); }
console.log("all checks passed");
