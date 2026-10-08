// 계산 결과를 쉬운 말 문장과 단계별 계산 과정으로 풀어 쓴다.
//
// 이 파일은 숫자를 새로 계산하지 않는다. calculator.js 가 돌려준 값을 문장에 끼워 넣을 뿐이다.
// 문장에는 전문용어(CM1·ROAS·CPA·PG·VAT 같은 말)를 쓰지 않는다. 전문용어는 화면의 병기와
// 용어 풀이(economics-config.js 의 glossary)에만 둔다.
(function attachEcommerceEconomicsExplain(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ECOMMERCE_ECONOMICS_EXPLAIN = api;
})(typeof window !== "undefined" ? window : globalThis, function createExplain() {
  const numberFormat = new Intl.NumberFormat("ko-KR");

  /** 원 단위로 반올림해 "29,900원" 처럼 쓴다. 0 이 되는 음수에는 마이너스를 붙이지 않는다. */
  function won(n) {
    const rounded = Math.round(Math.abs(n));
    return (n < 0 && rounded > 0 ? "−" : "") + numberFormat.format(rounded) + "원";
  }

  /** 비율(0.472)을 "47.2%" 로 쓴다. */
  function pct1(ratio) {
    return (ratio * 100).toFixed(1) + "%";
  }

  /** 입력한 % 를 군더더기 없이 쓴다. 3 → "3%", 2.5 → "2.5%". */
  function pctPlain(ratio) {
    return Number((ratio * 100).toFixed(2)) + "%";
  }

  /** 한눈에 보기 문장. 반환: [{ text, tone }]. tone 은 ok | bad | null. */
  function summary(b, input, plainLabel) {
    const lines = [];
    lines.push({
      text: `“${plainLabel}” 구성이라면 손님이 ${won(b.grossSales)}을 내요.`,
      tone: null
    });

    if (b.cm1 <= 0) {
      lines.push({
        text:
          `여기서 상품값 ${won(b.totalCogs)}, 카드·결제 수수료 ${won(b.pgFee)}, 택배·포장비 ${won(b.shipping)}을 빼면 ${won(b.cm1)}이에요. ` +
          "광고비를 쓰기 전부터 손해예요. 가격, 상품값, 택배비부터 다시 봐야 해요.",
        tone: "bad"
      });
      return lines;
    }

    lines.push({
      text: `여기서 상품값 ${won(b.totalCogs)}, 카드·결제 수수료 ${won(b.pgFee)}, 택배·포장비 ${won(b.shipping)}을 빼면, 광고비를 쓰기 전에 ${won(b.cm1)}이 남아요.`,
      tone: "ok"
    });

    if (b.maxCpa === null) {
      lines.push({
        text: `최소 ${won(input.targetMinMargin)}을 남기려면 광고비를 쓸 여유가 없어요. 광고비를 한 푼도 안 써도 ${won(b.cm1)}밖에 안 남아요.`,
        tone: "bad"
      });
    } else {
      const condition = input.targetMinMargin > 0 ? ` (최소 ${won(input.targetMinMargin)}은 남기는 조건이에요)` : "";
      lines.push({
        text: `그래서 주문 1건에 광고비를 ${won(b.maxCpa)}까지 쓰면 딱 본전이에요${condition}.`,
        tone: null
      });
    }

    lines.push({
      text: `광고비 100원을 쓸 때 결제금액이 ${(b.beRoas * 100).toFixed(1)}원 이상 나오면 본전이에요.`,
      tone: null
    });

    if (b.cpa !== null) {
      lines.push(
        b.finalMargin >= 0
          ? { text: `입력하신 주문 1건당 광고비 ${won(b.cpa)}을 쓰면, 광고비까지 쓰고도 ${won(b.finalMargin)}이 남아요.`, tone: "ok" }
          : { text: `입력하신 주문 1건당 광고비 ${won(b.cpa)}을 쓰면, ${won(-b.finalMargin)} 손해예요.`, tone: "bad" }
      );
    }
    return lines;
  }

  /** "이렇게 계산했어요" 단계. 반환: [{ label, formula }]. 화면에 보이는 반올림 값으로 적는다. */
  function steps(b, input) {
    return [
      { label: "손님이 내는 금액 (부가세 포함)", formula: `${won(input.unitPrice)} × ${b.paidQty}개 = ${won(b.grossSales)}` },
      { label: "상품값 (덤으로 주는 것까지)", formula: `${won(input.unitCogs)} × ${b.totalQty}개 = ${won(b.totalCogs)}` },
      { label: "카드·결제 수수료", formula: `${won(b.grossSales)} × ${pctPlain(input.pgRate)} = ${won(b.pgFee)}` },
      { label: "택배·포장비 (박스 1개)", formula: won(b.shipping) },
      {
        label: "광고비 쓰기 전에 남는 돈",
        formula: `${won(b.grossSales)} − ${won(b.totalCogs)} − ${won(b.pgFee)} − ${won(b.shipping)} = ${won(b.cm1)}`
      },
      {
        label: "본전 되는 광고 효율",
        formula: b.beRoas === null ? "계산할 수 없어요 (남는 돈이 0원 이하)" : `${won(b.grossSales)} ÷ ${won(b.cm1)} = ${pct1(b.beRoas)}`
      },
      {
        label: "주문 1건에 쓸 수 있는 최대 광고비",
        formula: b.maxCpa === null ? "한계선 없음 (남기고 싶은 돈을 낼 수 없어요)" : `${won(b.cm1)} − ${won(input.targetMinMargin)} = ${won(b.maxCpa)}`
      }
    ];
  }

  return Object.freeze({ won, pct1, pctPlain, summary, steps });
});
