"""공유 썸네일(OG 1200x630): 눈 덮인 산(기존 홈페이지 sec3bg) 배경 + 흰 반투명 막 + 뽀드득 로고 가운데"""
import sys
from PIL import Image, ImageFilter
base = sys.argv[1]  # 8. 뽀드득 폴더
W, H = 1200, 630
bg = Image.open(base + '/홈페이지이관관련/ppoddeudeuk_백업본/images/main/sec3bg.jpg').convert('RGB')
s = max(W / bg.width, H / bg.height); bg = bg.resize((round(bg.width * s), round(bg.height * s)), Image.LANCZOS)
x = (bg.width - W) // 2; y = int((bg.height - H) * 0.55); bg = bg.crop((x, y, x + W, y + H))
og = bg.convert('RGBA')
veil = Image.new('RGBA', (W, H), (255, 255, 255, int(255 * float(sys.argv[3]))))  # 불투명도
og.alpha_composite(veil)
logo = Image.open(base + '/motion/out/logo-1600.png').convert('RGBA')
logo.thumbnail((int(W * 0.62), int(H * 0.5)), Image.LANCZOS)
sh = Image.new('RGBA', logo.size, (0, 0, 0, 0)); sh.putalpha(logo.getchannel('A').point(lambda a: int(a * 0.18)))
sh = sh.filter(ImageFilter.GaussianBlur(10))
px, py = (W - logo.width) // 2, (H - logo.height) // 2
og.alpha_composite(sh, (px, py + 8)); og.alpha_composite(logo, (px, py))
og.convert('RGB').save(sys.argv[2], quality=90, optimize=True, progressive=True)
print('og', og.size, logo.size)
