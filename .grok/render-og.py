#!/usr/bin/env python3
"""Typeset the المؤمل letterhead share card at 2400×1260 (2× 1200×630)."""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 2400, 1260
PAPER = "#FFFEFB"
NAVY = "#12336B"
ROYAL = "#1B4FBF"
ROYAL_DEEP = "#163F99"
CRIMSON = "#A31830"
CRIMSON_DEEP = "#7A1022"
INK = "#FFFEFB"

FONT_DIR = "/workspace/.grok/fonts"
CALLI = ImageFont.truetype(f"{FONT_DIR}/ElMessiri-Bold.ttf", 500)
WASL = ImageFont.truetype(f"{FONT_DIR}/Cairo-ExtraBold.ttf", 62)
TAG = ImageFont.truetype(f"{FONT_DIR}/Cairo-ExtraBold.ttf", 90)

NAME = "المؤمل"
WASL_WORD = "وصل"
TAGLINE = "للمواد الانشائية والكهربائية"


def text_size(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font, direction="rtl", language="ar")
    return box[2] - box[0], box[3] - box[1], box


def draw_text_center(draw, cx, cy, text, font, fill):
    w, h, box = text_size(draw, text, font)
    x = cx - w / 2 - box[0]
    y = cy - h / 2 - box[1]
    draw.text((x, y), text, font=font, fill=fill, direction="rtl", language="ar")
    return w, h


def ribbon_polygon(x0, x1, y_ends, arch, thickness, samples=120):
    def center(t):
        x = x0 + (x1 - x0) * t
        y = y_ends - 4 * arch * t * (1 - t)
        return x, y

    def deriv(t):
        return (x1 - x0), -4 * arch * (1 - 2 * t)

    upper, lower = [], []
    for i in range(samples + 1):
        t = i / samples
        x, y = center(t)
        dx, dy = deriv(t)
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        taper = 0.86 + 0.14 * math.sin(math.pi * t)
        half = thickness * taper / 2
        upper.append((x + nx * half, y + ny * half))
        lower.append((x - nx * half, y - ny * half))
    return upper + lower[::-1]


def draw_plug(draw, cx, cy, scale=1.0):
    prong_w = 15 * scale
    prong_h = 38 * scale
    gap = 20 * scale
    body_w = 72 * scale
    body_h = 56 * scale
    top = cy - body_h * 0.08
    for sign in (-1, 1):
        px = cx + sign * (gap / 2 + prong_w / 2) - prong_w / 2
        draw.rounded_rectangle(
            [px, top - prong_h, px + prong_w, top + 8 * scale],
            radius=4 * scale,
            fill=INK,
        )
    draw.rounded_rectangle(
        [cx - body_w / 2, top, cx + body_w / 2, top + body_h],
        radius=12 * scale,
        fill=INK,
    )
    r = 6.5 * scale
    hy = top + body_h * 0.56
    draw.ellipse([cx - r, hy - r, cx + r, hy + r], fill=CRIMSON)


def draw_diamond(draw, cx, cy, s, fill):
    draw.polygon(
        [(cx, cy - s), (cx + s * 0.78, cy), (cx, cy + s), (cx - s * 0.78, cy)],
        fill=fill,
    )


def main():
    im = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(im)

    name_w, name_h, _ = text_size(draw, NAME, CALLI)
    tag_w, tag_h, _ = text_size(draw, TAGLINE, TAG)
    wasl_w, wasl_h, _ = text_size(draw, WASL_WORD, WASL)

    # Horizontal measure of the header: wide enough for the calligraphy
    # with real margins, never edge to edge.
    left = 160
    right = W - 160

    frieze_h = 72
    chip_h = wasl_h + 22
    pad_after_frieze = 28
    pad_after_chip = 8
    # Swoosh sits just under the blue; only a sliver of empty header is covered.
    pad_under_name = 48
    arch = 28
    ribbon_thick = max(156, int(tag_h + 84))
    below_ribbon = 86  # diamond + air under the swoosh ends

    content_h = (
        frieze_h
        + pad_after_frieze
        + chip_h
        + pad_after_chip
        + name_h
        + pad_under_name
        + ribbon_thick
        + arch
        + below_ribbon
    )
    top = max(72, (H - content_h) / 2)

    banner_top = top
    name_cy = (
        banner_top
        + frieze_h
        + pad_after_frieze
        + chip_h
        + pad_after_chip
        + name_h / 2
    )
    # Keep a band of royal blue under the glyphs so the swoosh never cuts them.
    # The ribbon only overlaps that empty blue, the way the printed header does.
    pad_under_name = 48
    banner_bot = name_cy + name_h / 2 + pad_under_name
    ribbon_top_center = banner_bot - 16
    ribbon_ends_y = ribbon_top_center + ribbon_thick / 2 + arch

    # Navy plate, then the royal field the calligraphy sits on.
    draw.rounded_rectangle(
        [left - 16, banner_top - 16, right + 16, banner_bot + 10],
        radius=6,
        fill=NAVY,
    )
    draw.rectangle([left, banner_top, right, banner_bot], fill=ROYAL)

    frieze_bot = banner_top + frieze_h
    draw.rectangle([left, banner_top, right, frieze_bot], fill=NAVY)
    step = 44
    cx = left + 26
    toggle = False
    while cx < right - 18:
        if toggle:
            draw_diamond(draw, cx, (banner_top + frieze_bot) / 2, 11, ROYAL)
        else:
            draw_diamond(draw, cx, (banner_top + frieze_bot) / 2, 12, PAPER)
        toggle = not toggle
        cx += step
    draw.rectangle([left, frieze_bot, right, frieze_bot + 5], fill=PAPER)
    draw.rectangle([left, frieze_bot + 5, right, frieze_bot + 11], fill=ROYAL_DEEP)

    deep = ribbon_polygon(left - 6, right + 6, ribbon_ends_y + 14, arch, ribbon_thick + 26)
    draw.polygon(deep, fill=CRIMSON_DEEP)
    face = ribbon_polygon(left - 6, right + 6, ribbon_ends_y, arch, ribbon_thick)
    draw.polygon(face, fill=CRIMSON)

    plug_y = ribbon_ends_y - 4
    draw_plug(draw, left + 78, plug_y, scale=1.05)
    draw_plug(draw, right - 78, plug_y, scale=1.05)

    chip_cy = banner_top + frieze_h + pad_after_frieze + chip_h / 2
    pad_x = 28
    draw.rounded_rectangle(
        [
            W / 2 - wasl_w / 2 - pad_x,
            chip_cy - chip_h / 2,
            W / 2 + wasl_w / 2 + pad_x,
            chip_cy + chip_h / 2,
        ],
        radius=8,
        fill=CRIMSON,
    )
    draw_text_center(draw, W / 2, chip_cy + 1, WASL_WORD, WASL, INK)
    draw_text_center(draw, W / 2, name_cy, NAME, CALLI, INK)

    # Tagline sits on the raised middle of the ribbon.
    tag_cy = ribbon_ends_y - arch
    draw_text_center(draw, W / 2, tag_cy, TAGLINE, TAG, INK)

    diamond_y = ribbon_ends_y + ribbon_thick / 2 + 46
    draw_diamond(draw, W / 2, diamond_y, 26, CRIMSON)
    draw_diamond(draw, W / 2, diamond_y, 11, PAPER)

    print(f"name {name_w:.0f}x{name_h:.0f} ({name_w / W:.1%} wide)")
    print(f"tag  {tag_w:.0f}x{tag_h:.0f} ({tag_w / W:.1%} wide)")
    print(f"top={top:.0f} banner_bot={banner_bot:.0f} ribbon={ribbon_ends_y:.0f} diamond={diamond_y:.0f}")
    print(f"bottom_margin={H - (diamond_y + 26):.0f}")

    im.save("/workspace/.grok/og-raw.png", "PNG")


if __name__ == "__main__":
    main()
