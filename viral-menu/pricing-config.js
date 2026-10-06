// 바이럴 마케팅 서비스 메뉴(분류 3개 · 캠페인 8개)의 단일 원본.
// 이름·소개 문구·단가는 전부 이 파일에만 있고, index.html 은 읽어서 그리기만 한다.
//
// 단가는 캠페인마다 `prices` 배열에 공급가로 넣는다. 비어 있으면 화면에 "단가 문의"로
// 표시한다. 금액을 임의로 채우지 않는다. 항목 모양:
//   { label: "20인 패키지", supplyPrice: 1000000, unit: "건", detail: "선택 보충 설명" }
//
// 공개 저장소이므로 원가, 매체비 비중, 마진은 이 파일에 넣지 않는다.
window.VIRAL_MENU_CONFIG = Object.freeze({
  vatRate: 0.1,

  groups: Object.freeze([
    Object.freeze({
      id: "content-seeding",
      name: "리뷰콘텐츠 체험단",
      nameEn: "Content seeding",
      campaigns: Object.freeze([
        Object.freeze({
          id: "naver-blog",
          name: "네이버 블로그",
          detailUrl: "./naver-blog/",
          nameEn: "NAVER BLOG",
          summary: Object.freeze([
            "국내 소비자 검색엔진 이용률 1위 포털로써 플랫폼 내 다양한 바이럴 마케팅 활동을 통해",
            "브랜드의 서비스를 자연스럽게 입소문형성 합니다."
          ]),
          prices: Object.freeze([])
        }),
        Object.freeze({
          id: "short-form",
          name: "숏폼",
          detailUrl: "./short-form/",
          detailLabel: "상세 보기 →",
          nameEn: "SHORT FORM (IG/TT/YT)",
          summary: Object.freeze([
            "유튜브·인스타그램·틱톡과 같은 영상콘텐츠 플랫폼의 이용률이 급증하면서 마케팅 캠페인 중 필수로 자리잡은 마케팅입니다.",
            "인플루언서와의 협업 및 바이럴 영상콘텐츠 제작을 통해 높은 트래픽 형성 및 구매전환을 높일 수 있습니다."
          ]),
          prices: Object.freeze([])
        }),
        Object.freeze({
          id: "youtube-long-form",
          name: "유튜브 롱폼",
          nameEn: "YouTube Long Form",
          summary: Object.freeze([
            "유튜브 롱폼 콘텐츠를 통해 브랜드의 스토리와 가치를 깊이 있게 전달하여 신뢰를 구축합니다.",
            "검색 노출과 시청 지속 시간을 극대화해 마케팅 효과를 장기적으로 끌어올릴 수 있습니다."
          ]),
          prices: Object.freeze([])
        }),
        Object.freeze({
          id: "x-twitter",
          name: "X (트위터)",
          nameEn: "X (TWITTER)",
          summary: Object.freeze([
            "빠른 바이럴과 강력한 해시태그 노출을 바탕으로 X(트위터)에서 브랜드 화제성을 극대화합니다.",
            "타겟 사용자들의 자발적인 참여와 공유로 자연스럽고 진정성 있는 홍보 효과를 기대할 수 있습니다."
          ]),
          prices: Object.freeze([])
        })
      ])
    }),
    Object.freeze({
      id: "sns-content",
      name: "SNS 콘텐츠",
      nameEn: "SNS content",
      campaigns: Object.freeze([
        Object.freeze({
          id: "sns-power-page",
          name: "SNS 파워페이지",
          nameEn: "SNS Power Page",
          summary: Object.freeze([
            "검증된 SNS 파워페이지를 통해 브랜드의 첫인상을 강하게 각인시키고, 바이럴 효과를 극대화합니다.",
            "팔로워 기반의 영향력을 활용해 단기간 내 트래픽과 인지도를 동시에 끌어올릴 수 있습니다."
          ]),
          prices: Object.freeze([])
        }),
        Object.freeze({
          id: "instagram-explore",
          name: "인스타그램 돋보기",
          nameEn: "Instagram navigation tab",
          summary: Object.freeze([
            "인스타그램 돋보기(탐색탭) 노출에 최적화된 유머짤 콘텐츠로 자연스러운 브랜드 노출과 관심 유도를 이끌어냅니다.",
            "빠른 확산력을 가진 콘텐츠로 팔로워 증가와 페이지 방문을 동시에 유도할 수 있습니다."
          ]),
          prices: Object.freeze([])
        }),
        Object.freeze({
          id: "short-form-viral",
          name: "숏폼 바이럴",
          nameEn: "SHORT FORM VIRAL",
          summary: Object.freeze([
            "브랜드 목표에 맞춰 채널을 선택 집행하는 목적 맞춤형 쇼츠 상품입니다.",
            "조회수와 대세감을 빠르게 터뜨리는 [이슈 확산형 채널]과 버티컬 커머스(쿠팡·올영·무신사 등) 링크를 연계해 실결제를 유도하는 [구매 전환형 숏핑] 중 최적의 채널 라인업을 제공합니다."
          ]),
          prices: Object.freeze([])
        })
      ])
    }),
    Object.freeze({
      id: "community",
      name: "커뮤니티 인터랙션 캠페인",
      nameEn: "Consumer Interaction",
      campaigns: Object.freeze([
        Object.freeze({
          id: "consumer-interaction",
          name: "커뮤니티 인터랙션 캠페인",
          nameEn: "Consumer Interaction",
          summary: Object.freeze([
            "온라인 내 활동량이 많은 다양한 커뮤니티 내 회원들을 타깃으로 후킹될 수 있는 콘텐츠 기획 및 배포 진행을 통해",
            "브랜드 인지 및 구매전환을 유도합니다."
          ]),
          prices: Object.freeze([])
        })
      ])
    })
  ])
});
