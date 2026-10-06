# Viral Menu

바이럴 마케팅 서비스 8개 캠페인(리뷰콘텐츠 체험단 4 · SNS 콘텐츠 3 · 커뮤니티 인터랙션 1)을 분류별로 안내하고, 캠페인마다 단가표를 붙이는 공개 메뉴 페이지입니다.

## 기존 `viral-marketing-quote`와 다른 점

`viral-marketing-quote`는 M1~M6 모듈과 예산 구간 패키지 구조의 비공개 초안이다. 이 페이지는 채널별 상품 메뉴판이라 구조가 다르고, 서로 값을 공유하지 않는다.

## 단가는 입력 대기

`pricing-config.js`의 각 캠페인 `prices` 배열이 비어 있으면 화면에 "단가 문의"로 표시한다. 금액을 임의로 채우지 않는다. 담당자가 단가를 넣으면 같은 값에서 VAT 포함가가 파생된다.

## 값의 위치

분류·캠페인명·소개 문구·단가는 전부 `pricing-config.js`에 있다. `index.html`은 읽어서 그리기만 한다. 공개 저장소이므로 원가, 매체비 비중, 마진은 이 디렉토리에 두지 않는다.

## 검증

```sh
python3 scripts/validate_site.py
node scripts/test_viral_menu.js
```
