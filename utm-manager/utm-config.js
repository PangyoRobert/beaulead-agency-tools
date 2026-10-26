/* UTM 매니저 설정 — 바뀌는 값은 여기뿐입니다. 화면 코드에 옵션을 하드코딩하지 않습니다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UTM_CONFIG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  return {
    limits: { title: 100, campaign: 50, term: 50, content: 50 },
    // value는 utm_source에 들어가는 소문자 표기. GA4는 대소문자를 구분해 따로 집계한다.
    sources: [
      { label: "Google", value: "google" }, { label: "YouTube", value: "youtube" },
      { label: "Instagram", value: "instagram" }, { label: "Facebook", value: "facebook" },
      { label: "TikTok", value: "tiktok" }, { label: "Naver", value: "naver" },
      { label: "Kakao", value: "kakao" }, { label: "Twitter/X", value: "twitter" },
      { label: "Toss", value: "toss" }
    ],
    mediums: [
      { label: "CPC", note: "검색 광고", value: "cpc" }, { label: "Display", value: "display" },
      { label: "Shopping", value: "shopping" }, { label: "Video", value: "video" },
      { label: "Social", value: "social" }, { label: "Retargeting", value: "retargeting" },
      { label: "Email", value: "email" }, { label: "SMS", value: "sms" },
      { label: "Organic", note: "자연 유입", value: "organic" },
      { label: "Affiliate", note: "제휴", value: "affiliate" }, { label: "Referral", value: "referral" }
    ],
    // 화면의 "예시 넣기"에 쓰는 가상 값. 실제 고객사 값은 두지 않는다.
    example: {
      title: "(가상) 메타 구매전환 - 가을 프로모션",
      url: "https://example.com/products/sample",
      source: "facebook", medium: "social",
      campaign: "autumn_promo_2026", term: "", content: "video_a_1x1"
    }
  };
});
