"""Erzeugt alle Larpcord-Icons aus dem offiziellen Logo assets/larpcordlogo.png.

Aufruf: python scripts/generate-icons.py   (benötigt Pillow)

Ziele:
  desktop/build/icon.ico, icon.png                 App-/EXE-Icon (electron-builder)
  desktop/build/installerIcon.ico                  NSIS-Installer (wird von electron-builder automatisch gefunden)
  desktop/build/uninstallerIcon.ico                NSIS-Uninstaller
  desktop/build/installerHeaderIcon.ico            NSIS oneClick-Fortschrittsfenster
  desktop/static/icon.png                          Fenster-/Taskleisten-Icon
  desktop/static/logo.png                          Logo für eigene Fenster (Splash, Onboarding, Updater, About)
  desktop/static/splash.webp                       Standard-Bild im Ladebildschirm
  desktop/static/tray/tray.png, trayUnread.png     Tray (mit rotem Punkt bei Ungelesenem)
  core/src/plugins/larpCore/assets/logo.png        Logo im Core (Hub, Einstellungs-Eintrag, Wasserzeichen)
"""
import os

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SOURCE = os.path.join(REPO, "assets", "larpcordlogo.png")
DESKTOP = os.path.join(REPO, "desktop")
CORE_ASSETS = os.path.join(REPO, "core", "src", "plugins", "larpCore", "assets")

ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]


def load_logo():
    img = Image.open(SOURCE).convert("RGBA")
    bbox = img.getchannel("A").getbbox() or (0, 0, img.width, img.height)
    img = img.crop(bbox)
    side = max(img.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return square


LOGO = load_logo()


def render(size, padding=0.04):
    """Logo quadratisch mit kleinem Rand. Kleine Größen etwas schärfer und kontrastreicher, damit die Textur nicht zu Grau verschwimmt."""
    inner = max(1, round(size * (1 - 2 * padding)))
    img = LOGO.resize((inner, inner), Image.LANCZOS)
    if size <= 64:
        rgb = ImageEnhance.Contrast(img.convert("RGB")).enhance(1.25)
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
        rgb.putalpha(img.getchannel("A"))
        img = rgb
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = (size - inner) // 2
    out.alpha_composite(img, (offset, offset))
    return out


def with_unread_dot(img):
    size = img.width
    r = size // 5
    out = img.copy()
    ImageDraw.Draw(out).ellipse((size - 2 * r - 1, size - 2 * r - 1, size - 1, size - 1), fill=(237, 66, 69, 255))
    return out


def save_ico(path, sizes=ICO_SIZES):
    # Jede Größe einzeln rendern (bessere Schärfe als Pillows automatisches Herunterskalieren)
    frames = [render(s) for s in sizes]
    frames[-1].save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=frames[:-1])


def main():
    build = os.path.join(DESKTOP, "build")
    static = os.path.join(DESKTOP, "static")
    os.makedirs(build, exist_ok=True)
    os.makedirs(os.path.join(static, "tray"), exist_ok=True)
    os.makedirs(CORE_ASSETS, exist_ok=True)

    render(512).save(os.path.join(build, "icon.png"))
    save_ico(os.path.join(build, "icon.ico"))
    save_ico(os.path.join(build, "installerIcon.ico"))
    save_ico(os.path.join(build, "uninstallerIcon.ico"))
    save_ico(os.path.join(build, "installerHeaderIcon.ico"), [16, 24, 32, 48, 64, 128, 256])

    render(256).save(os.path.join(static, "icon.png"))
    render(256, padding=0).save(os.path.join(static, "logo.png"))
    render(256, padding=0).save(os.path.join(static, "splash.webp"), "WEBP", lossless=True)
    render(64).save(os.path.join(static, "tray", "tray.png"))
    with_unread_dot(render(64)).save(os.path.join(static, "tray", "trayUnread.png"))

    render(128, padding=0).save(os.path.join(CORE_ASSETS, "logo.png"), optimize=True)
    print("Icons aus assets/larpcordlogo.png erzeugt")


if __name__ == "__main__":
    main()
