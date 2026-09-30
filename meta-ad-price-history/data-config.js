// 메타(Meta) 분기 실적발표에서 공시하는 "average price per ad"(평균 광고단가)
// 전년 동기 대비(YoY) 변동률을 그대로 옮긴 사실 기록이다. 계산도 추정도 없다 —
// 메타가 발표한 숫자와 문장을 원문 그대로 인용하고 출처를 붙인다.
//
// **이 자료는 "성수기 CPM 상승률 벤치마크"가 아니다.** 2026-09-30, 2023~2025년
// Q4 실적발표·공식 블로그를 전량 직접 열람해 조사한 결과, 메타는 이 변동을
// 홀리데이·성수기 효과라고 공식적으로 밝힌 적이 없다(설명은 항상 "광고주 수요",
// "광고 성과 개선", "환율" 같은 일반적 표현). 구글(Alphabet)은 같은 기간 비교
// 가능한 공식 수치를 아예 공시하지 않는다 — 그래서 이 페이지는 메타 단독
// 이력이고, "업종 벤치마크"라는 이름을 쓰지 않는다.
//
// 각 항목의 driverQuote 는 메타가 그 분기 가격 변동의 원인으로 든 설명 문장
// 원문(영어)이다. holidayQuote 는 같은 실적발표에서 나온 홀리데이 관련 발언을
// 별도로 담되, 가격 수치와 직접 연결된 문장이 아니라는 것을 index.html 이
// 항상 분리해서 보여준다.
window.META_AD_PRICE_HISTORY_CONFIG = Object.freeze({
  checkedDate: "2026-09-30",
  googleAbsence: Object.freeze({
    summary:
      "구글(Alphabet)은 2023~2025년 Q4 실적발표 콜 대본·프레스릴리즈·Think with Google 공식 블로그 어디에서도 CPC·CPM 증감률을 정량 공시하지 않는다. 그래서 이 페이지에 구글 수치는 없다 — 만들어 채우지 않는다.",
    checks: Object.freeze([
      Object.freeze({
        year: "2024 Q4",
        note: "매출액 언급은 있으나 단가 아님",
        quote:
          "Retail was particularly strong this holiday season, especially on Black Friday and Cyber Monday, which each generated over $1 billion in ad revenue.",
        sourceUrl: "https://s206.q4cdn.com/479360582/files/doc_financials/2024/q4/2024-q4-earnings-transcript.pdf",
        sourceDate: "2025-02-04"
      }),
      Object.freeze({
        year: "2025 Q4",
        note: "일반적 계절 패턴 언급만 있고 수치 없음",
        quote:
          "In Google Services, we expect growth to be driven by ongoing innovation in the user experience, as well as improved ROI for advertisers, keeping in mind the normal seasonal pattern for advertising revenue.",
        sourceUrl: "https://s206.q4cdn.com/479360582/files/doc_events/2026/Feb/04/2025_Q4_Earnings_Transcript.pdf",
        sourceDate: "2026-02-04"
      })
    ])
  }),
  quarters: Object.freeze([
    Object.freeze({
      id: "2023-q4",
      label: "2023년 4분기",
      yoyPriceChange: 2,
      fullYearPriceChange: -9,
      impressionsYoy: 21,
      driverQuote:
        "Pricing growth was driven by advertiser demand and currency tailwinds, which were partially offset by strong impression growth, particularly from lower-monetizing surfaces and regions.",
      holidayQuote: null,
      sourceType: "실적발표 콜 대본 (Susan Li, CFO)",
      sourceUrl: "https://s21.q4cdn.com/399680738/files/doc_financials/2023/q4/META-Q4-2023-Earnings-Call-Transcript.pdf",
      sourcePage: "7쪽",
      sourceDate: "2024-02-01"
    }),
    Object.freeze({
      id: "2024-q4",
      label: "2024년 4분기",
      yoyPriceChange: 14,
      fullYearPriceChange: 10,
      impressionsYoy: 6,
      driverQuote:
        "Pricing growth benefited from increased advertiser demand, in part driven by improved ad performance. This was partially offset by impression growth, particularly from lower-monetizing regions and surfaces.",
      holidayQuote: null,
      sourceType: "실적발표 콜 대본 (Susan Li, CFO)",
      sourceUrl: "https://s21.q4cdn.com/399680738/files/doc_financials/2024/q4/META-Q4-2024-Earnings-Call-Transcript.pdf",
      sourcePage: "4쪽",
      sourceDate: "2025-01-29"
    }),
    Object.freeze({
      id: "2025-q4",
      label: "2025년 4분기",
      yoyPriceChange: 6,
      fullYearPriceChange: 9,
      impressionsYoy: 18,
      driverQuote:
        "The average price per ad increased 6% year-over-year, benefiting from increased advertiser demand, largely driven by improved ad performance.",
      holidayQuote:
        "Our business also performed very well thanks to record-breaking holiday demand and AI-driven performance gains.",
      holidayQuoteSpeaker: "Mark Zuckerberg, CEO (실적발표 서두 발언)",
      sourceType: "실적발표 콜 대본 (Susan Li, CFO / Mark Zuckerberg, CEO)",
      sourceUrl: "https://s21.q4cdn.com/399680738/files/doc_financials/2025/q4/META-Q4-2025-Earnings-Call-Transcript.pdf",
      sourcePage: "1, 3쪽",
      sourceDate: "2026-01-28"
    })
  ])
});
