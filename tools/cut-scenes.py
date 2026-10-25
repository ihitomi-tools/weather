#!/usr/bin/env python3
"""1枚にまとめた場面のイラストを、背景を透明にして、場面ごとの WebP に切り出す。

使い方:
  python3 tools/cut-scenes.py 元画像.jpg 出力フォルダ [--names n1,n2,n3] [--skip 4] [--width 560]

・背景は「四隅と同じ単色」であること(グラデーションや床の線があると、きれいに抜けない)。
・場面は、上から下、左から右の順に、1から番号がつく。番号は、まず --names なしで一度実行して、
  出力フォルダの contact.png(番号つき一覧)で確かめる。
・--names: 番号順の保存名(例 n1,n2,n3)。--skip: 使わない場面の番号(例 4)。
・出てくる webp は docs/img/room/ に置き、room.js の PICS と sw.js の FILES に足す。
必要なもの: Pillow, numpy
"""
import argparse, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--names', default=''); ap.add_argument('--skip', default='')
ap.add_argument('--width', type=int, default=560)
ap.add_argument('--min-area', type=int, default=400, help='これより小さいかたまり(縮小後のマス)は、ごみとして捨てる')
args = ap.parse_args()
names = [n for n in args.names.split(',') if n]
skip = {int(v) for v in args.skip.split(',') if v}
os.makedirs(args.out, exist_ok=True)

a = np.array(Image.open(args.src).convert('RGB')).astype(np.float32)
H, W, _ = a.shape
corners = np.concatenate([a[:20, :20].reshape(-1, 3), a[-20:, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3), a[-20:, -20:].reshape(-1, 3)])
bg = np.median(corners, axis=0)
d = np.sqrt(((a - bg) ** 2).sum(2))

# 外側の背景だけを、四隅からの塗りつぶしで見つける(絵の中の暗い部分は、そのまま残す)
m = Image.fromarray(((d < 16) * 255).astype('uint8')).point(lambda v: 1 if v else 2)
for pt in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
    if m.getpixel(pt) == 1:
        ImageDraw.floodfill(m, pt, 3)
out = np.array(m) == 3

# 縁の3pxだけ、なめらかに透明にして、背景色のにじみを引く
near = np.array(Image.fromarray((out * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7))) > 0
band = near & ~out
alpha = np.ones((H, W), np.float32); alpha[out] = 0
alpha[band] = np.clip((d - 8) / 36, 0, 1)[band]
al = np.maximum(alpha, 1e-3)[..., None]
fg = np.clip((a - (1 - al) * bg) / al, 0, 255)
rgba = Image.fromarray(np.dstack([np.where(band[..., None], fg, a), alpha * 255]).astype('uint8'), 'RGBA')

# 場面ごとに分ける(縮小した透明度で、つながったかたまりを数える)
s = 8
sm = np.array(Image.fromarray(((alpha > .5) * 255).astype('uint8')).resize((W // s, H // s), Image.BILINEAR)) > 60
lab = np.zeros(sm.shape, int); boxes = []
for y in range(sm.shape[0]):
    for x in range(sm.shape[1]):
        if sm[y, x] and not lab[y, x]:
            lab[y, x] = len(boxes) + 1; st = [(y, x)]; b = [x, y, x, y]
            while st:
                cy, cx = st.pop()
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < sm.shape[0] and 0 <= nx < sm.shape[1] and sm[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = len(boxes) + 1; st.append((ny, nx))
                            b = [min(b[0], nx), min(b[1], ny), max(b[2], nx), max(b[3], ny)]
            boxes.append(b)
boxes = [b for b in boxes if (b[2] - b[0]) * (b[3] - b[1]) >= args.min_area]
boxes.sort(key=lambda b: (b[1], b[0]))

room = (42, 42, 102, 255)  # 部屋の壁の色に重ねて、縁を確かめる
tiles = []
for i, b in enumerate(boxes, 1):
    x0, y0, x1, y1 = [v * s for v in b]
    c = rgba.crop((max(0, x0 - 8), max(0, y0 - 8), min(W, x1 + 16), min(H, y1 + 16)))
    c = c.crop(c.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    r = c.resize((args.width, round(c.height * args.width / c.width)), Image.LANCZOS)
    chk = Image.new('RGBA', r.size, room); chk.alpha_composite(r)
    tiles.append((i, chk))
    if i in skip:
        print(f'{i}: 使わない'); continue
    name = names.pop(0) if names else f'scene-{i}'
    r.save(os.path.join(args.out, f'{name}.webp'), 'WEBP', quality=84, method=6)
    print(f'{i}: {name}.webp  元{c.size} → {r.size}')

# 番号つきの一覧(確認用)
th = 360
sheet = Image.new('RGB', (sum(int(t.width * th / t.height) + 12 for _, t in tiles) + 12, th + 36), room[:3])
dr = ImageDraw.Draw(sheet); x = 12
for i, t in tiles:
    t = t.resize((int(t.width * th / t.height), th)); sheet.paste(t.convert('RGB'), (x, 30)); dr.text((x, 8), str(i), fill=(255, 255, 255)); x += t.width + 12
sheet.save(os.path.join(args.out, 'contact.png'))
