"""Erzeugt die Larpcord-Platzhalter-Icons (App-Icon, Tray, Splash).

Aufruf: python scripts/generate-icons.py   (benötigt Pillow; Emoji-Schrift von Windows)
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..", "desktop")
EMOJI_FONTS = [r"C:\Windows\Fonts\seguiemj.ttf", "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"]


def gradient(size, top=(88, 101, 242), bottom=(235, 69, 158)):
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)
            px[x, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
    return img


def icon(size, unread=False):
    base = gradient(size)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 4, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)

    font_path = next((f for f in EMOJI_FONTS if os.path.exists(f)), None)
    draw = ImageDraw.Draw(out)
    if font_path:
        # Emoji-Schriften rendern nur in bestimmten Größen sauber → groß rendern, dann skalieren
        big = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        f = ImageFont.truetype(font_path, 109 if "Noto" in font_path else 300)
        ImageDraw.Draw(big).text((256, 270), "\U0001F3AD", font=f, anchor="mm", embedded_color=True)
        big = big.resize((int(size * 0.8), int(size * 0.8)), Image.LANCZOS)
        out.alpha_composite(big, (int(size * 0.1), int(size * 0.1)))
    else:
        draw.text((size / 2, size / 2), "L", fill="white", anchor="mm",
                  font=ImageFont.load_default(size=int(size * 0.6)))

    if unread:
        r = size // 5
        draw.ellipse((size - 2 * r, size - 2 * r, size - 1, size - 1), fill=(237, 66, 69, 255))
    return out


os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
big = icon(512)
big.save(os.path.join(ROOT, "build", "icon.png"))
big.save(os.path.join(ROOT, "build", "icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
icon(64).save(os.path.join(ROOT, "static", "tray", "tray.png"))
icon(64).save(os.path.join(ROOT, "static", "tray.png"))
icon(64, unread=True).save(os.path.join(ROOT, "static", "tray", "trayUnread.png"))
icon(128).save(os.path.join(ROOT, "static", "splash.webp"), "WEBP", lossless=True)
print("Icons erzeugt")
