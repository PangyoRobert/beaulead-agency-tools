#!/usr/bin/env python3
"""브랜드 색·서체 토큰을 확정 원본에서 CSS 로 생성한다.

원본은 이 저장소가 아니라 `~/brand-design-system/brands/beaulead/tokens.json` 이다.
`scripts/build_brand_assets.py` 와 같은 방식으로 로컬에서 돌리고 산출물을 커밋한다.
CI 에는 그 레포가 없어서 재생성할 수 없다.

    python3 scripts/build_tokens.py

생성물 두 개 — 둘 다 손으로 편집하지 않는다.

- `shared/tokens.css`  각 페이지가 읽는 CSS 변수
- `data/brand-tokens.json`  같은 값의 기계 판독본 + 출처. `scripts/check_colors.py`
  가 이걸 읽어 아티팩트에 토큰 밖 색이 있는지 CI 에서 검사한다. 원본 레포 없이
  돌아가야 하므로 값을 저장소 안에 남긴다.
"""

from __future__ import annotations

import json
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRAND_REPO = Path.home() / "brand-design-system"
SOURCE = BRAND_REPO / "brands" / "beaulead" / "tokens.json"

CSS_OUT = ROOT / "shared" / "tokens.css"
JSON_OUT = ROOT / "data" / "brand-tokens.json"

# (CSS 변수 이름, tokens.json 경로). 순서가 생성물의 순서다.
COLOR_MAP = (
    ("brand-primary", "color.brand.primary"),
    ("brand-accent", "color.brand.accent"),
    ("text-default", "color.text.default"),
    ("text-muted", "color.text.muted"),
    ("text-inverse", "color.text.inverse"),
    ("text-body-on-light", "color.text.body_on_light"),
    ("surface-default", "color.surface.default"),
    ("surface-raised", "color.surface.raised"),
    ("surface-inverse", "color.surface.inverse"),
    ("state-success", "color.state.success"),
    ("state-warning", "color.state.warning"),
    ("state-danger", "color.state.danger"),
    ("rule-on-light", "color.rule.on_light"),
    ("rule-on-dark", "color.rule.on_dark"),
    ("on-dark-body", "color.on_dark.body"),
    ("on-dark-label", "color.on_dark.label"),
)

# (CSS 변수 이름, 서체 경로, fallback 경로, 그 사이에 끼울 시스템 서체).
# 시스템 서체는 브랜드 확정값이 아니라 웹 관례라 여기 둔다.
FONT_MAP = (
    (
        "font-primary",
        "font.primary.family",
        "font.fallback.sans",
        ("-apple-system", "BlinkMacSystemFont", '"Segoe UI"'),
    ),
    ("font-mono", "font.secondary.family", "font.fallback.mono", ()),
)


def quote(family: str) -> str:
    """공백이 있는 서체 이름은 CSS 에서 따옴표가 필요하다."""
    return f'"{family}"' if " " in family else family


def dig(data: dict, path: str):
    node = data
    for part in path.split("."):
        node = node[part]
    return node


def source_commit() -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(BRAND_REPO), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main() -> int:
    if not SOURCE.exists():
        print(f"원본을 찾을 수 없다: {SOURCE}")
        print("brand-design-system 레포가 홈 디렉토리에 있어야 한다.")
        return 1

    tokens = json.loads(SOURCE.read_text(encoding="utf-8"))

    colors: dict[str, str] = {}
    for name, path in COLOR_MAP:
        value = dig(tokens, path)
        if value is None:
            # 미확정 값을 그럴듯하게 채우지 않는다. 원본 레포의 1번 규칙이다.
            print(f"{path} 가 아직 null 이다. 확정 전까지 생성할 수 없다.")
            return 1
        colors[name] = value.upper()

    chart = [c.upper() for c in dig(tokens, "chart.sequential")]
    commit = source_commit()
    today = date.today().isoformat()

    lines = [
        "/* 생성물이다. 손으로 고치지 말고 `python3 scripts/build_tokens.py` 를 돌린다.",
        f" * 원본: brand-design-system/brands/beaulead/tokens.json @ {commit}",
        f" * 생성: {today}",
        " *",
        " * 어두운 배경에서 --bl-brand-accent 는 본문 텍스트에 쓰지 않는다 —",
        " * #161616 위 3.62:1 로 4.5:1 기준에 미달한다. 면·테두리·큰 제목에만 쓰고",
        " * 본문 강조는 --bl-text-inverse, 보조 본문은 --bl-on-dark-body 를 쓴다.",
        " * 근거는 brand-design-system/brands/beaulead/asset-rules.md 「웹 UI 색 사용」.",
        " */",
        ":root {",
    ]
    for name, _ in COLOR_MAP:
        lines.append(f"  --bl-{name}: {colors[name]};")
    lines.append("")
    for index, value in enumerate(chart, start=1):
        lines.append(f"  --bl-chart-{index}: {value};")
    lines.append("")
    fonts: dict[str, str] = {}
    for name, family_path, fallback_path, system in FONT_MAP:
        stack = ", ".join(
            [quote(dig(tokens, family_path)), *system, dig(tokens, fallback_path)]
        )
        fonts[name] = stack
        lines.append(f"  --bl-{name}: {stack};")
    lines += ["}", ""]

    CSS_OUT.write_text("\n".join(lines), encoding="utf-8")

    JSON_OUT.write_text(
        json.dumps(
            {
                "$comment": (
                    "생성물이다. 손으로 고치지 말고 `python3 scripts/build_tokens.py` 를 돌린다. "
                    "CI 에는 brand-design-system 이 없어서 재생성할 수 없으므로 값을 여기 남긴다. "
                    "scripts/check_colors.py 가 이걸 읽어 토큰 밖 색을 잡는다."
                ),
                "source": "brand-design-system/brands/beaulead/tokens.json",
                "source_commit": commit,
                "generated": today,
                "colors": colors,
                "chart": chart,
                "fonts": fonts,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"생성함 (원본 {commit}):")
    print(f"  {CSS_OUT.relative_to(ROOT)}  — 색 {len(colors)}종 + 차트 {len(chart)}종")
    print(f"  {JSON_OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
