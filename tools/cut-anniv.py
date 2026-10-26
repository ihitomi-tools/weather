#!/usr/bin/env python3
"""記念日のステッカー(横長の絵)を、日記のページの紙にとけこむ、透明のWebPにする。

使いかた:  python3 tools/cut-anniv.py 元の絵.jpg 2026-10-26
  → docs/img/anniv/2026-10-26.webp ができる。docs/js/anniv.js と docs/sw.js にも、書き足すこと。

背景は、ほぼ白の一色(紙より暗いぶんだけを、不透明にする)。左右・上下のふちは、ふんわり消す。
"""
import sys
import numpy as np
from PIL import Image

src, day = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.array(im).astype(float)
h, w, _ = a.shape
edge = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
B = np.percentile(edge, 85, axis=0)  # 紙の白(ふちの、明るいほうの色)
ratio = np.clip(a / B, 0, 1)
al = np.clip(1 - ratio.min(2), 0, 1)
al = np.clip((al - 0.03) / 0.97, 0, 1)
ink = np.where(al[..., None] > 0.02, (a - B * (1 - al[..., None])) / np.maximum(al[..., None], 0.02), a)
ink = np.clip(ink, 0, 255)
fx = np.minimum(np.arange(w), np.arange(w)[::-1]) / (w * 0.04)
fy = np.minimum(np.arange(h), np.arange(h)[::-1]) / (h * 0.10)
m = np.clip(np.minimum(fx[None, :], fy[:, None]), 0, 1)
m = m * m * (3 - 2 * m)
out = Image.fromarray(np.dstack([ink, al * m * 255]).astype('uint8'), 'RGBA')
width = min(w, 900)
out = out.resize((width, round(width * h / w)), Image.LANCZOS)
dest = f'docs/img/anniv/{day}.webp'
out.save(dest, quality=88, method=6)
print(dest, out.size)
