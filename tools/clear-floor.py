#!/usr/bin/env python3
"""切り出した場面(透明のWebP)の、足もとに残った、うすい紫の床(影)を、透明にする。

使い方:  python3 tools/clear-floor.py 入力.webp 出力.webp

・外側(すでに透明な所)から、つながっている「うすい青むらさきの、明るい色」だけを消す。
  人物や家具の中にある同じような色(パズルのピース、お皿など)は、外側とつながっていなければ、消さない。
・床を消したあと、ふちを1マスだけ、なめらかにする。
必要なもの: Pillow, numpy
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
a = np.array(im).astype(np.int16)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
mx = np.maximum(np.maximum(r, g), b)
mn = np.minimum(np.minimum(r, g), b)
pale = (al > 0) & (mn > 185) & (b - r >= 5) & ((mx - mn) < 45)  # 明るくて、少し青むらさき寄りで、色があまり濃くない
pale |= (al > 0) & (mn > 232) & ((mx - mn) < 14)  # ほとんど白(床の、白っぽい影)。外側とつながっているものだけ消える
T = al == 0
for _ in range(400):
    d = T.copy()
    d[1:, :] |= T[:-1, :]; d[:-1, :] |= T[1:, :]; d[:, 1:] |= T[:, :-1]; d[:, :-1] |= T[:, 1:]
    new = d & pale & ~T
    if not new.any():
        break
    T |= new
out = np.array(im)
out[..., 3] = np.where(T, 0, out[..., 3])
res = Image.fromarray(out, 'RGBA')
alpha = res.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
res.putalpha(alpha)
res.save(dst, quality=90, method=6)
print(dst, res.size)
