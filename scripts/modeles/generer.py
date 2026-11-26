"""Modèles 3D des articles de la boutique (STL) et leurs rendus (WebP).

Lancer depuis la racine du projet :  python scripts/modeles/generer.py
- STL  → public/modeles/<slug>.stl   (bibliothèque 3D du gestionnaire)
- WebP → public/rendus/<slug>-1.webp, -2.webp (photos provisoires des articles)
"""

import math
import os
import struct

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
STL_DIR = os.path.join(ROOT, "public", "modeles")
IMG_DIR = os.path.join(ROOT, "public", "rendus")

# ── Briques de base (triangles en mm, axe Z vers le haut) ─────────────────────


class Mesh:
    def __init__(self):
        self.tris = []

    def tri(self, a, b, c):
        self.tris.append((a, b, c))

    def quad(self, a, b, c, d):
        self.tri(a, b, c)
        self.tri(a, c, d)

    def add(self, other):
        self.tris += other.tris
        return self

    def array(self):
        return np.array(self.tris, dtype=float)


def box(x0, y0, z0, x1, y1, z1):
    m = Mesh()
    p = lambda x, y, z: (x, y, z)
    m.quad(p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), p(x1, y0, z0))
    m.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1))
    m.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1))
    m.quad(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1))
    m.quad(p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1))
    m.quad(p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1))
    return m


def revolve(profile, n=96, cx=0.0, cy=0.0):
    """Solide de révolution autour de Z : profile = [(rayon, z), ...] du bas vers le haut."""
    m = Mesh()
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
            P = lambda r, a, z: (cx + r * math.cos(a), cy + r * math.sin(a), z)
            if r0 == 0 and r1 == 0:
                continue
            m.quad(P(r0, a0, z0), P(r0, a1, z0), P(r1, a1, z1), P(r1, a0, z1))
        # Fermetures haut et bas
        rb, zb = profile[0]
        rt, zt = profile[-1]
        if rb > 0:
            m.tri((cx, cy, zb), (cx + rb * math.cos(a1), cy + rb * math.sin(a1), zb), (cx + rb * math.cos(a0), cy + rb * math.sin(a0), zb))
        if rt > 0:
            m.tri((cx, cy, zt), (cx + rt * math.cos(a0), cy + rt * math.sin(a0), zt), (cx + rt * math.cos(a1), cy + rt * math.sin(a1), zt))
    return m


def cyl(r, z0, z1, cx=0.0, cy=0.0, n=96):
    return revolve([(r, z0), (r, z1)], n, cx, cy)


def ring(outer, inner, z0, z1):
    """Pièce plate entre deux contours fermés de même nombre de points (vus de dessus)."""
    m = Mesh()
    k = len(outer)
    for i in range(k):
        j = (i + 1) % k
        o0, o1, i0, i1 = outer[i], outer[j], inner[i], inner[j]
        m.quad((*o0, z1), (*i0, z1), (*i1, z1), (*o1, z1))  # dessus
        m.quad((*o0, z0), (*o1, z0), (*i1, z0), (*i0, z0))  # dessous
        m.quad((*o0, z0), (*o0, z1), (*o1, z1), (*o1, z0))  # extérieur
        m.quad((*i0, z0), (*i1, z0), (*i1, z1), (*i0, z1))  # intérieur
    return m


def arc_band(cx, cz, r_in, r_out, a0, a1, y0, y1, n=48):
    """Bande courbe dans le plan XZ (crochet, anneau ouvert), épaisseur selon Y."""
    m = Mesh()
    angles = [a0 + (a1 - a0) * i / n for i in range(n + 1)]
    pt = lambda r, a: (cx + r * math.cos(a), cz + r * math.sin(a))
    for a, b in zip(angles, angles[1:]):
        oa, ob, ia, ib = pt(r_out, a), pt(r_out, b), pt(r_in, a), pt(r_in, b)
        m.quad((oa[0], y0, oa[1]), (ob[0], y0, ob[1]), (ob[0], y1, ob[1]), (oa[0], y1, oa[1]))
        m.quad((ia[0], y0, ia[1]), (ia[0], y1, ia[1]), (ib[0], y1, ib[1]), (ib[0], y0, ib[1]))
        m.quad((oa[0], y1, oa[1]), (ob[0], y1, ob[1]), (ib[0], y1, ib[1]), (ia[0], y1, ia[1]))
        m.quad((oa[0], y0, oa[1]), (ia[0], y0, ia[1]), (ib[0], y0, ib[1]), (ob[0], y0, ob[1]))
    for a in (a0, a1):
        o, i = pt(r_out, a), pt(r_in, a)
        m.quad((o[0], y0, o[1]), (o[0], y1, o[1]), (i[0], y1, i[1]), (i[0], y0, i[1]))
    return m


# ── Les articles ──────────────────────────────────────────────────────────────


def clips():
    m = Mesh()
    for cx in (-14, 14):
        m.add(revolve([(0, 0), (10, 0), (10, 1.2), (8.5, 2.4), (0, 2.4)], cx=cx))  # tête
        m.add(cyl(3.2, -16, 0, cx=cx))  # tige
        for z in (-6, -11):
            m.add(revolve([(3.2, z - 3), (6.2, z), (3.2, z + 0.4)], cx=cx))  # ailettes
    return m


def support_telephone():
    m = Mesh()
    m.add(box(-36, 0, 0, 36, 5, 44))  # dos
    m.add(box(-36, 0, 0, 36, 20, 5))  # appui bas
    m.add(box(-36, 17, 0, 36, 20, 12))  # rebord
    for x in (-36, 31):
        m.add(box(x, 0, 0, x + 5, 20, 26))  # joues
    m.add(box(-12, -22, 18, -6, 0, 21))  # pinces de grille
    m.add(box(6, -22, 18, 12, 0, 21))
    m.add(box(-12, -22, 14, -6, -19, 21))
    m.add(box(6, -22, 14, 12, -19, 21))
    return m


def cache_crochet():
    return revolve([(0, 0), (15, 0), (15.5, 6), (14.5, 10), (12, 14), (8, 16.5), (0, 17.5)]).add(box(-4, 13, 0, 4, 22, 2.5))


def bouton():
    m = revolve([(0, 0), (13, 0), (13, 11), (12, 13.5), (0, 13.5)])
    for i in range(24):
        a = 2 * math.pi * i / 24
        cx, cy = 13 * math.cos(a), 13 * math.sin(a)
        m.add(revolve([(0.9, 1), (0.9, 10.5)], n=12, cx=cx, cy=cy))
    m.add(box(-1, 4, 13.5, 1, 11, 14.4))  # repère
    return m


def organiseur():
    m = Mesh()
    L, W, H, t = 120, 80, 38, 2.2
    m.add(box(0, 0, 0, L, W, t))
    m.add(box(0, 0, 0, L, t, H))
    m.add(box(0, W - t, 0, L, W, H))
    m.add(box(0, 0, 0, t, W, H))
    m.add(box(L - t, 0, 0, L, W, H))
    m.add(box(0, W / 2 - t / 2, 0, L, W / 2 + t / 2, H * 0.8))
    m.add(box(L / 3 - t / 2, 0, 0, L / 3 + t / 2, W, H * 0.8))
    m.add(box(2 * L / 3 - t / 2, W / 2, 0, 2 * L / 3 + t / 2, W, H * 0.8))
    return m


def crochets():
    """Deux crochets en J : platine murale (vis cachées), bras courbe et bout relevé."""
    m = Mesh()
    for x in (-18, 18):
        m.add(box(x - 10, 0, 0, x + 10, 5, 62))  # platine murale
        band = arc_band(0, 20, 12, 18, math.pi, 2 * math.pi, x - 7, x + 7)
        # Bande dessinée dans le plan XZ, tournée pour partir du mur (axe Y).
        for a, b, c in band.tris:
            rot = lambda p: (p[1], p[0] + 18, p[2])
            m.tri(rot(a), rot(b), rot(c))
        m.add(box(x - 7, 30, 20, x + 7, 36, 32))  # bout relevé
    return m


def support_casque():
    m = Mesh()
    m.add(revolve([(0, 0), (55, 0), (55, 6), (50, 10), (0, 10)]))  # socle
    m.add(box(-11, -11, 10, 11, 11, 200))  # mât
    m.add(arc_band(0, 150, 56, 64, math.radians(20), math.radians(160), -22, 22))  # repose-arceau
    return m


def passe_cables():
    m = box(-48, 0, 0, 48, 20, 3)
    for x in (-30, 0, 30):
        band = arc_band(0, 0, 6, 9, math.radians(-55), math.radians(235), 3, 17)
        for a, b, c in band.tris:
            # anneau dans le plan YZ, posé sur la bande
            rot = lambda p: (x + p[1] - 10, 10 + p[0], p[2] + 12)
            m.tri(rot(a), rot(b), rot(c))
        m.add(box(x - 7, 3, 0, x + 7, 17, 4))
    return m


def piece_rechange():
    teeth, ro, ri, rh = 18, 26, 22, 6
    k = teeth * 4
    outer, inner = [], []
    for i in range(k):
        a = 2 * math.pi * i / k
        r = ro if (i % 4) in (1, 2) else ri
        outer.append((r * math.cos(a), r * math.sin(a)))
        inner.append((rh * math.cos(a), rh * math.sin(a)))
    m = ring(outer, inner, 0, 8)
    hub_o = [(11 * math.cos(2 * math.pi * i / 64), 11 * math.sin(2 * math.pi * i / 64)) for i in range(64)]
    hub_i = [(rh * math.cos(2 * math.pi * i / 64), rh * math.sin(2 * math.pi * i / 64)) for i in range(64)]
    m.add(ring(hub_o, hub_i, 8, 15))
    return m


# ── Rendu (z-buffer, éclairage doux, ombre au sol) ────────────────────────────

COLORS = {"Noir": (48, 48, 52), "Blanc": (236, 236, 230), "Gris": (140, 140, 136), "Vert": (40, 160, 80), "Bleu": (45, 100, 220)}


def render(tris, color, azimuth=-35, elevation=28, size=1100, ss=2):
    S = size * ss
    pts = tris.reshape(-1, 3)
    center = (pts.min(0) + pts.max(0)) / 2
    center[2] = pts[:, 2].min() + (pts[:, 2].max() - pts[:, 2].min()) * 0.45
    az, el = math.radians(azimuth), math.radians(elevation)
    # Repère caméra : vue de trois quarts, légèrement plongeante.
    fwd = np.array([math.cos(el) * math.sin(az), math.cos(el) * math.cos(az), -math.sin(el)])
    right = np.cross(fwd, [0, 0, 1])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    rel = tris - center
    cam = np.stack([rel @ right, rel @ up, rel @ fwd], axis=-1)
    extent = np.abs(cam[..., :2]).max()
    scale = S * 0.36 / extent
    sx = S / 2 + cam[..., 0] * scale
    sy = S / 2 - cam[..., 1] * scale
    depth = cam[..., 2]

    # Normales et lumière (une principale, une de remplissage, un peu d'ambiance).
    n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    key = np.array([-0.45, -0.55, 0.7]); key /= np.linalg.norm(key)
    fill = np.array([0.6, 0.3, 0.35]); fill /= np.linalg.norm(fill)
    view = -fwd
    nn = np.where((n @ view)[:, None] < 0, -n, n)  # faces vues de dos : on retourne
    diff = np.clip(nn @ key, 0, 1) * 0.75 + np.clip(nn @ fill, 0, 1) * 0.25 + 0.28
    half = key + view; half /= np.linalg.norm(half)
    spec = np.clip(nn @ half, 0, 1) ** 40 * 0.35
    base = np.array(color, float) / 255
    shade = np.clip(base[None] * diff[:, None] + spec[:, None], 0, 1)

    zbuf = np.full((S, S), np.inf)
    img = np.zeros((S, S, 3))
    mask = np.zeros((S, S), bool)
    for t in range(len(tris)):
        x, y, z = sx[t], sy[t], depth[t]
        x0, x1 = int(max(0, math.floor(x.min()))), int(min(S - 1, math.ceil(x.max())))
        y0, y1 = int(max(0, math.floor(y.min()))), int(min(S - 1, math.ceil(y.max())))
        if x0 > x1 or y0 > y1:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
        if abs(d) < 1e-9:
            continue
        w0 = ((y[1] - y[2]) * (gx - x[2]) + (x[2] - x[1]) * (gy - y[2])) / d
        w1 = ((y[2] - y[0]) * (gx - x[2]) + (x[0] - x[2]) * (gy - y[2])) / d
        w2 = 1 - w0 - w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not inside.any():
            continue
        zz = w0 * z[0] + w1 * z[1] + w2 * z[2]
        sub = zbuf[y0 : y1 + 1, x0 : x1 + 1]
        upd = inside & (zz < sub)
        sub[upd] = zz[upd]
        img[y0 : y1 + 1, x0 : x1 + 1][upd] = shade[t]
        mask[y0 : y1 + 1, x0 : x1 + 1][upd] = True

    # Fond clair en dégradé + ombre douce sous la pièce.
    yy, xx = np.mgrid[0:S, 0:S] / S
    bg = np.stack([0.965 - 0.05 * yy] * 3, axis=-1) * np.array([1.0, 1.0, 0.985])
    ground = pts[:, 2].min()
    sh = tris.reshape(-1, 3).copy()
    sh[:, 2] = ground
    relg = sh - center
    gx_ = S / 2 + (relg @ right) * scale
    gy_ = S / 2 - (relg @ up) * scale
    shadow = Image.new("L", (S, S), 0)
    from PIL import ImageDraw

    dr = ImageDraw.Draw(shadow)
    tg = np.stack([gx_, gy_], -1).reshape(-1, 3, 2)
    for tri in tg:
        dr.polygon([tuple(p) for p in tri], fill=110)
    shadow = np.array(shadow.filter(ImageFilter.GaussianBlur(S / 60)), float) / 255
    bg = bg * (1 - shadow[..., None] * 0.45)
    out = np.where(mask[..., None], img, bg)
    im = Image.fromarray((out * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)
    return im


def write_stl(path, tris):
    with open(path, "wb") as f:
        f.write(b"Yris Studio".ljust(80, b" "))
        f.write(struct.pack("<I", len(tris)))
        for t in tris:
            n = np.cross(t[1] - t[0], t[2] - t[0])
            n = n / (np.linalg.norm(n) + 1e-12)
            f.write(struct.pack("<3f", *n))
            for v in t:
                f.write(struct.pack("<3f", *v))
            f.write(b"\0\0")


ITEMS = [
    ("clips-garnissage", clips, [("Noir", -35, 25), ("Gris", 40, 35)]),
    ("support-telephone-grille", support_telephone, [("Noir", -30, 22), ("Blanc", 145, 20)]),
    ("cache-crochet-remorquage", cache_crochet, [("Noir", -35, 30), ("Gris", 30, 55)]),
    ("bouton-tableau-de-bord", bouton, [("Noir", -35, 35), ("Gris", 20, 60)]),
    ("organiseur-tiroir", organiseur, [("Blanc", -35, 38), ("Vert", 30, 45)]),
    ("crochets-muraux", crochets, [("Blanc", -62, 16), ("Noir", 58, 22)]),
    ("support-casque", support_casque, [("Noir", -35, 15), ("Blanc", 30, 20)]),
    ("passe-cables", passe_cables, [("Noir", -35, 35), ("Blanc", 30, 40)]),
    ("pieces-detachees", piece_rechange, [("Gris", -30, 45), ("Bleu", 20, 70)]),
]

if __name__ == "__main__":
    os.makedirs(STL_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)
    for slug, build, views in ITEMS:
        tris = build().array()
        write_stl(os.path.join(STL_DIR, f"{slug}.stl"), tris)
        for i, (color, az, el) in enumerate(views, 1):
            render(tris, COLORS[color], az, el).save(os.path.join(IMG_DIR, f"{slug}-{i}.webp"), quality=88)
        lo, hi = tris.reshape(-1, 3).min(0), tris.reshape(-1, 3).max(0)
        print(slug, len(tris), "triangles", np.round(hi - lo, 1), "mm")
