# UTM Manager

랜딩 URL에 `utm_source`·`utm_medium`·`utm_campaign`·`utm_term`·`utm_content`를 붙인 추적 URL을 만들고, 표기 실수를 만들 때 바로 잡는 내부용 도구입니다.
화면 항목은 운영 중인 UTM 태그 화면(태그 제목·랜딩 URL·생성 URL 미리보기·source/medium 선택·campaign/term/content 입력)을 따릅니다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `utm-config.js` | 채널·유형 선택지, 글자 수 한도(제목 100·캠페인/키워드/세부항목 50), 가상 예시. 바뀌는 값은 여기뿐입니다. |
| `utm.js` | 입력 점검과 URL 생성(기존 쿼리·해시 보존, 기존 `utm_*` 덮어쓰기), 표(TSV) 변환. Node와 브라우저에서 같이 씁니다. |
| `index.html` | 입력·미리보기·세션 목록. 입력값은 `textContent`로만 그립니다. |

## 규칙

- **오류(URL을 만들지 않음):** 제목·랜딩 URL·source·medium 누락, https가 아닌 주소, 글자 수 초과.
- **경고(만들되 알림):** 대문자(GA4는 대소문자를 다른 값으로 집계), 공백, 한글 등 비영문, http, 랜딩 URL에 이미 있는 `utm_*`.
- 선택지의 값은 전부 소문자입니다. "직접 입력"은 선택지에 없는 값을 쓸 때만 씁니다.
- 목록은 화면 메모리에만 있습니다. 시트로 옮길 때는 "표로 복사"(탭 구분)를 씁니다.
- 입력은 URL·`localStorage`·외부 전송 어디에도 남기지 않습니다. 제목·랜딩 URL은 고객사를 식별할 수 있어서이고, `scripts/test_utm_manager.js`가 그런 API가 소스에 없는지 검사합니다.
- 태그를 계속 쌓아 두고 팀이 같이 보는 "관리" 기능은 로그인과 저장소가 필요해 이 공개 저장소에 두지 않습니다(별도 비공개 시스템).
- 공개 범위: 내부용(`public: false`). 고객 시연이 필요해지면 `data/tools.json`에서 바꿉니다.

## 검증

```sh
node scripts/test_utm_manager.js
```
