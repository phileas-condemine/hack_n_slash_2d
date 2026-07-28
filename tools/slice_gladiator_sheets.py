"""One-off slicer for the gladiator-arena monster sheets (assets/raw/gladiator_arena_monsters/).

Each sheet is N poses stacked vertically, evenly divided in height, each pose prefixed
by a bold white text label on the green background. This crops each band, strips the
label row, and writes one file per pose into assets/enemies/states/.

Not a general tool (unlike build_sprite_meta.py) - the crop boundaries are specific to
this one batch of ChatGPT-generated sheets. Run once, then delete/ignore.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'raw', 'gladiator_arena_monsters')
DST = os.path.join(ROOT, 'assets', 'enemies', 'states')

# (sheet filename, [pose suffixes top-to-bottom])
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


def is_green(r, g, b):
    return g > 100 and g > r * 1.35 and g > b * 1.35


def find_label_end(band, band_w, band_h):
    """Scan from the top of a pose band for rows containing white-ish label text
    pixels; return the y just below the last such row (within the top 30%)."""
    px = band.load()
    last_label_y = -1
    scan_limit = int(band_h * 0.30)
    for y in range(scan_limit):
        white_count = 0
        for x in range(0, band_w, 3):  # sample every 3rd px for speed
            r, g, b = px[x, y][:3]
            if r > 200 and g > 200 and b > 200:
                white_count += 1
        if white_count > (band_w / 3) * 0.02:  # >2% of sampled px are white
            last_label_y = y
    return last_label_y + 6 if last_label_y >= 0 else 0  # small margin below text


def main():
    os.makedirs(DST, exist_ok=True)
    for fname, poses in SHEETS:
        path = os.path.join(SRC, fname)
        img = Image.open(path).convert('RGB')
        w, h = img.size
        n = len(poses)
        band_h = h / n
        for i, pose_name in enumerate(poses):
            top = int(round(i * band_h))
            bottom = int(round((i + 1) * band_h))
            band = img.crop((0, top, w, bottom))
            label_end = find_label_end(band, w, bottom - top)
            cropped = band.crop((0, label_end, w, bottom - top))
            out_path = os.path.join(DST, pose_name + '.png')
            cropped.save(out_path)
            print(f'{fname} pose {i} ({pose_name}) -> {cropped.size}, label_end={label_end}')


if __name__ == '__main__':
    main()
