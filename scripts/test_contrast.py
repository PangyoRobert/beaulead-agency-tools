#!/usr/bin/env python3
"""토큰 조합의 명암비 회귀 테스트.

브랜드 토큰을 그대로 썼다고 해서 읽히는 것은 아니다. brand.accent 는 어두운
배경에서 3.62:1 이라 본문에 못 쓰고, 액센트 면 위의 흰 글씨는 5.00:1 뿐이라
투명도를 낮추면 바로 기준을 깬다 — 실제로 프로필 영역이 그래서 깨져 있었다.

여기서 고정하는 것은 **사이트가 실제로 쓰는 조합**이다. 토큰 값이 바뀌거나
누가 조합을 바꾸면 이 테스트가 먼저 걸린다.

WCAG 2.1 기준: 본문 4.5:1, 큰 글씨(24px 또는 굵은 18.66px 이상) 3:1.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS = json.loads((ROOT / "data" / "brand-tokens.json").read_text(encoding="utf-8"))
C = TOKENS["colors"]

BODY, LARGE = 4.5, 3.0


def channel(value: int) -> float:
    c = value / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def rgb(value: str) -> tuple[int, int, int]:
    body = value.lstrip("#")
    return int(body[0:2], 16), int(body[2:4], 16), int(body[4:6], 16)


def luminance(color: tuple[int, int, int]) -> float:
    r, g, b = (channel(v) for v in color)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg: tuple[int, int, int], bg: tuple[int, int, int]) -> float:
    high, low = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def blend(fg: tuple[int, int, int], alpha: float, bg: tuple[int, int, int]):
    return tuple(round(fg[i] * alpha + bg[i] * (1 - alpha)) for i in range(3))


DARK = rgb(C["surface-inverse"])
ACCENT = rgb(C["brand-accent"])
LIGHT = rgb(C["surface-default"])

# (설명, 전경, 배경, 최소 기준)
PAIRS = [
    ("다크 배경 본문", rgb(C["text-inverse"]), DARK, BODY),
    ("다크 배경 보조 본문", rgb(C["on-dark-body"]), DARK, BODY),
    ("다크 배경 액센트 (면·테두리·큰 글씨 전용)", ACCENT, DARK, LARGE),
    ("액센트 면 위 본문", rgb(C["text-inverse"]), ACCENT, BODY),
    ("라이트 배경 본문", rgb(C["text-default"]), LIGHT, BODY),
    ("라이트 배경 보조 본문", rgb(C["text-body-on-light"]), LIGHT, BODY),
    ("라이트 배경 액센트", ACCENT, LIGHT, BODY),
]

# 상태색은 글자로 쓰지 않는다. 흰 배경에서 경고는 1.68:1, 성공은 3.35:1 로
# 본문 기준을 못 넘는다. 셋 다 통하는 유일한 형태가 '옅은 틴트 배경 + 잉크
# 글자 + 원색 보더·아이콘' 이라 그것만 쓴다.
STATE_TINT = 0.15
for key in ("state-success", "state-warning", "state-danger"):
    tint = blend(rgb(C[key]), STATE_TINT, LIGHT)
    PAIRS.append((f"{key} 15% 틴트 위 잉크", rgb(C["text-default"]), tint, BODY))

failures: list[str] = []
print("토큰 조합 명암비")
for name, fg, bg, need in PAIRS:
    value = ratio(fg, bg)
    ok = value >= need
    print(f"  {'ok  ' if ok else 'FAIL'} {name:<42} {value:5.2f}:1 (>= {need})")
    if not ok:
        failures.append(f"{name}: {value:.2f}:1 < {need}")

print("\n쓰면 안 되는 조합 — 여기서 통과해버리면 규칙이 무의미해진다")
FORBIDDEN = [
    ("다크 배경 위 on-dark-label 본문", rgb(C["on-dark-label"]), DARK, BODY),
    ("다크 배경 위 액센트 본문", ACCENT, DARK, BODY),
    ("액센트 면 위 잉크", rgb(C["brand-primary"]), ACCENT, BODY),
    ("흰 배경 위 경고색 글자", rgb(C["state-warning"]), LIGHT, LARGE),
    ("흰 배경 위 성공색 본문", rgb(C["state-success"]), LIGHT, BODY),
]
for name, fg, bg, need in FORBIDDEN:
    value = ratio(fg, bg)
    blocked = value < need
    print(f"  {'ok  ' if blocked else 'FAIL'} {name:<42} {value:5.2f}:1 (< {need} 이어야 함)")
    if not blocked:
        failures.append(f"{name}: {value:.2f}:1 — 금지 근거가 사라졌으니 규칙을 다시 본다")

print("\n액센트 면 위 투명도 — 흰색이 5.00:1 뿐이라 낮출 여유가 없다")
for alpha in (0.6, 0.72, 0.85):
    value = ratio(blend(rgb(C["text-inverse"]), alpha, ACCENT), ACCENT)
    print(f"  흰색 {alpha:.0%} -> {value:.2f}:1")
if ratio(blend(rgb(C["text-inverse"]), 0.85, ACCENT), ACCENT) >= BODY:
    failures.append("액센트 면 위 85% 흰색이 본문 기준을 넘는다 — 주석의 근거가 틀렸다")

if failures:
    print(f"\n{len(failures)}개 실패:")
    for failure in failures:
        print(f"- {failure}")
    sys.exit(1)
print("\n전부 통과")
