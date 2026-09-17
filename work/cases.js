/**
 * 고객사 레퍼런스 데이터.
 *
 * 이 파일은 공개 저장소에 커밋되고 공개 URL 로 그대로 서빙된다. 화면에 안 그리는
 * 값이라도 여기 적으면 소스를 여는 누구나 읽을 수 있다. 그래서 Notion 의
 * `고객사명`(내부 식별용 정식 명칭)은 이 파일로 내보내지 않는다. 사이트에 나갈
 * 이름은 `displayName` 하나뿐이다.
 *
 * Notion「퍼포먼스마케팅팀 / 고객사 레퍼런스 DB」에서 추출해 갱신한다.
 * 필드 이름은 그 스키마에 맞춰 두었으니 임의로 늘리지 않는다.
 *
 * 규칙
 * - Notion 의 `공개 승인` 이 체크된 케이스만 이 배열에 넣는다.
 * - 실명을 공개할 수 없는 계약이면 `displayName` 에 익명 표현을 적는다.
 * - `metric` 은 고객사가 승인한 문구를 그대로 적는다. 승인본이 없으면 빈 문자열로
 *   두며, 화면에서 해당 영역이 통째로 사라진다. 숫자를 지어내지 않는다.
 */
window.WORK_CASES = Object.freeze([
  Object.freeze({
    id: "case-sports-outdoor",
    displayName: "스포츠 용품 자사몰",
    industry: "스포츠·아웃도어",
    services: Object.freeze(["퍼포먼스 마케팅", "콘텐츠·영상"]),
    periodStart: "2025-02",
    periodEnd: null,
    summary: "자사몰 브랜드의 매체 운영과 인스타그램 콘텐츠를 함께 맡고 있습니다.",
    metric: "",
    image: null,
    order: 1
  })
]);
