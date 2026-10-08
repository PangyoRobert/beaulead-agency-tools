#!/usr/bin/env python3
"""업종별 매출원가율 벤치마크 페이지의 데이터를 한국은행 ECOS 에서 받아 HTML 안에 고정한다.

    python3 scripts/fetch_cost_ratio.py            # 받아서 cost-ratio-benchmark/index.html 에 반영
    python3 scripts/fetch_cost_ratio.py --dry-run  # 받기만 하고 결과를 출력(파일은 그대로)

출처: 한국은행 기업경영분석, ECOS 통계표 501Y006(손익 지표, 제11차 한국표준산업분류),
계정항목 612(매출원가대매출액, %). 기업규모 A=종합, L=대기업, M=중소기업.

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


def collect() -> dict:
    key = api_key()
    values: dict[str, dict[str, dict[str, float] | None]] = {}
    for industry in INDUSTRIES:
        values[industry] = {size: fetch_series(key, industry, size) for size in SIZES}
        if values[industry]["A"] is None:
            raise RuntimeError(f"{industry}: 종합(A) 값이 없다. 업종 코드를 확인한다.")
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
    if args.dry_run:
        print(json.dumps(data["values"], ensure_ascii=False)[:2000])
        return 0
    write_inline(data)
    print(f"wrote {PAGE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
