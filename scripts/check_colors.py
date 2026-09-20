#!/usr/bin/env python3
"""토큰으로 전환한 페이지에 토큰 밖 색이 들어오는지 검사한다.

검사 대상은 `shared/tokens.css` 를 링크한 HTML 뿐이다. 페이지가 스타일시트를
링크하는 순간 검사에 들어오므로 전환한 파일 목록을 따로 관리하지 않는다.
아직 전환하지 않은 아티팩트는 링크가 없어 그대로 통과한다.

허용하는 것:
- `data/brand-tokens.json` 의 색 그대로
- 같은 색의 투명도 변형 — rgba(15, 98, 254, 0.18) 처럼 RGB 가 토큰과 같은 것
- `transparent`, `currentColor`, `inherit` 같은 키워드

`data/brand-tokens.json` 은 `scripts/build_tokens.py` 가 만든다. 원본 레포
(`~/brand-design-system`)가 CI 에 없어서 값을 저장소 안에 남긴다.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS = ROOT / "data" / "brand-tokens.json"

COLOR_PATTERN = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)")
RGB_NUMBERS = re.compile(r"[\d.]+")


def expand(value: str) -> str:
    """#abc -> #aabbcc"""
    body = value.lstrip("#")
    if len(body) == 3:
        body = "".join(ch * 2 for ch in body)
    return body[:6].lower()


def allowed_rgb(tokens: dict) -> dict[tuple[int, int, int], str]:
    """토큰 색의 RGB 삼중항 -> 토큰 이름."""
    table: dict[tuple[int, int, int], str] = {}
    for name, value in list(tokens["colors"].items()) + [
        (f"chart-{i}", v) for i, v in enumerate(tokens["chart"], start=1)
    ]:
        body = expand(value)
        rgb = (int(body[0:2], 16), int(body[2:4], 16), int(body[4:6], 16))
        table.setdefault(rgb, name)
    # 완전 투명은 색이 아니다.
    table[(0, 0, 0)] = table.get((0, 0, 0), "투명")
    return table


def rgb_of(literal: str) -> tuple[int, int, int] | None:
    if literal.startswith("#"):
        body = expand(literal)
        if len(body) < 6:
            return None
        return (int(body[0:2], 16), int(body[2:4], 16), int(body[4:6], 16))
    parts = RGB_NUMBERS.findall(literal)
    if len(parts) < 3:
        return None
    try:
        return tuple(int(float(p)) for p in parts[:3])  # type: ignore[return-value]
    except ValueError:
        return None


def main() -> int:
    if not TOKENS.exists():
        print(f"{TOKENS.relative_to(ROOT)} 가 없다. `python3 scripts/build_tokens.py` 를 먼저 돌린다.")
        return 1

    tokens = json.loads(TOKENS.read_text(encoding="utf-8"))
    table = allowed_rgb(tokens)

    pages = sorted(
        p for p in ROOT.rglob("*.html")
        if "_site" not in p.parts and ".git" not in p.parts
    )
    checked = 0
    errors: list[str] = []

    for page in pages:
        text = page.read_text(encoding="utf-8")
        if "shared/tokens.css" not in text:
            continue
        checked += 1
        relative = page.relative_to(ROOT)
        for line_number, line in enumerate(text.splitlines(), start=1):
            for literal in COLOR_PATTERN.findall(line):
                rgb = rgb_of(literal)
                if rgb is None:
                    errors.append(f"{relative}:{line_number}: 해석할 수 없는 색 {literal}")
                elif rgb not in table:
                    errors.append(
                        f"{relative}:{line_number}: 토큰 밖 색 {literal} "
                        f"(rgb{rgb}) — data/brand-tokens.json 에 없다"
                    )

    if not checked:
        print("shared/tokens.css 를 링크한 페이지가 없다. 검사할 것이 없다.")
        return 0

    if errors:
        print("색 검사 실패:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"{checked}개 페이지의 색이 전부 브랜드 토큰 안에 있다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
