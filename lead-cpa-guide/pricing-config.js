// 업종별 리드(DB) 단가 참고표의 원본 데이터.
//
// 뷰리드가 정리한 2025년 1분기 업종별 DB CPA 평균 단가 참고 자료(2025-02-05
// 기준)다. 뷰리드가 직접 집행해 얻은 측정치라고 단정하지 않는다 — 참고용으로
// 정리한 자료라는 표현을 그대로 쓴다.
//
// `base` 가 2025년 1분기 원자료 값이고, 화면은 여기에 `inflationRate` 를 곱해
// 2026년 반영가를 계산한다. **10% 인상은 실측치가 아니라 사용자가 지정한
// 일괄 조정값**이다 — index.html 은 base 를 감추지 않고 항상 나란히 보여준다.
// 부가세: 원자료에 VAT 표기가 없어 이 파일도 단가를 VAT 언급 없이 그대로 둔다.
window.LEAD_CPA_GUIDE_CONFIG = Object.freeze({
  inflationRate: 0.1,
  baseYear: "2025년 1분기",
  targetYear: "2026년",
  sourceNote:
    "출처: 뷰리드가 정리한 2025년 1분기 업종별 DB CPA 평균 단가 참고 자료. 부가세 표기 여부는 원자료에 없어 확인이 필요합니다.",
  categories: Object.freeze([
    Object.freeze({
      id: "hospital",
      label: "병원",
      groups: Object.freeze([
        Object.freeze({
          id: "dental",
          label: "치과",
          items: Object.freeze([
            Object.freeze({ name: "임플란트", base: 60000 }),
            Object.freeze({ name: "치아교정", base: 55000 }),
            Object.freeze({ name: "투명교정", base: 55000 }),
            Object.freeze({ name: "라미네이트", base: 50000 })
          ])
        }),
        Object.freeze({
          id: "plastic",
          label: "성형",
          items: Object.freeze([
            Object.freeze({ name: "다이어트주사", base: 25000 }),
            Object.freeze({ name: "보톡스·필러", base: 30000 }),
            Object.freeze({ name: "슈링크·인모드", base: 30000 }),
            Object.freeze({ name: "눈·코성형", base: 35000 }),
            Object.freeze({ name: "윤곽성형", base: 40000 }),
            Object.freeze({ name: "가슴성형", base: 50000 }),
            Object.freeze({ name: "지방이식", base: 40000 }),
            Object.freeze({ name: "지방흡입", base: 40000 })
          ])
        }),
        Object.freeze({
          id: "hair",
          label: "모발",
          items: Object.freeze([
            Object.freeze({ name: "두피문신", base: 40000 }),
            Object.freeze({ name: "모발이식", base: 50000 })
          ])
        }),
        Object.freeze({
          id: "obgyn",
          label: "산부인과",
          items: Object.freeze([
            Object.freeze({ name: "질필러", base: 40000 }),
            Object.freeze({ name: "자궁근종", base: 40000 })
          ])
        }),
        Object.freeze({
          id: "urology",
          label: "비뇨",
          items: Object.freeze([
            Object.freeze({ name: "남성수술", base: 40000 }),
            Object.freeze({ name: "전립선비대증", base: 40000 })
          ])
        }),
        Object.freeze({
          id: "eye",
          label: "안과",
          items: Object.freeze([
            Object.freeze({ name: "라식라섹", base: 45000 }),
            Object.freeze({ name: "렌즈삽입술", base: 60000 }),
            Object.freeze({ name: "백내장", base: 60000 }),
            Object.freeze({ name: "노안교정", base: 80000 })
          ])
        }),
        Object.freeze({
          id: "korean-medicine",
          label: "한의",
          items: Object.freeze([
            Object.freeze({ name: "한방다이어트", base: 45000 }),
            Object.freeze({ name: "줄기세포", base: 40000 }),
            Object.freeze({ name: "도수치료", base: 40000 })
          ])
        })
      ])
    }),
    Object.freeze({
      id: "etc",
      label: "기타",
      groups: Object.freeze([
        Object.freeze({
          id: "life",
          label: "생활",
          items: Object.freeze([
            Object.freeze({ name: "가족사진", base: 25000 }),
            Object.freeze({ name: "인터넷가입", base: 30000 }),
            Object.freeze({ name: "렌탈", base: 30000 }),
            Object.freeze({ name: "결혼정보", base: 35000 }),
            Object.freeze({ name: "리스렌트", base: 35000 }),
            Object.freeze({ name: "분양", base: 50000 }),
            Object.freeze({ name: "창업", base: 60000 })
          ])
        }),
        Object.freeze({
          id: "insurance",
          label: "보험",
          items: Object.freeze([Object.freeze({ name: "보험", base: 50000 })])
        }),
        Object.freeze({
          id: "law",
          label: "법무법인",
          items: Object.freeze([
            Object.freeze({ name: "대출", base: 25000 }),
            Object.freeze({ name: "개인회생", base: 45000 }),
            Object.freeze({ name: "재무설계", base: 50000 })
          ])
        }),
        Object.freeze({
          id: "product",
          label: "제품",
          items: Object.freeze([
            Object.freeze({ name: "다이어트보조제", base: 30000 }),
            Object.freeze({ name: "탈모케어", base: 45000 }),
            Object.freeze({ name: "건강기능식품", base: 50000 })
          ])
        })
      ])
    })
  ])
});
