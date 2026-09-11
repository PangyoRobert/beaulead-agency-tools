const assert = require("node:assert/strict");

global.window = global;
require("../development-quote/pricing-config.js");
const engine = require("../development-quote/calculator.js");
const config = global.DEVELOPMENT_QUOTE_CONFIG;

const defaults = {
  scope: "general",
  detailType: "partial",
  sections: 1,
  textLines: 2,
  images: 1,
  layoutChange: false,
  fullRestructure: false,
  requestedRevisions: 1,
  urgent: false,
  extraDevelopment: false,
  adjustmentType: "discount",
  adjustmentAmount: 0,
  adjustmentReason: "",
  managerApproved: false
};

function quote(overrides = {}) {
  return engine.calculate({ ...defaults, ...overrides }, config);
}

assert.equal(quote().product.key, "simple");
assert.equal(quote().total, 22000);
assert.equal(quote({ textLines: 5 }).product.key, "small");
assert.equal(quote({ images: 4 }).product.key, "small");
assert.equal(quote({ sections: 2 }).product.key, "medium");
assert.equal(quote({ sections: 4 }).product.key, "large");
assert.equal(quote({ fullRestructure: true }).status, "review");

const urgentMedium = quote({ sections: 2, urgent: true });
assert.equal(urgentMedium.urgentFee, 50000);
assert.equal(urgentMedium.total, 165000);
assert.equal(quote({ urgent: true }).urgentFee, 0);

const newDetail = quote({ scope: "detail", detailType: "newPage", requestedRevisions: 2 });
assert.equal(newDetail.product.key, "newPage");
assert.equal(newDetail.revisionFee, 0);
assert.equal(quote({ scope: "detail", detailType: "newPage", requestedRevisions: 3 }).revisionFee, 500000);

assert.equal(quote({ adjustmentAmount: 10000, adjustmentReason: "영업 요청" }).approvedAdjustment, 0);
assert.equal(quote({ adjustmentAmount: 10000, adjustmentReason: "영업 요청", managerApproved: true }).approvedAdjustment, -10000);
assert.equal(quote({ extraDevelopment: true }).status, "consult");

console.log("Development quote rules: 14 assertions passed.");
