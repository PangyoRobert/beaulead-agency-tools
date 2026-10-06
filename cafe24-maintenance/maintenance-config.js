// 카페24 자사몰 유지보수 안내 페이지의 단일 원본.
// 업체별 값(업체명·스킨·연동·작업 이력)은 전부 `client` 블록 한 곳에만 있다. 본문과 문구에는
// 업체명을 직접 쓰지 않고 index.html 이 이 값을 참조한다. 새 업체는 `client` 만 바꾼다.
//
// 공개 저장소이므로 실제 업체명·내부 단가·원가·마진은 이 파일에 넣지 않는다.
// 기본값은 가공 이름이다. 화면에서 업체명을 입력하면 그 자리만 바뀌고 어디에도 저장되지 않는다.
window.CAFE24_MAINTENANCE_CONFIG = Object.freeze({
  vatRate: 0.1,

  client: Object.freeze({
    name: "○○스포츠",
    skin: "카페24 디자인센터 유료 템플릿을 복사한 뒤 커스텀",
    integrations: Object.freeze([
      "카페24 앱스토어 앱 (리뷰 관리, 어필리에이트, 채널톡)",
      "PG: 토스페이먼츠 (별도 신청, 사용료는 고객 부담)"
    ]),
    history: Object.freeze({
      types: Object.freeze([
        "상품 세팅",
        "쿠폰·이벤트 프로모션 세팅",
        "배너·상세페이지 제작 후 적용",
        "페이지 문구 수정·추가, 이미지 변경"
      ]),
      monthlyEstimate: "월 평균 2~3회 이상 (추정)"
    })
  }),

  plan: Object.freeze({
    monthlyFeeSupplyPrice: 500000,
    includedCountPerMonth: 3,
    contract: "월 단위"
  }),

  included: Object.freeze([
    Object.freeze({
      id: "publishing",
      name: "일반 퍼블리싱 유지보수",
      items: Object.freeze(["퍼블리싱 수정", "장애·오류 대응"])
    }),
    Object.freeze({
      id: "operation",
      name: "운영 보조 유지보수",
      items: Object.freeze(["쿠폰 설정", "이벤트 설정", "상품 등록 등 관리자 페이지 관련 작업"])
    })
  ]),

  separate: Object.freeze({
    name: "별도로 산정하는 작업",
    items: Object.freeze(["신규 내용 추가", "디자인 변경", "배너·상세페이지 제작"])
  }),

  extraFees: Object.freeze({
    name: "별도 비용",
    items: Object.freeze([
      Object.freeze({ label: "도메인", note: "별도 구매 후 전달하거나 대행할 수 있습니다." }),
      Object.freeze({ label: "PG 결제", note: "카페24페이먼츠는 별도 비용이 없습니다. 그 외 PG는 별도 신청과 사용료가 필요합니다." }),
      Object.freeze({ label: "유료 앱", note: "대부분 구독형 플랜이라 사이트 오픈과 앱 제조사 상담 후에 대략적인 비용을 산출할 수 있습니다." })
    ]),
    free: Object.freeze(["카페24 이용료 없음", "SSL 카페24 무료 지원"])
  }),

  limits: Object.freeze({
    name: "작업 가능 범위",
    items: Object.freeze([
      "백엔드 개발은 제공하지 않습니다.",
      "JS 스크립트로 처리할 수 있는 퍼블리싱 작업과 카페24가 제공하는 변수를 활용한 디자인 요소 작업을 합니다.",
      "외부 연동은 카페24 쇼핑몰 앱스토어에 있는 기능에 한합니다."
    ])
  })
});
