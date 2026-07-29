"""One-off slicer for the weapon upgrade icon sheets (assets/raw/weapon_icons/).

Each sheet stacks N weapon icons vertically, each preceded by a bold white text label on
the green chroma-key background - same convention as the gladiator arena monster sheets,
so this reuses the row-based content-clustering approach from slice_gladiator_sheets.py
(divides by actual painted content per row rather than a naive height/N split, since panel
heights vary): a row is "content" if it has pixels that are neither chroma-green nor
near-white (the caption text is pure white so it's excluded automatically, just like the
divider lines would be).

Not a general tool (unlike build_sprite_meta.py) - specific to this one batch of ChatGPT
sheets. Run once, then delete/ignore.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'raw', 'weapon_icons')
DST = os.path.join(ROOT, 'assets', 'weapons')

# Per-icon manual touch-ups applied after cropping: on the 4 icons with a glowing blade/limb
# right at the top of frame (sword_6/10/11, bow_6), the glow's brightness fooled the generic
# row-content detector into treating a sliver of the caption text above as real content, so a
# fragment of the caption survived the crop. {icon_name: [(x0,y0,x1,y1), ...]} rectangles
# painted chroma-green post-crop (build_sprite_meta.py's chroma-key removes them like any
# other background pixel) — coordinates measured directly on the cropped output, well clear
# of the weapon art itself in each case.
POST_PATCHES = {
    'sword_6': [(300, 0, 690, 32)],
    'sword_10': [(300, 0, 650, 18)],
    'sword_11': [(300, 0, 700, 35)],
    'bow_6': [(300, 0, 650, 10)],
}

SHEETS = [
    ('sword_sheet1.png', ['sword_1', 'sword_2', 'sword_3', 'sword_4', 'sword_5', 'sword_6']),
    ('sword_sheet2.png', ['sword_7', 'sword_8', 'sword_9', 'sword_10', 'sword_11']),
    ('bow_sheet1.png', ['bow_1', 'bow_2', 'bow_3', 'bow_4', 'bow_5', 'bow_6']),
    ('bow_sheet2.png', ['bow_7', 'bow_8', 'bow_9', 'bow_10', 'bow_11']),
]

MARGIN = 10          # px kept around each detected content cluster
GAP_TOLERANCE = 34   # px of blank rows allowed inside one pose (disjoint glow/particles)
RUN_THRESH = 18      # min run of consecutive non-green/non-white px to count a row as content


def is_green(r, g, b):
    return g > 100 and g > r * 1.3 and g > b * 1.3


def is_whitish(r, g, b):
    return r > 175 and g > 175 and b > 175


def content_rows(img, w, h):
    px = img.load()
    rows = []
    for y in range(h):
        run = 0
        best = 0
        for x in range(w):
            r, g, b = px[x, y][:3]
            if not is_green(r, g, b) and not is_whitish(r, g, b):
                run += 1
                if run > best:
                    best = run
            else:
                run = 0
            if best >= RUN_THRESH:
                break
        rows.append(best >= RUN_THRESH)
    return rows


def is_art_pixel(r, g, b):
    if is_green(r, g, b) or (r > 190 and g > 190 and b > 190):
        return False
    if abs(r - b) < 25 and g > 150 and r > 120:
        return False
    return True


def find_art_start(img, top, bottom, w):
    px = img.load()
    run_needed = 10
    for y in range(top, bottom):
        run = 0
        for x in range(0, w, 2):
            r, g, b = px[x, y][:3]
            if is_art_pixel(r, g, b):
                run += 2
                if run >= run_needed:
                    return y
            else:
                run = 0
    return top


def row_is_pure_green(img, y, w):
    px = img.load()
    for x in range(0, w, 2):
        if not is_green(*px[x, y][:3]):
            return False
    return True


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
    clusters = [c for c in clusters if c[1] - c[0] > 20]
    return clusters


def trim_divider_lines(img):
    w, h = img.size
    px = img.load()

    def row_is_white(y):
        cnt = 0
        for x in range(0, w, 4):
            r, g, b = px[x, y][:3]
            if is_whitish(r, g, b):
                cnt += 1
        return cnt > (w / 4) * 0.85

    top = 0
    while top < h and row_is_white(top):
        top += 1
    bottom = h
    while bottom > top and row_is_white(bottom - 1):
        bottom -= 1
    if top > 0 or bottom < h:
        return img.crop((0, top, w, bottom))
    return img


def main():
    os.makedirs(DST, exist_ok=True)
    for fname, names in SHEETS:
        path = os.path.join(SRC, fname)
        img = Image.open(path).convert('RGB')
        w, h = img.size
        rows = content_rows(img, w, h)
        clusters = cluster_rows(rows)
        if len(clusters) != len(names):
            print(f'!! {fname}: expected {len(names)} icons, found {len(clusters)} clusters -> SKIPPED, needs manual review')
            print('   clusters:', clusters)
            continue
        for (top, bottom), name in zip(clusters, names):
            art_top = find_art_start(img, top, bottom, w)
            crop_top = art_top
            y = art_top - 1
            while y >= 0 and (art_top - y) <= MARGIN and row_is_pure_green(img, y, w):
                crop_top = y
                y -= 1
            content_end = bottom + 1
            crop_bottom = content_end
            y = content_end
            while y < h and (y - content_end) < MARGIN and row_is_pure_green(img, y, w):
                crop_bottom = y + 1
                y += 1
            cropped = img.crop((0, crop_top, w, crop_bottom))
            cropped = trim_divider_lines(cropped)
            if name in POST_PATCHES:
                cropped = cropped.copy()
                draw = ImageDraw.Draw(cropped)
                for rect in POST_PATCHES[name]:
                    draw.rectangle(rect, fill=(4, 187, 5))
            out_path = os.path.join(DST, name + '.png')
            cropped.save(out_path)
            print(f'{fname} -> {name} rows[{crop_top}:{crop_bottom}] size={cropped.size}')


if __name__ == '__main__':
    main()
