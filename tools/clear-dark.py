#!/usr/bin/env python3
"""切り出した場面(透明のWebP)の、足もとに残った、黒っぽい汚れ(影の切りのこし)を、透明にする。

使い方:  python3 tools/clear-dark.py 入力.webp 出力.webp [守る範囲 x0,y0,x1,y1 ...]

・外側(すでに透明な所)から、つながっている「暗くて、色がうすい」ところだけを消す。
  人物や家具の中にある暗い色(髪・パソコン・ソファの裏)は、外側とつながっていなければ、消さない。
・色のついた暗い所(濃い緑の髪・茶色の脚・濃い紫のソファ)は、消さない。
・「守る範囲」(たとえば、コーヒーの湯気)も、消さない。
必要なもの: Pillow, numpy
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
keeps = [tuple(map(int, v.split(','))) for v in sys.argv[3:]]
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
res = Image.fromarray(out, 'RGBA')
alpha = res.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
res.putalpha(alpha)
res.save(dst, quality=90, method=6)
print(dst, res.size, int(T.sum() - (al == 0).sum()), 'px removed')
