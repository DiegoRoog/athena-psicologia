"""Prepare user-provided sequence assets without changing their composition."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import zipfile, re, json, io, shutil
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parents[1]
ZIP = SOURCE / 'ezgif-1e281754596eacd2-jpg.zip'
REFERENCE = SOURCE / 'Atena Psicologia_ Escuta e Autoconhecimento.png'
BUST = SOURCE / 'Busto Dourado de Filósofo Romano.png'
archive = zipfile.ZipFile(ZIP)
names = sorted([n for n in archive.namelist() if n.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))], key=lambda s: [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s)])
sources = ROOT / 'assets' / 'source-frames'
sources.mkdir(parents=True, exist_ok=True)
for index, name in enumerate(names, 1):
    # Canonical names avoid carrying archive paths or traversal segments forward.
    (sources / f'frame-{index:04d}.jpg').write_bytes(archive.read(name))
shutil.copyfile(REFERENCE, ROOT / 'docs' / 'reference' / 'hero-reference.png')
shutil.copyfile(BUST, ROOT / 'public' / 'images' / 'golden-bust.png')
Image.open(BUST).resize((640, 640), Image.Resampling.LANCZOS).save(ROOT / 'public' / 'images' / 'golden-bust.webp', quality=85, method=6)
shutil.copyfile(sources / 'frame-0001.jpg', ROOT / 'public' / 'images' / 'sequence-poster.jpg')
samples = sorted(set([1, 240] + list(range(12, 240, 12))))
sheet = Image.new('RGB', (1280, ((len(samples) + 3) // 4) * 202), '#10151e')
draw = ImageDraw.Draw(sheet)
for tile, number in enumerate(samples):
    im = Image.open(sources / f'frame-{number:04d}.jpg').convert('RGB').resize((320, 180))
    x, y = (tile % 4) * 320, (tile // 4) * 202
    sheet.paste(im, (x, y))
    draw.text((x + 10, y + 183), f'Frame {number:03d} | {(number-1)/239:.3f}', fill='#e0c27a')
sheet.save(ROOT / 'docs' / 'qa' / 'sequence-contact-sheet.jpg', quality=90)

def convert(number):
    image = Image.open(sources / f'frame-{number:04d}.jpg').convert('RGB')
    # Originals are already compressed more efficiently than a WebP transcode.
    shutil.copyfile(sources / f'frame-{number:04d}.jpg', ROOT / 'public' / 'frames' / 'desktop' / f'frame-{number:04d}.jpg')
    image.resize((768, 432), Image.Resampling.LANCZOS).save(ROOT / 'public' / 'frames' / 'mobile' / f'frame-{number:04d}.webp', quality=60, method=5)

with ThreadPoolExecutor(max_workers=4) as executor:
    list(executor.map(convert, range(1, len(names) + 1)))

Image.open(sources / 'frame-0001.jpg').save(ROOT / 'public' / 'images' / 'sequence-poster.webp', quality=86, method=5)
metadata = {
    'frameCount': len(names),
    'source': ZIP.name,
    'sourceDimensions': [1280, 720],
    'sourceBytes': sum(archive.getinfo(n).file_size for n in names),
    'indexing': 'one-based; frame-0001 through frame-0240; numeric ascending order',
    'desktop': {'directory': '/frames/desktop', 'extension': '.jpg', 'dimensions': [1280, 720], 'encoding': 'original JPEG bytes, no recompression'},
    'mobile': {'directory': '/frames/mobile', 'extension': '.webp', 'dimensions': [768, 432], 'quality': 60},
    'bust': {'path': '/images/golden-bust.png', 'mode': Image.open(BUST).mode, 'dimensions': list(Image.open(BUST).size)},
    'reference': {'path': 'docs/reference/hero-reference.png', 'dimensions': list(Image.open(REFERENCE).size)},
}
for variant in ('desktop', 'mobile'):
    metadata[variant]['bytes'] = sum(p.stat().st_size for p in (ROOT / 'public' / 'frames' / variant).glob('*' + metadata[variant]['extension']))
metadata['milestones'] = [
    {'frames': [1, 12], 'label': 'Centered, hands joined'},
    {'frames': [24, 48], 'label': 'Arms start opening while camera approaches'},
    {'frames': [48, 96], 'label': 'Palms open; maximum extension near frames 72–84'},
    {'frames': [108, 144], 'label': 'Hands return and join; close camera'},
    {'frames': [156, 192], 'label': 'Camera pulls back and statue shifts right'},
    {'frames': [192, 240], 'label': 'Statue on right, generous left editorial space'},
]
metadata['recommendedBustWindow'] = {'fadeInFrames': [52, 62], 'holdFrames': [62, 90], 'fadeOutFrames': [90, 102], 'rationale': 'Visible only while open palms leave the chest unobstructed'}
(ROOT / 'assets' / 'sequence-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps(metadata, ensure_ascii=False, indent=2))
