"""Regenerate pixel-identical display assets. Requires Pillow with WebP support."""
from pathlib import Path
from PIL import Image

folder = Path(__file__).resolve().parent.parent / "src/components/subgrade-reaction"
for name in ("figure-3-3", "figure-3-6"):
    source = folder / (name + ".png")
    target = source.with_suffix(".webp")
    with Image.open(source) as original:
        original.save(target, "WEBP", lossless=True, method=6, exact=True)
        with Image.open(target) as optimized:
            if original.convert("RGBA").tobytes() != optimized.convert("RGBA").tobytes():
                raise RuntimeError("Pixel mismatch: " + name)
    print(f"{name}: {source.stat().st_size:,} → {target.stat().st_size:,} bytes; exact pixels verified")
