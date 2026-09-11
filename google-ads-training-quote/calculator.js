(function attachGoogleAdsTrainingCalculator(root, factory) {
  const calculator = factory();
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.GOOGLE_ADS_TRAINING_CALCULATOR = calculator;
})(typeof window !== "undefined" ? window : globalThis, function createCalculator() {
  function calculate(packageId, config) {
    const selectedPackage = config.packages.find((item) => item.id === packageId);
    if (!selectedPackage) throw new Error("Unknown training package");

    const supply = selectedPackage.price;
    const vat = supply * config.vatRate;

    return Object.freeze({
      selectedPackage,
      supply,
      vat,
      total: supply + vat
    });
  }

  return Object.freeze({ calculate });
});
