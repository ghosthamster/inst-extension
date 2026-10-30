from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
out = root / "dist" / "inst-quick-share.zip"
out.parent.mkdir(exist_ok=True)
with ZipFile(out, "w", ZIP_DEFLATED) as archive:
    for path in sorted((root / "extension").rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(root / "extension"))
print(out)
