#!/usr/bin/env python3
"""브랜드 자산(파비콘 · og 이미지)을 확정 원본에서 생성한다.

원본은 이 저장소가 아니라 `~/brand-design-system/brands/beaulead/assets/` 다.
여기서는 복제하지 않고 생성만 한다 — 그 레포의 "같은 값을 두 곳에 적기 금지"
규칙 때문이다. 원본이 바뀌면 이 스크립트를 다시 돌린다.

생성물은 `shared/brand/` 아래에 놓이며 사람이 직접 편집하지 않는다.

    python3 scripts/build_brand_assets.py

og 이미지는 Pretendard 로 렌더해야 하므로 PIL 이 아니라 헤드리스 Chrome 이
`scripts/og-template.html` 을 1200x630 으로 찍는다. Chrome 이 없으면 og
이미지만 건너뛰고 파비콘은 만든다.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = Path.home() / "brand-design-system" / "brands" / "beaulead" / "assets"
OUT = ROOT / "shared" / "brand"

# brands/beaulead/tokens.json → color.surface.default
SURFACE = (255, 255, 255, 255)

CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def on_surface(mark: Image.Image, size: int, pad_ratio: float) -> Image.Image:
    """마크를 브랜드 배경색 정사각형 위에 올린다.

    아이콘 안에서는 인접 요소가 없고 아이콘 경계 자체가 여백이라, asset-rules 의
    "클리어스페이스 = 심볼 높이의 1배" 를 그대로 적용하지 않는다. 그 값을 쓰면
    16px 파비콘에서 마크가 5px 가 되어 읽히지 않는다.
    """
    canvas = Image.new("RGBA", (size, size), SURFACE)
    inner = max(1, round(size * (1 - pad_ratio * 2)))
    scaled = mark.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.alpha_composite(scaled, (offset, offset))
    return canvas


def build_favicons(mark: Image.Image) -> list[Path]:
    written = []

    ico_sizes = [16, 32, 48, 64]
    # 작은 크기일수록 여백을 줄여야 마크가 살아남는다.
    frames = [on_surface(mark, s, 0.08 if s <= 32 else 0.12) for s in ico_sizes]
    ico = OUT / "favicon.ico"
    frames[-1].save(ico, format="ICO", sizes=[(s, s) for s in ico_sizes])
    written.append(ico)

    for size in (16, 32):
        path = OUT / f"favicon-{size}.png"
        on_surface(mark, size, 0.08).save(path, format="PNG")
        written.append(path)

    apple = OUT / "apple-touch-icon.png"
    on_surface(mark, 180, 0.15).save(apple, format="PNG")
    written.append(apple)

    return written


def build_og() -> Path | None:
    template = ROOT / "scripts" / "og-template.html"
    target = OUT / "og-default.png"

    if not CHROME.exists():
        print(f"건너뜀: Chrome 이 없어 og 이미지를 만들지 못했다 ({CHROME})")
        return None

    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp)
        shutil.copy(template, stage / "index.html")
        shutil.copy(BRAND / "beaulead-wordmark.png", stage / "wordmark.png")
        shot = stage / "og.png"
        subprocess.run(
            [
                str(CHROME),
                "--headless",
                "--disable-gpu",
                "--hide-scrollbars",
                f"--screenshot={shot}",
                "--window-size=1200,630",
                "--virtual-time-budget=10000",
                (stage / "index.html").as_uri(),
            ],
            check=True,
            capture_output=True,
        )
        image = Image.open(shot).convert("RGB")
        if image.size != (1200, 630):
            raise SystemExit(f"og 이미지 크기가 어긋났다: {image.size}")
        image.save(target, format="PNG", optimize=True)

    return target


def main() -> int:
    if not BRAND.exists():
        raise SystemExit(f"브랜드 원본을 찾지 못했다: {BRAND}")

    OUT.mkdir(parents=True, exist_ok=True)
    mark = Image.open(BRAND / "beaulead-mark.png").convert("RGBA")

    written = build_favicons(mark)
    og = build_og()
    if og:
        written.append(og)

    for path in written:
        print(f"생성 {path.relative_to(ROOT)}  {path.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
