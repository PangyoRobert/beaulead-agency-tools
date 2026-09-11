const assert = require("node:assert/strict");

global.window = global;
require("../google-ads-training-quote/pricing-config.js");
const calculator = require("../google-ads-training-quote/calculator.js");
const config = global.GOOGLE_ADS_TRAINING_CONFIG;

const basic = calculator.calculate("basic-offline", config);
assert.equal(basic.selectedPackage.durationHours, 4);
assert.equal(basic.supply, 1960000);
assert.equal(basic.vat, 196000);
assert.equal(basic.total, 2156000);

const custom = calculator.calculate("custom-offline", config);
assert.equal(custom.supply, 2360000);
assert.equal(custom.vat, 236000);
assert.equal(custom.total, 2596000);

const remote = calculator.calculate("custom-remote", config);
assert.equal(remote.selectedPackage.durationHours, 1);
assert.equal(remote.supply, 390000);
assert.equal(remote.vat, 39000);
assert.equal(remote.total, 429000);

assert.throws(() => calculator.calculate("unknown", config), /Unknown training package/);

console.log("Google Ads training quote rules: 12 assertions passed.");
