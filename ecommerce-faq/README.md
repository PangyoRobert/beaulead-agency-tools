# E-commerce FAQ

자사몰이 네이버 쇼핑에 보이지 않을 때 인하우스 마케터가 가장 먼저 묻는 질문 6개와
점검 순서를 정리한 FAQ입니다. 질문·답변·참고자료는 `faq-config.js`에서만 고칩니다.

## 출처와 신뢰도

마케터 커뮤니티, 셀러 블로그, 솔루션 매뉴얼을 정리한 실무 참고입니다. **네이버 최신
공식 기준 문서는 확인하지 못했습니다.** 그래서 각 질문에 신뢰도 라벨
(`consistent` 비교적 일관 / `conflict` 자료 간 상충 / `unverified` 공식 근거 미확인)을
붙이고, 기준일(`updatedAt`)을 화면에 표시합니다. 정책이 바뀌면 이 파일을 갱신합니다.

## 담지 않은 것

특정 고객사의 성과 수치와 내부 자료는 공개 저장소 규칙에 따라 넣지 않았습니다.
채널별 전환율·수수료 기준값도 사업자가 정할 값이라 제시하지 않습니다.

## 공개 상태

`data/tools.json`에 `public: true`로 등록해 배포합니다.

## 검증

```sh
node scripts/test_ecommerce_faq.js
python3 scripts/validate_site.py
```
