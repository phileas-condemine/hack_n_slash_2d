"""One-off slicer for assets/raw/hero_dodge_teleport_sheet.png - new hero poses requested by the
player (2026-07-29 skill tree redesign, voie du Vent): 'Esquive' (dodge roll, passive proc) and
'Téléport' (spell cast pose). Both are flat single-pose hero art like the existing assets/hero/*
poses (idle/dash/jump/spell casts), not a per-state enemy triplet.

Same row-clustering approach as slice_cannoneer_sheet.py etc.: clean 2-pose vertical stack, no
caption text. Run once, then delete/ignore.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'raw', 'hero_dodge_teleport_sheet.png')
OUT = [
    (os.path.join(ROOT, 'assets', 'hero', 'dodge.png'), 'dodge'),
    (os.path.join(ROOT, 'assets', 'hero', 'spells', 'teleport_cast.png'), 'teleport_cast'),
]

MARGIN = 12
GAP_TOLERANCE = 2
RUN_THRESH = 6


def is_green(r, g, b):
    return g > 100 and g > r * 1.3 and g > b * 1.3


def content_rows(img, w, h):
    px = img.load()
    rows = []
    for y in range(h):
        run = 0
        best = 0
        for x in range(w):
            r, g, b = px[x, y][:3]
            if not is_green(r, g, b):
                run += 1
                if run > best:
                    best = run
            else:
                run = 0
            if best >= RUN_THRESH:
                break
        rows.append(best >= RUN_THRESH)
    return rows


def cluster_rows(rows):
    h = len(rows)
    clusters = []
    y = 0
    while y < h:
        if rows[y]:
            start = y
            end = y
            gap = 0
            yy = y + 1
            while yy < h:
                if rows[yy]:
                    end = yy
                    gap = 0
                else:
                    gap += 1
                    if gap > GAP_TOLERANCE:
                        break
                yy += 1
            clusters.append([start, end])
            y = yy
        else:
            y += 1
    return [c for c in clusters if c[1] - c[0] > 20]


def row_is_pure_green(img, y, w):
    px = img.load()
    for x in range(0, w, 2):
        if not is_green(*px[x, y][:3]):
            return False
    return True


def main():
    img = Image.open(SRC).convert('RGB')
    w, h = img.size
    rows = content_rows(img, w, h)
    clusters = cluster_rows(rows)
    if len(clusters) != len(OUT):
        print(f'!! expected {len(OUT)} poses, found {len(clusters)} clusters -> ABORT')
        print('   clusters:', clusters)
        return
    for (top, bottom), (out_path, name) in zip(clusters, OUT):
        crop_top = top
        y = top - 1
        while y >= 0 and (top - y) <= MARGIN and row_is_pure_green(img, y, w):
            crop_top = y
            y -= 1
        crop_bottom = bottom + 1
        y = crop_bottom
        while y < h and (y - bottom) < MARGIN and row_is_pure_green(img, y, w):
            crop_bottom = y + 1
            y += 1
        cropped = img.crop((0, crop_top, w, crop_bottom))
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        cropped.save(out_path)
        print(f'-> {name} rows[{crop_top}:{crop_bottom}] size={cropped.size} -> {out_path}')


if __name__ == '__main__':
    main()
