window.YOUTUBE_CREATOR_CONFIG = Object.freeze({
  // 지원비: 사용자 확정 범위 10만~20만원, 전원 동일 지급. 기본값은 범위 중앙값.
  supportFee: Object.freeze({
    min: 100000,
    max: 200000,
    step: 10000,
    default: 150000
  }),
  // CPS 과금 수수료율: 사용자 확정 15%.
  commissionRate: Object.freeze({
    min: 0.05,
    max: 0.3,
    step: 0.01,
    default: 0.15
  }),
  // 카페24 수수료: 사용자 확정 5% 고정. 과세 기준은 콘텐츠 지원비 총액
  // (지원비 x 명수)이며 화면에서 바꾸지 않는다.
  // 지원비에 비례하므로 명수가 늘어도 1인당 부담은 그대로다 — 이것이
  // "명수와 무관하게 한 번 나가는 고정비"와 다른 점이다.
  cafe24FeeRate: 0.05,
  // 목표 ROAS·객단가·인플루언서 명수는 확정값이 없으므로 기본값을 두지 않는다.
  // 사용하는 사람이 직접 입력한다.
  scenarioLabels: Object.freeze(["시나리오 A", "시나리오 B", "시나리오 C"]),
  // 화면과 복사 요약에 항상 함께 표기해야 하는 ROAS 정의.
  roasScopeNotice:
    "본 ROAS는 크리에이터 지원비, 카페24 수수료, CPS 수수료를 분모로 계산했습니다."
});
