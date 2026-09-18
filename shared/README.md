# Shared

여러 아티팩트가 함께 쓰는 리소스입니다.

| 경로 | 쓰임 |
| --- | --- |
| `brand/` | 파비콘·og 카드 이미지. 손으로 만들지 않고 `scripts/build_brand_assets.py`가 `~/brand-design-system`의 확정 자산에서 생성합니다. |
| `money-input.js` | 금액 입력칸의 천 단위 쉼표 표시. |

## money-input.js

`<input type="number">`로는 쉼표를 붙일 수 없습니다. 명세상 값이 유효한
부동소수점 문자열이어야 해서 브라우저가 쉼표를 값으로 받지 않습니다. 그래서
금액 칸은 `type="text"`로 두고 표시 형식을 이 모듈이 관리합니다.

```html
<script src="../shared/money-input.js"></script>
...
<input type="text" id="budget" inputmode="decimal" data-money>
```

```js
const MONEY = window.MONEY_INPUT;
MONEY.upgrade();                      // data-money 가 달린 칸을 한 번에 처리
MONEY.write(input, 150000);           // 기본값 넣기 → "150,000"
const amount = MONEY.read(input);     // 숫자로 읽기. 빈 칸은 0
```

**`input.value`를 그대로 `Number()`에 넣으면 안 됩니다.** 쉼표가 섞여 있어
`NaN`이 됩니다. 값은 항상 `read()`로 읽습니다.

배수(ROAS)·비율(%)·명수처럼 금액이 아닌 칸에는 달지 않습니다. 자릿수가 짧아
쉼표가 도움이 안 되고, 명수에 쉼표가 붙으면 금액처럼 보입니다.

소수는 지원합니다(객단가는 평균이라 소수가 나올 수 있습니다). 쉼표는 정수부에만
붙습니다. 규칙은 `scripts/test_money_input.js`가 고정합니다.
