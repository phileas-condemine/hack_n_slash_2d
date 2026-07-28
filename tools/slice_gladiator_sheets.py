"""One-off slicer for the gladiator-arena monster sheets (assets/raw/gladiator_arena_monsters/).

Each sheet stacks N poses vertically, each pose preceded by a bold white text label on the
green background. Panels are NOT reliably equal height and some sheets have no divider line
at all, so instead of dividing by height/N this finds each pose's actual content bounding box:
a row is "content" if it has pixels that are neither chroma-green nor near-white (label text
and any divider lines are pure green+white, so they're excluded automatically). Contiguous
content rows (small gaps bridged) form one pose cluster each, top to bottom.

Not a general tool (unlike build_sprite_meta.py) - specific to this one batch of ChatGPT
sheets. Run once, then delete/ignore.
"""
import os
from PIL import Image, ImageDraw

# Per-pose manual touch-ups applied after cropping, for the rare case row/column-based
# detection can't separate two things that share the same rows AND columns aren't
# distinctive enough either: manticore's "POUNCE - ATTACK" label sits directly above its
# own wingtip with ~0px gap, so no crop line can exclude the text without also cutting the
# wing. {pose_name: [(x0, y0, x1, y1), ...]} rectangles painted chroma-green post-crop
# (build_sprite_meta.py's chroma-key removes them like any other background pixel).
POST_PATCHES = {
    'manticore_atk2_attack': [(300, 0, 700, 26)],
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'raw', 'gladiator_arena_monsters')
DST = os.path.join(ROOT, 'assets', 'enemies', 'states')

SHEETS = [
    ('retiaire_spectral_sheet1.png', ['retiaire_spectral_neutral', 'retiaire_spectral_atk1_windup', 'retiaire_spectral_atk1_attack']),
    ('retiaire_spectral_sheet2.png', ['retiaire_spectral_atk2_windup', 'retiaire_spectral_atk2_attack', 'retiaire_spectral_atk3_windup', 'retiaire_spectral_atk3_attack']),
    ('manticore_sheet1.png', ['manticore_neutral', 'manticore_atk1_windup', 'manticore_atk1_attack']),
    ('manticore_sheet2.png', ['manticore_atk2_windup', 'manticore_atk2_attack', 'manticore_atk3_windup', 'manticore_atk3_attack']),
    ('gorgone_sheet1.png', ['gorgone_neutral', 'gorgone_atk1_windup', 'gorgone_atk1_attack']),
    ('gorgone_sheet2.png', ['gorgone_atk2_windup', 'gorgone_atk2_attack', 'gorgone_atk3_windup', 'gorgone_atk3_attack']),
    ('molosse_sheet1.png', ['molosse_neutral', 'molosse_atk1_windup', 'molosse_atk1_attack']),
    ('molosse_sheet2.png', ['molosse_atk2_windup', 'molosse_atk2_attack', 'molosse_atk3_windup', 'molosse_atk3_attack']),
    ('minotaure_sheet1.png', ['minotaure_neutral', 'minotaure_atk1_windup', 'minotaure_atk1_attack']),
    ('minotaure_sheet2.png', ['minotaure_atk2_windup', 'minotaure_atk2_attack', 'minotaure_atk3_windup', 'minotaure_atk3_attack']),
]

MARGIN = 10          # px kept around each detected content cluster
GAP_TOLERANCE = 34   # px of blank rows allowed inside one pose (disjoint particles/fx)
RUN_THRESH = 18      # min run of consecutive non-green/non-white px to count a row as content
                      # (ignores scattered anti-aliasing noise around text edges)


def is_green(r, g, b):
    return g > 100 and g > r * 1.3 and g > b * 1.3


def is_white(r, g, b):
    return r > 205 and g > 205 and b > 205


def is_whitish(r, g, b):
    # looser than is_white: catches the anti-aliased blend pixels along the edge of a
    # white divider line/text glyph fading into the green backdrop, which are neither
    # pure green nor pure white but still shouldn't count as "content"
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
    # true colour content: neither chroma-green nor near-white. Unlike is_whitish (used
    # for the row-content pass), this uses a slightly tighter white cutoff so it reliably
    # separates the (white/near-white only) caption text from actual painted artwork even
    # when a pose's silhouette sits only a couple of px below its label with no real gap.
    if is_green(r, g, b) or (r > 190 and g > 190 and b > 190):
        return False
    # reject the anti-aliased blend band between white text and green backdrop: those
    # pixels sit on the green<->white line (r approx== b, fairly bright) and aren't real
    # brown/red/metal artwork, which always deviates in hue (r far from b).
    if abs(r - b) < 25 and g > 150 and r > 120:
        return False
    return True


def find_art_start(img, top, bottom, w):
    """Within [top, bottom), skip any leading rows that are pure caption text (white/green
    only, no real colour) and return the row where actual artwork begins."""
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
    """True only if the row is 100% chroma-green with no text/anti-aliasing remnants at
    all. MARGIN is only allowed to eat into rows like this - anything else (even a faint
    sub-threshold blend pixel from a caption glyph) blocks further expansion, since that's
    exactly the kind of pixel that shows up as a visible sliver in the final crop."""
    px = img.load()
    for x in range(0, w, 2):
        if not is_green(*px[x, y][:3]):
            return False
    return True


def cluster_rows(rows, n_expected):
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
    # merge clusters that are implausibly small (stray noise) into neighbours
    clusters = [c for c in clusters if c[1] - c[0] > 20]
    return clusters


def trim_divider_lines(img):
    """Strip solid near-white divider-line rows that may have been pulled in by MARGIN
    at the very top/bottom of a crop (chroma-key only removes green, so a leftover
    white line would otherwise survive as a visible artifact)."""
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


def is_border_pixel(r, g, b):
    # the frame some sheets (gorgone_*, molosse_sheet1) have around the whole canvas: a
    # near-white but slightly-off (sometimes greenish-tinted) opaque strip a few px thick,
    # distinct from both the pure chroma-green backdrop and real artwork. Left in place, it
    # survives build_sprite_meta.py's chroma-key (which only strips green) as a visible
    # straight white line on every pose cut from that sheet.
    return r > 165 and g > 165 and b > 165 and not is_green(r, g, b)


def strip_canvas_border(img):
    """Inset the whole raw sheet to drop a solid border frame, if present, before any
    pose slicing - so it can never leak into a per-pose crop regardless of where that
    pose's content happens to sit relative to the sheet edges."""
    w, h = img.size
    px = img.load()

    def col_is_border(x):
        cnt = 0
        for y in range(0, h, 5):
            if is_border_pixel(*px[x, y][:3]):
                cnt += 1
        return cnt > (h / 5) * 0.9

    def row_is_border(y):
        cnt = 0
        for x in range(0, w, 5):
            if is_border_pixel(*px[x, y][:3]):
                cnt += 1
        return cnt > (w / 5) * 0.9

    left = 0
    while left < w // 4 and col_is_border(left):
        left += 1
    right = w
    while right > w - w // 4 and col_is_border(right - 1):
        right -= 1
    top = 0
    while top < h // 4 and row_is_border(top):
        top += 1
    bottom = h
    while bottom > h - h // 4 and row_is_border(bottom - 1):
        bottom -= 1
    if (left, top, right, bottom) != (0, 0, w, h):
        print(f'  (stripped canvas border: left={left} top={top} right={w-right} bottom={h-bottom})')
        return img.crop((left, top, right, bottom))
    return img


def main():
    os.makedirs(DST, exist_ok=True)
    for fname, poses in SHEETS:
        path = os.path.join(SRC, fname)
        img = Image.open(path).convert('RGB')
        img = strip_canvas_border(img)
        w, h = img.size
        rows = content_rows(img, w, h)
        clusters = cluster_rows(rows, len(poses))
        if len(clusters) != len(poses):
            print(f'!! {fname}: expected {len(poses)} poses, found {len(clusters)} clusters -> SKIPPED, needs manual review')
            print('   clusters:', clusters)
            continue
        for (top, bottom), pose_name in zip(clusters, poses):
            art_top = find_art_start(img, top, bottom, w)
            crop_top = art_top
            y = art_top - 1
            while y >= 0 and (art_top - y) <= MARGIN and row_is_pure_green(img, y, w):
                crop_top = y
                y -= 1
            content_end = bottom + 1  # `bottom` is the last True (content) row, inclusive
            crop_bottom = content_end
            y = content_end
            while y < h and (y - content_end) < MARGIN and row_is_pure_green(img, y, w):
                crop_bottom = y + 1
                y += 1
            cropped = img.crop((0, crop_top, w, crop_bottom))
            cropped = trim_divider_lines(cropped)
            if pose_name in POST_PATCHES:
                cropped = cropped.copy()
                draw = ImageDraw.Draw(cropped)
                for rect in POST_PATCHES[pose_name]:
                    draw.rectangle(rect, fill=(0, 200, 0))
            out_path = os.path.join(DST, pose_name + '.png')
            cropped.save(out_path)
            print(f'{fname} -> {pose_name} rows[{crop_top}:{crop_bottom}] size={cropped.size}')


if __name__ == '__main__':
    main()
