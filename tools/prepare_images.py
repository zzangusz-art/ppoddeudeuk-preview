"""사이트 이미지 준비 — 기존 홈페이지 백업본 사진 + 히어로 영상 장면 + 로고 → assets/img/ (WebP)

python -I tools/prepare_images.py   (ppoddeudeuk-site 폴더에서)

원본
- ../홈페이지이관관련/ppoddeudeuk_백업본/images/sub/*.png   매장 내부·콘도 객실 사진(기존 사이트 그대로)
- ../홈페이지이관관련/ppoddeudeuk_백업본/uploaded/...        갤러리(어반그레이 의류·뵐클 스키·중고 HEAD 스키)·기존 메인 배너
- ../KakaoTalk_20261103_181423479.mp4                       장면 정지 화면(페이지 머리 배경)
- ../motion/out/logo-*.png                                  로고(로고.jpg 에서 배경 제거, motion/tools/make_logo.py)
제외: 제작사 견본 이미지(사무실·새싹·홈페이지 OPEN), 강사 '테스트' 사진
"""
import subprocess, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BK = ROOT.parent / '홈페이지이관관련' / 'ppoddeudeuk_백업본'
VIDEO = ROOT.parent / 'KakaoTalk_20261103_181423479.mp4'
LOGO = ROOT.parent / 'motion' / 'out'
IMG = ROOT / 'assets' / 'img'
FF = shutil.which('ffmpeg') or 'ffmpeg'

def save(im, rel, max_side=1600, q=80, sm=None):
    out = IMG / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    im = im.convert('RGB')
    if max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.LANCZOS)
    im.save(out, 'WEBP', quality=q, method=6)
    if sm:
        s = im.copy(); s.thumbnail((sm, sm), Image.LANCZOS)
        s.save(out.with_name(out.stem + '-sm.webp'), 'WEBP', quality=q, method=6)
    return out

# 1) 매장 내부(소개 페이지 6장, 원본 460×345)
for i in range(1, 7):
    save(Image.open(BK / f'images/sub/interior0{i}.png'), f'store/interior-{i}.webp', q=86)

# 2) 콘도 객실(기존 숙박 안내 그대로)
rooms = {'tower': ('tower-condo0{}.png', 7), 'villa28': ('villa28-{}.png', 9), 'villa41': ('villa41-{}.png', 9),
         'villa48': ('villa48-{}.png', 5), 'greenpia25': ('greenpia25-{}.png', 5), 'greenpia38': ('greenpia38-{}.png', 5)}
for key, (pat, n) in rooms.items():
    for i in range(1, n + 1):
        save(Image.open(BK / 'images/sub' / pat.format(i)), f'stay/{key}-{i}.webp', max_side=1200, q=78, sm=560)

# 3) 갤러리(기존 게시판 실사진)
save(Image.open(BK / 'uploaded/board/gallery/aac0c05ae83b1e43c8623c9d28a7811d0.jpg'), 'gallery/wear-urbangray.webp', max_side=1400, sm=560)
save(Image.open(BK / 'uploaded/board/gallery/0d66130b6ff6a0187d2b25fbff356ee00.jpg'), 'gallery/gear-volkl.webp', max_side=1400, sm=560)
save(Image.open(BK / 'uploaded/board/gallery/fe54afd2a955eaee3c52aceedb28255f0.jpg'), 'gallery/used-head.webp', max_side=1400, sm=560)
save(Image.open(BK / 'uploaded/main_visual/d2874536c4be523853b2395b5d91917f.jpg'), 'banner/skiers.webp', max_side=1920, q=78)

# 4) 영상 장면 정지 화면(흰 띠 잘라냄) — 페이지 머리 배경·OG
STILLS = {'lineup': 1.0, 'carve': 12.0, 'spray': 20.0, 'crew': 38.0, 'group': 60.0, 'duo': 70.0}
tmp = ROOT / 'tools' / '_stills'; tmp.mkdir(exist_ok=True)
for name, t in STILLS.items():
    png = tmp / f'{name}.png'
    subprocess.run([FF, '-v', 'error', '-y', '-ss', str(t), '-i', str(VIDEO), '-frames:v', '1', '-vf', 'crop=1920:876:0:102', str(png)], check=True)
    save(Image.open(png), f'scene/{name}.webp', max_side=1920, q=76, sm=760)

# 5) 로고·파비콘
logo = Image.open(LOGO / 'logo-1600.png')
l = logo.copy(); l.thumbnail((480, 480), Image.LANCZOS); (IMG / 'brand').mkdir(parents=True, exist_ok=True)
l.save(IMG / 'brand/logo.png', optimize=True)                       # 헤더·푸터(투명 PNG)
l.save(IMG / 'brand/logo.webp', 'WEBP', quality=90, method=6, lossless=False)
big = logo.copy(); big.thumbnail((1200, 1200), Image.LANCZOS); big.save(IMG / 'brand/logo-1200.png', optimize=True)  # JSON-LD logo
foot = Image.open(LOGO / 'logo-foot-512.png')
ico = Image.new('RGBA', foot.size, (0, 0, 0, 0)); ico.paste(foot, (0, 0), foot)
ico.save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
ap = Image.new('RGB', (180, 180), 'white'); f2 = foot.resize((150, 150), Image.LANCZOS); ap.paste(f2, (15, 15), f2); ap.save(IMG / 'brand/apple-touch-icon.png')
f3 = foot.resize((512, 512), Image.LANCZOS); f3.save(IMG / 'brand/icon-512.png')

# 6) OG 이미지(1200×630): 영상 장면 + 아래 흰 띠 위 로고
bg = Image.open(tmp / 'carve.png').convert('RGB')
W, H = 1200, 630
r = max(W / bg.width, H / bg.height); bg = bg.resize((int(bg.width * r), int(bg.height * r)), Image.LANCZOS)
x = (bg.width - W) // 2; bg = bg.crop((x, 0, x + W, H))
band = Image.new('RGBA', (W, 170), (255, 255, 255, 236))
og = bg.convert('RGBA'); og.alpha_composite(band, (0, H - 170))
lg = logo.copy(); lg.thumbnail((520, 130), Image.LANCZOS)
og.alpha_composite(lg, ((W - lg.width) // 2, H - 170 + (170 - lg.height) // 2))
og.convert('RGB').save(IMG / 'og.jpg', quality=86)
shutil.rmtree(tmp)

total = sum(p.stat().st_size for p in IMG.rglob('*') if p.is_file())
print('images', len([p for p in IMG.rglob('*') if p.is_file()]), f'{total / 1e6:.1f}MB')
