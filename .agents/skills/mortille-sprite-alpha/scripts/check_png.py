"""Read-only PNG/alpha/gutter checks. Visual inspection remains required."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source', action='store_true', help='Allow antialiased source alpha; skip frame size agreement')
parser.add_argument('files', nargs='+', type=Path)
args = parser.parse_args()
reports, hashes, sizes = [], {}, set()
failed = False
for path in args.files:
    errors, warnings = [], []
    try:
        with Image.open(path) as im:
            sizes.add(im.size)
            if im.format != 'PNG':
                errors.append('not PNG')
            if im.mode != 'RGBA':
                errors.append('not RGBA')
            else:
                pixels = list(im.getdata())
                alpha = {p[3] for p in pixels}
                if 0 not in alpha or 255 not in alpha:
                    errors.append('must contain fully transparent and opaque pixels')
                if not args.source:
                    if alpha != {0, 255}:
                        errors.append('game frame alpha must be binary')
                    if any(any(p[:3]) for p in pixels if p[3] == 0):
                        errors.append('transparent RGB must be zero')
                    box = im.getchannel('A').getbbox()
                    if box and (box[0] == 0 or box[1] == 0 or box[2] == im.width or box[3] == im.height):
                        warnings.append('content touches canvas edge: inspect clipping/gutter')
                digest = hashlib.sha256(im.tobytes()).hexdigest()
                if digest in hashes:
                    warnings.append('identical pixels to ' + hashes[digest] + ': verify intentional hold')
                hashes[digest] = str(path)
            reports.append({'file': str(path), 'mode': im.mode, 'size': im.size, 'errors': errors, 'warnings': warnings})
    except (OSError, ValueError) as exc:
        errors.append(str(exc))
        reports.append({'file': str(path), 'errors': errors})
    failed |= bool(errors)
if not args.source and len(sizes) > 1:
    reports.append({'errors': ['frame sizes differ; check one animation at a time']})
    failed = True
print(json.dumps({'numericChecksPassed': not failed, 'visualReviewRequired': True, 'files': reports}, indent=2))
raise SystemExit(1 if failed else 0)
