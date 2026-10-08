#!/usr/bin/env python3
"""업종별 매출원가율 벤치마크 페이지의 데이터를 한국은행 ECOS 에서 받아 HTML 안에 고정한다.

    python3 scripts/fetch_cost_ratio.py            # 받아서 cost-ratio-benchmark/index.html 에 반영
    python3 scripts/fetch_cost_ratio.py --dry-run  # 받기만 하고 결과를 출력(파일은 그대로)

출처: 한국은행 기업경영분석(ECOS).
- 501Y006 손익 지표, 계정항목 612 매출원가대매출액(%) — 14개 업종 × 기업규모 A=종합, L=대기업, M=중소기업 × 2020~2024
- 501Y006 손익 지표(전 항목) — 제조업 11개 업종, 종합, 최신 연도. 재료비·변동비·고정비 대 매출액,
  손익분기점률, 영업이익률, 세전순이익률
- 501Y003 제조원가명세서(백만원) — 제조업 11개 업종, 종합, 최신 연도. 재료비·노무비·경비와 경비 세부 항목
- 501Y002 손익계산서(백만원) — 제조업 11개 업종, 종합, 최신 연도. 매출액·매출원가·판관비·영업손익 등
  매출 = 매출원가 + 판관비 + 영업손익 이고, 매출원가 − 당기총제조비용 = 상품 매입원가·재고 변동 등(세부 미상)
- 501Y006 손익 지표, 계정항목 612 — 도매업·소매 업태 6개, 종합, 최신 연도. 소비자가 대비 대략 범위 계산용
  (소매점 매입원가율 = 소매업 매출원가율)

인증키는 환경변수 ECOS_API_KEY 또는 저장소 루트의 `.env`(커밋되지 않는 파일)에서만 읽는다.
키를 출력하거나 파일에 쓰지 않는다.

페이지는 실행 중에 API 를 부르지 않는다. 받은 값을 index.html 안의
`<script id="cost-ratio-data">` 블록으로 박아 넣는다. 별도 .json/.js 파일로 두면
브라우저가 파일마다 따로 캐시해서 화면 코드와 데이터가 어긋날 수 있다(2026-10-06 사고).
업종 목록·이름·주의 문구는 같은 HTML 의 `cost-ratio-config` 블록이 원본이고, 여기의
INDUSTRIES 는 받을 코드 목록이다. 둘이 같은지는 scripts/test_cost_ratio_benchmark.js 가 본다.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "cost-ratio-benchmark" / "index.html"

API = "https://ecos.bok.or.kr/api/StatisticSearch"
TABLE = "501Y006"
ITEM = "612"
SIZES = ("A", "L", "M")  # 종합, 대기업, 중소기업
START, END = 2020, 2024

COST_ITEMS = {  # 501Y003 계정항목 코드 → 데이터 키
    "310000": "totalManufacturingCost",  # 당기총제조비용 = 재료비 + 노무비 + 경비
    "311000": "materials",               # 재료비
    "312000": "labor",                   # 노무비(생산 인건비)
    "313000": "overhead",                # 경비
    "313010": "welfare",                 # 복리후생비(경비 안)
    "313020": "electricity",             # 전력비
    "313030": "gasWater",                # 가스수도비
    "313040": "depreciation",            # 감가상각비
    "313090": "outsourcing",             # 외주가공비
}

INCOME_ITEMS = {  # 501Y002 계정항목 코드 → 데이터 키
    "210000": "sales",                # 매출액
    "220000": "cogs",                 # 매출원가
    "241000": "sga",                  # 판매비와관리비
    "241090": "advertising",          # 광고선전비(판관비 안)
    "240000": "operatingIncome",      # 영업손익
    "253000": "nonOperatingIncome",   # 영업외수익
    "254000": "nonOperatingExpense",  # 영업외비용
}

RATIO_ITEMS = {  # 501Y006 계정항목 코드 → 데이터 키(%)
    "617": "materialToSales",     # 재료비대매출액
    "6134": "variableToSales",    # 변동비대매출액 (한국은행 정의: 총비용 − 고정비)
    "6144": "fixedToSales",       # 고정비대매출액 (판관비 전부 + 영업외비용 + 노무비 ½ 등)
    "6284": "breakEven",          # 손익분기점률
    "611": "operatingMargin",     # 매출액영업이익률
    "6091": "pretaxMargin",       # 매출액세전순이익률
}

CHANNELS = ("G46", "G4711", "G4712", "G479", "G4791", "G4718")  # 도매, 대형마트·면세점, 기타 종합소매, 일반 소매, 통신판매, 백화점

INDUSTRIES = (
    "C10", "C106", "C107", "C108", "C11", "C112", "C14",
    "C15", "C204", "C21", "C32", "G47", "G4791", "I56",
)

START_MARK = '<script id="cost-ratio-data">'
END_MARK = "</script>"


def api_key() -> str:
    key = os.environ.get("ECOS_API_KEY", "").strip()
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("ECOS_API_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        sys.exit("ECOS_API_KEY 가 없다. 환경변수나 저장소 루트 .env 에 넣는다.")
    return key


def fetch_series(key: str, industry: str, size: str) -> dict[str, float] | None:
    path = "/".join([urllib.parse.quote(key), "json", "kr", "1", "100", TABLE, "A",
                     str(START), str(END), industry, size, ITEM])
    with urllib.request.urlopen(f"{API}/{path}", timeout=60) as response:
        body = json.load(response)
    rows = body.get("StatisticSearch", {}).get("row")
    if not rows:
        code = body.get("RESULT", {}).get("CODE", "")
        if code == "INFO-200":  # 해당하는 데이터 없음: 그 규모의 값을 제공하지 않는 업종
            return None
        raise RuntimeError(f"{industry}/{size}: 예상하지 못한 응답 {body.get('RESULT')}")
    series = {}
    for row in rows:
        value = row.get("DATA_VALUE")
        series[row["TIME"]] = None if value in (None, "") else float(value)
    # 세부 업종의 대기업·중소기업은 "데이터 없음" 대신 값이 빈 행으로 온다. 전부 비면 없는 계열로 본다.
    if all(v is None for v in series.values()):
        return None
    return series


def fetch_rows(key: str, table: str, industry: str, item: str = "") -> list[dict]:
    parts = [urllib.parse.quote(key), "json", "kr", "1", "100", table, "A",
             str(END), str(END), industry, "A"] + ([item] if item else [])
    with urllib.request.urlopen(f"{API}/{'/'.join(parts)}", timeout=120) as response:
        body = json.load(response)
    rows = body.get("StatisticSearch", {}).get("row")
    if not rows:
        raise RuntimeError(f"{table}/{industry}/{item or '*'}: 값이 없다 {body.get('RESULT')}")
    return rows


def manufacturing_codes() -> list[str]:
    return [code for code in INDUSTRIES if code.startswith("C")]


def pick(key: str, table: str, code: str, items: dict[str, str]) -> dict[str, float]:
    # 계정항목을 비우면 그 통계표의 전 항목이 한 번에 온다(호출 1번).
    rows = {row["ITEM_CODE3"]: row["DATA_VALUE"] for row in fetch_rows(key, table, code)}
    missing = [item for item in items if rows.get(item) in (None, "")]
    if missing:
        raise RuntimeError(f"{table}/{code}: 항목 없음 {missing}")
    return {name: float(rows[item]) for item, name in items.items()}


def collect_manufacturing(key: str) -> tuple[dict, dict, dict]:
    composition, income, ratios = {}, {}, {}
    for code in manufacturing_codes():
        composition[code] = pick(key, "501Y003", code, COST_ITEMS)
        income[code] = pick(key, "501Y002", code, INCOME_ITEMS)
        ratios[code] = pick(key, "501Y006", code, RATIO_ITEMS)
    return composition, income, ratios


def collect() -> dict:
    key = api_key()
    values: dict[str, dict[str, dict[str, float] | None]] = {}
    for industry in INDUSTRIES:
        values[industry] = {size: fetch_series(key, industry, size) for size in SIZES}
        if values[industry]["A"] is None:
            raise RuntimeError(f"{industry}: 종합(A) 값이 없다. 업종 코드를 확인한다.")
    composition, income, ratios = collect_manufacturing(key)
    channels = {}
    for code in CHANNELS:
        rows = fetch_rows(key, "501Y006", code, ITEM)
        channels[code] = {"name": rows[0]["ITEM_NAME1"], "cogsRatio": float(rows[0]["DATA_VALUE"])}
    kst = timezone(timedelta(hours=9))
    return {
        "source": {
            "publisher": "한국은행 기업경영분석",
            "table": TABLE,
            "item": ITEM,
            "itemName": "매출원가대매출액",
            "unit": "%",
            "years": [str(y) for y in range(START, END + 1)],
            "fetchedAt": datetime.now(kst).strftime("%Y-%m-%d"),
        },
        "values": values,
        # 제조업만, 연도는 source.years 의 마지막 해. 금액은 백만원, 비율은 %.
        "materialToSales": {code: r["materialToSales"] for code, r in ratios.items()},
        "ratios": ratios,
        "composition": composition,
        "income": income,
        "compositionSource": {"table": "501Y003", "name": "제조원가명세서", "unit": "백만원", "year": str(END)},
        "incomeSource": {"table": "501Y002", "name": "손익계산서", "unit": "백만원", "year": str(END)},
        # 도매·소매 업태의 매출원가율(%) = 그 단계에서 상품을 사 온 값의 비율. 연도는 최신 연도.
        "channels": channels,
    }


def write_inline(data: dict) -> None:
    html = PAGE.read_text(encoding="utf-8")
    start = html.index(START_MARK) + len(START_MARK)
    end = html.index(END_MARK, start)
    block = (
        "\n  // 생성물: scripts/fetch_cost_ratio.py 가 ECOS 에서 받아 쓴다. 손으로 고치지 않는다.\n"
        "  window.COST_RATIO_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2).replace("\n", "\n  ")
        + ";\n  "
    )
    PAGE.write_text(html[:start] + block + html[end:], encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="받기만 하고 파일은 그대로 둔다")
    args = parser.parse_args()
    data = collect()
    filled = sum(v is not None for sizes in data["values"].values() for v in sizes.values())
    print(f"{len(INDUSTRIES)} industries x {len(SIZES)} sizes = {len(INDUSTRIES) * len(SIZES)} series, "
          f"{filled} with data; years {START}-{END}; fetched {data['source']['fetchedAt']}")
    print(f"manufacturing cost statement + income statement + ratios: {len(data['composition'])} industries ({END})")
    if args.dry_run:
        print(json.dumps(data["values"], ensure_ascii=False)[:2000])
        return 0
    write_inline(data)
    print(f"wrote {PAGE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
