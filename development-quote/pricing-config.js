window.DEVELOPMENT_QUOTE_CONFIG = Object.freeze({
  version: "내부 단가표 v1",
  vatRate: 0.1,
  urgentMultiplier: 1.5,
  additionalRevisionRate: 0.5,
  general: {
    simple: {
      label: "간단 수정",
      price: 20000,
      status: "auto",
      summary: "텍스트 4줄 이하 · 이미지 3개 이하 · 레이아웃 변경 없음"
    },
    small: {
      label: "소규모 수정",
      price: 50000,
      status: "auto",
      summary: "1개 섹션 · 텍스트 5줄 이상 또는 이미지 4개 이상 · 부분 레이아웃 변경"
    },
    medium: {
      label: "중간규모 수정",
      price: 100000,
      status: "auto",
      summary: "2~3개 섹션 동시 수정"
    },
    large: {
      label: "대규모 수정",
      price: 200000,
      status: "review",
      summary: "4개 이상 섹션 또는 전체 구조 변경 · 최소 기준가"
    }
  },
  detail: {
    fullEdit: {
      label: "상세페이지 전면 수정",
      price: 300000,
      status: "review",
      includedRevisions: 1,
      summary: "문구·구성 전면 변경 또는 4개 이상 섹션 변경 · 최소 기준가"
    },
    newPage: {
      label: "상세페이지 신규 제작",
      price: 1000000,
      status: "review",
      includedRevisions: 2,
      summary: "기획 + 디자인 + 개발 + 반응형 · 정의된 제작 범위 기준"
    }
  }
});
