from py_namethatcolor.data import RAW_NAMES, RAW_SHADES
from py_namethatcolor.models import Color, Hsl, Rgb, Shade
from py_namethatcolor.utils import (
    get_hsl_for_color,
    get_rgb_for_color,
    normalize_color,
)

__all__ = ["NameThatCode", "get_color"]


class NameThatCode:
    shades: dict[str, Shade] = {}
    colors: dict[str, Color] = {}

    @classmethod
    def initialize(cls):
        cls.shades = {
            name: Shade(rgb=Rgb.from_color("#" + color), name=name)
            for color, name in RAW_SHADES
        }
        cls.colors = {
            "#"
            + rgb: Color(
                name=color_name,
                rgb=Rgb.from_color("#" + rgb),
                hsl=Hsl.from_color("#" + rgb),
                shade=cls.shades[shade_name],
                exact_match=True,
            )
            for rgb, color_name, shade_name in RAW_NAMES
        }

    @classmethod
    def get_color(cls, color: str) -> Color:
        color = normalize_color(color)
        cur_red, cur_green, cur_blue = get_rgb_for_color(color)
        cur_hue, cur_sat, cur_lgt = get_hsl_for_color(color)

        cl, df = None, -1
        if not cls.colors or not cls.shades:
            cls.initialize()
        for color_rgb, color_obj in cls.colors.items():
            if color == color_obj.rgb.as_string():
                return color_obj
            ndf1 = sum(
                (
                    pow(cur_red - color_obj.rgb.r, 2),
                    pow(cur_green - color_obj.rgb.g, 2),
                    pow(cur_blue - color_obj.rgb.b, 2),
                )
            )
            ndf2 = sum(
                (
                    pow(cur_hue - color_obj.hsl.h, 2),
                    pow(cur_sat - color_obj.hsl.s, 2),
                    pow(cur_lgt - color_obj.hsl.l, 2),
                )
            )
            ndf = ndf1 + ndf2 * 2
            if df < 0 or df > ndf:
                df = ndf
                cl = color_rgb
        if not cl:
            raise ValueError("Color not found")
        return cls.colors[cl]


get_color = NameThatCode.get_color
