#!/usr/bin/env python3
"""切り出した場面(透明のWebP)の、足もとに残った、黒っぽい汚れ(影の切りのこし)を、透明にする。

使い方:  python3 tools/clear-dark.py 入力.webp 出力.webp [--keep x0,y0,x1,y1] [--steam x0,y0,x1,y1] [--hole x0,y0,x1,y1]

・外側(すでに透明な所)から、つながっている「暗くて、色がうすい」ところだけを消す。
  人物や家具の中にある暗い色(髪・パソコン・ソファの裏)は、外側とつながっていなければ、消さない。
・色のついた暗い所(濃い緑の髪・茶色の脚・濃い紫のソファ)は、消さない。
・外側とつながらず、中に残った黒っぽい細い線は、まわりの色でぬりつぶす。
・--keep: この範囲は、さわらない。
・--steam: この範囲は、湯気。うすい灰色の、半透明にする(黒い湯気を、白っぽくする)。
・--hole: この範囲の、黒っぽい所は、透明にする(足の間のすき間など)。
必要なもの: Pillow, numpy
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
def boxes(flag):
    out, args = [], sys.argv[3:]
    for i, v in enumerate(args):
        if v == flag:
            out.append(tuple(map(int, args[i + 1].split(','))))
    return out
keeps, steams, holes = boxes('--keep'), boxes('--steam'), boxes('--hole')
im = Image.open(src).convert('RGBA')
a = np.array(im).astype(np.int16)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
mx = np.maximum(np.maximum(r, g), b)
mn = np.minimum(np.minimum(r, g), b)
dark = (al > 0) & (mx < 85) & ((mx - mn) < 38) & ~(g > r + 12) & ~(r > b + 8)  # 暗くて、色がうすい(黒・こい灰色・こい紺)。緑がかった所(髪)・茶色(脚)は除く
for x0, y0, x1, y1 in keeps:
    dark[y0:y1, x0:x1] = False
T = al == 0
for _ in range(400):
    d = T.copy()
    d[1:, :] |= T[:-1, :]; d[:-1, :] |= T[1:, :]; d[:, 1:] |= T[:, :-1]; d[:, :-1] |= T[:, 1:]
    new = d & dark & ~T
    if not new.any():
        break
    T |= new
out = np.array(im)
out[..., 3] = np.where(T, 0, out[..., 3])
# 中に残った黒っぽい所を、まわりの(黒くない)色で、外側から順にぬる
rgb = out[..., :3].astype(float)
ok = (out[..., 3] > 200) & ~dark
todo = dark & ~T & ~(np.zeros_like(dark))
for x0, y0, x1, y1 in holes:
    box = np.zeros_like(dark); box[y0:y1, x0:x1] = True
    out[..., 3] = np.where(box & todo, 0, out[..., 3]); todo &= ~box
for x0, y0, x1, y1 in steams:
    box = np.zeros_like(dark); box[y0:y1, x0:x1] = True
    todo &= ~box
    m = box & (out[..., 3] > 0) & ((mx - mn) < 45) & (mx < 200)  # 範囲の中の、灰色っぽい所だけ(顔や服は、さわらない)
    out[..., :3][m] = (232, 232, 242)
    out[..., 3][m] = (out[..., 3][m] * 0.85).astype(np.uint8)
for _ in range(12):
    if not todo.any():
        break
    pad = np.pad(ok, 1); prgb = np.pad(rgb, ((1, 1), (1, 1), (0, 0)))
    cnt = np.zeros(ok.shape); acc = np.zeros(rgb.shape)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            sl = (slice(1 + dy, 1 + dy + ok.shape[0]), slice(1 + dx, 1 + dx + ok.shape[1]))
            m = pad[sl]
            cnt += m; acc += prgb[sl] * m[..., None]
    fill = todo & (cnt > 0)
    if not fill.any():
        break
    rgb[fill] = acc[fill] / cnt[fill][..., None]
    ok |= fill; todo &= ~fill
out[..., :3] = np.where((dark & ~T & ok & (out[..., 3] > 0))[..., None], rgb.astype(np.uint8), out[..., :3])
res = Image.fromarray(out, 'RGBA')
alpha = res.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
res.putalpha(alpha)
res.save(dst, quality=90, method=6)
print(dst, res.size)
