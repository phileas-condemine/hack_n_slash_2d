"""One-off slicer for assets/raw/medieval_bamboo_stalker/bamboo_stalker_sheet.png (3 poses
stacked vertically: neutral, windup, attack). Reuses the content-bbox detection helpers from
slice_gladiator_sheets.py (same ChatGPT sheet conventions: white caption on green backdrop).
Run once, then delete/ignore.
"""
import os
import importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('slice_common', os.path.join(ROOT, 'tools', 'slice_gladiator_sheets.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

from PIL import Image, ImageDraw

SRC = os.path.join(ROOT, 'assets', 'raw', 'medieval_bamboo_stalker', 'bamboo_stalker_sheet.png')
DST = os.path.join(ROOT, 'assets', 'enemies', 'states')
POSES = ['medieval_bamboo_stalker_neutral', 'medieval_bamboo_stalker_windup', 'medieval_bamboo_stalker_attack']

# WINDUP's raised sickle blade touches its own "WINDUP" caption with ~0px gap (same situation
# as manticore_atk2_attack in slice_gladiator_sheets.py) - row-based cropping alone can't
# separate them, so the caption's measured bbox is painted over post-crop instead.
POST_PATCHES = {
    'medieval_bamboo_stalker_windup': [(280, 0, 510, 26)],
}


def main():
    os.makedirs(DST, exist_ok=True)
    img = Image.open(SRC).convert('RGB')
    img = m.strip_canvas_border(img)
    w, h = img.size
    rows = m.content_rows(img, w, h)
    clusters = m.cluster_rows(rows, len(POSES))
    if len(clusters) != len(POSES):
        print(f'!! expected {len(POSES)} poses, found {len(clusters)} clusters -> needs manual review')
        print('   clusters:', clusters)
        return
    for (top, bottom), pose_name in zip(clusters, POSES):
        art_top = m.find_art_start(img, top, bottom, w)
        crop_top = art_top
        y = art_top - 1
        while y >= 0 and (art_top - y) <= m.MARGIN and m.row_is_pure_green(img, y, w):
            crop_top = y
            y -= 1
        content_end = bottom + 1
        crop_bottom = content_end
        y = content_end
        while y < h and (y - content_end) < m.MARGIN and m.row_is_pure_green(img, y, w):
            crop_bottom = y + 1
            y += 1
        cropped = img.crop((0, crop_top, w, crop_bottom))
        cropped = m.trim_divider_lines(cropped)
        if pose_name in POST_PATCHES:
            cropped = cropped.copy()
            draw = ImageDraw.Draw(cropped)
            for rect in POST_PATCHES[pose_name]:
                draw.rectangle(rect, fill=(0, 200, 0))
        out_path = os.path.join(DST, pose_name + '.png')
        cropped.save(out_path)
        print(f'-> {pose_name} rows[{crop_top}:{crop_bottom}] size={cropped.size}')


if __name__ == '__main__':
    main()
