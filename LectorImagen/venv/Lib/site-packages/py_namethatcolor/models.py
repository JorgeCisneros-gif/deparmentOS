from __future__ import annotations

from dataclasses import dataclass

from py_namethatcolor.utils import get_hsl_for_color, get_rgb_for_color

__all__ = ["Color", "Hsl", "Rgb", "Shade"]


@dataclass
class Rgb:
    r: int
    g: int
    b: int

    @classmethod
    def from_color(cls, color: str) -> Rgb:
        return cls(*get_rgb_for_color(color))

    def as_string(self):
        return "#" + "".join(
            [
                "{:02x}".format(self.r),
                "{:02x}".format(self.g),
                "{:02x}".format(self.b),
            ]
        ).upper()


@dataclass
class Hsl:
    h: int
    s: int
    l: int

    @classmethod
    def from_color(cls, color: str) -> Hsl:
        return cls(*get_hsl_for_color(color))


@dataclass
class Shade:
    rgb: Rgb
    name: str


@dataclass
class Color:
    name: str
    rgb: Rgb
    hsl: Hsl
    shade: Shade
    exact_match: bool = False
    closest: "Color" = None
