import re

__all__ = ["get_rgb_for_color", "get_hsl_for_color", "normalize_color"]

color_re = re.compile(r"#[a-f0-9]{6}", re.I)


def get_rgb_for_color(color: str) -> tuple[int, int, int]:
    color = normalize_color(color)
    return (
        int(color[1:3], 16),
        int(color[3:5], 16),
        int(color[5:7], 16),
    )


def get_hsl_for_color(color: str) -> tuple[int, int, int]:
    r, g, b = map(lambda shade: shade / 255, get_rgb_for_color(color))
    min_shade = min(r, min(g, b))
    max_shade = max(r, max(g, b))

    delta = max_shade - min_shade

    l = (min_shade + max_shade) / 2
    s = delta / (2 * l if l < 0.5 else 2 - 2 * l) if 0 < l < 1 else 0
    h = 0

    if delta > 0:
        if max_shade == r and max_shade != g:
            h += (g - b) / delta
        if max_shade == g and max_shade != b:
            h += 2 + (b - r) / delta
        if max_shade == b and max_shade != r:
            h += 4 + (r - g) / delta
    h /= 6
    return (
        int(h * 255),
        int(s * 255),
        int(l * 255),
    )


def normalize_color(color: str) -> str:
    if not color_re.match(color):
        raise ValueError(
            "Invalid color format: got " + color + ", " + "should be #xxxxxx"
        )
    return color.upper()
