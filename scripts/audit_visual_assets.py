#!/usr/bin/env python3
"""Auditoria reproduzível dos PNGs visuais de Eidryn (somente stdlib).

Valida assinatura/IHDR/CRC estrutural, dimensões, canais alpha, área ocupada,
contato com bordas e duplicatas byte a byte. Opcionalmente grava um manifesto
JSON para revisão de arte e regressão automatizada.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
import zlib
from collections import Counter, defaultdict
from pathlib import Path

PNG_SIG = b"\x89PNG\r\n\x1a\n"


def chunks(data: bytes):
    pos = 8
    while pos + 12 <= len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if len(body) != length:
            raise ValueError("chunk truncado")
        expected = struct.unpack(">I", data[pos + 8 + length:pos + 12 + length])[0]
        actual = zlib.crc32(kind + body) & 0xFFFFFFFF
        if expected != actual:
            raise ValueError(f"CRC inválido em {kind.decode('ascii', 'replace')}")
        yield kind, body
        pos += 12 + length
        if kind == b"IEND":
            return
    raise ValueError("IEND ausente")


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    return a if pa <= pb and pa <= pc else b if pb <= pc else c


def decode_rows(raw: bytes, width: int, height: int, bpp: int) -> list[bytes]:
    stride = width * bpp
    expected = height * (stride + 1)
    if len(raw) != expected:
        raise ValueError(f"IDAT descompactado {len(raw)} != {expected}")
    rows: list[bytes] = []
    prev = bytearray(stride)
    off = 0
    for _ in range(height):
        filt = raw[off]
        src = raw[off + 1:off + 1 + stride]
        off += stride + 1
        out = bytearray(stride)
        for x, value in enumerate(src):
            left = out[x - bpp] if x >= bpp else 0
            up = prev[x]
            upper_left = prev[x - bpp] if x >= bpp else 0
            if filt == 0:
                decoded = value
            elif filt == 1:
                decoded = value + left
            elif filt == 2:
                decoded = value + up
            elif filt == 3:
                decoded = value + ((left + up) >> 1)
            elif filt == 4:
                decoded = value + paeth(left, up, upper_left)
            else:
                raise ValueError(f"filtro PNG não suportado: {filt}")
            out[x] = decoded & 255
        rows.append(bytes(out))
        prev = out
    return rows


def inspect_png(path: Path, root: Path) -> dict:
    data = path.read_bytes()
    if not data.startswith(PNG_SIG):
        raise ValueError("assinatura PNG inválida")
    parsed = list(chunks(data))
    ihdr = next((body for kind, body in parsed if kind == b"IHDR"), None)
    if ihdr is None or len(ihdr) != 13:
        raise ValueError("IHDR ausente/inválido")
    width, height, depth, color_type, compression, filtering, interlace = struct.unpack(">IIBBBBB", ihdr)
    if depth != 8 or color_type not in (2, 3, 6) or compression or filtering or interlace:
        raise ValueError(f"formato não suportado: depth={depth}, color={color_type}, interlace={interlace}")
    bpp = {2: 3, 3: 1, 6: 4}[color_type]
    packed = b"".join(body for kind, body in parsed if kind == b"IDAT")
    rows = decode_rows(zlib.decompress(packed), width, height, bpp)
    trns = next((body for kind, body in parsed if kind == b"tRNS"), b"")

    visible = 0
    min_x, min_y, max_x, max_y = width, height, -1, -1
    touches = [False, False, False, False]  # top, right, bottom, left
    for y, row in enumerate(rows):
        for x in range(width):
            if color_type == 6:
                alpha = row[x * 4 + 3]
            elif color_type == 3:
                idx = row[x]
                alpha = trns[idx] if idx < len(trns) else 255
            else:
                alpha = 255
            if alpha <= 8:
                continue
            visible += 1
            min_x, min_y = min(min_x, x), min(min_y, y)
            max_x, max_y = max(max_x, x), max(max_y, y)
            if y == 0: touches[0] = True
            if x == width - 1: touches[1] = True
            if y == height - 1: touches[2] = True
            if x == 0: touches[3] = True

    bbox = None if visible == 0 else [min_x, min_y, max_x + 1, max_y + 1]
    return {
        "path": path.relative_to(root).as_posix(),
        "width": width,
        "height": height,
        "bytes": len(data),
        "bit_depth": depth,
        "color_type": color_type,
        "visible_coverage": round(visible / max(1, width * height), 5),
        "content_bbox": bbox,
        "touches_edges": dict(zip(("top", "right", "bottom", "left"), touches)),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def expected_dimensions(rel: str) -> set[tuple[int, int]] | None:
    name = Path(rel).name
    if rel.startswith("enemies/boss_"):
        return {(192, 192)}
    if rel.startswith("enemies/") or rel.startswith("items/") or rel.startswith("pets/") or rel.startswith("ui/tab_"):
        return {(96, 96)}
    if rel.startswith("hero/"):
        return {(96, 96)}
    if name.startswith("bg_"):
        if name.endswith("_sky.png"): return {(270, 480)}
        if name.endswith("_far.png"): return {(270, 190)}
        if name.endswith("_mid.png"): return {(270, 150)}
        if name.endswith("_near.png"): return {(270, 110)}
    return None


def audit(root: Path, source: Path | None = None) -> dict:
    files = sorted(root.rglob("*.png"))
    assets, errors, unexpected = [], [], []
    for path in files:
        try:
            item = inspect_png(path, root)
            assets.append(item)
            expected = expected_dimensions(item["path"])
            if expected and (item["width"], item["height"]) not in expected:
                unexpected.append({"path": item["path"], "actual": [item["width"], item["height"]], "expected": sorted(expected)})
        except Exception as exc:  # relatório deve continuar para listar todos os defeitos
            errors.append({"path": path.relative_to(root).as_posix(), "error": str(exc)})

    hashes: dict[str, list[str]] = defaultdict(list)
    for item in assets:
        hashes[item["sha256"]].append(item["path"])
    duplicates = [paths for paths in hashes.values() if len(paths) > 1]
    dimensions = Counter((a["width"], a["height"]) for a in assets)
    invisible = [a["path"] for a in assets if a["content_bbox"] is None]
    all_edges = [a["path"] for a in assets if all(a["touches_edges"].values())]
    asset_keys = {a["path"][:-4] for a in assets}
    literal_refs: set[str] = set()
    if source and source.exists():
        pattern = re.compile(r"E\.IMG\[['\"]([^'\"]+)['\"]\]")
        for src in sorted(source.glob("*")):
            if src.suffix not in (".js", ".html"):
                continue
            literal_refs.update(pattern.findall(src.read_text(encoding="utf-8")))
    missing_refs = sorted(ref for ref in literal_refs if ref not in asset_keys)

    data_refs: set[str] = set()
    if source:
        data_root = source.parent.parent / "eidryn" / "data"
        specs = {
            "attributes.json": ("ui/attr_", "icon"),
            "currencies.json": ("ui/currency_", "id"),
            "items.json": ("ui/", "icon"),
            "skills.json": ("ui/", "icon"),
            "pets.json": ("pets/", "icon"),
        }
        def collect(value, field, prefix):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key == field and isinstance(child, str): data_refs.add(prefix + child)
                    collect(child, field, prefix)
            elif isinstance(value, list):
                for child in value: collect(child, field, prefix)
        for filename, (prefix, field) in specs.items():
            file = data_root / filename
            if file.exists(): collect(json.loads(file.read_text(encoding="utf-8")), field, prefix)
        regions_file = data_root / "regions.json"
        if regions_file.exists():
            region_data = json.loads(regions_file.read_text(encoding="utf-8"))
            for region in region_data.get("regions", []):
                for layer in ("sky", "far", "mid", "near"):
                    data_refs.add(f"ui/bg_{region['id']}_{layer}")
    missing_data_refs = sorted(ref for ref in data_refs if ref not in asset_keys)
    return {
        "schema": 1,
        "root": root.as_posix(),
        "summary": {
            "png_files": len(files),
            "valid_png": len(assets),
            "invalid_png": len(errors),
            "zero_byte": sum(path.stat().st_size == 0 for path in files),
            "fully_transparent": len(invisible),
            "unexpected_dimensions": len(unexpected),
            "exact_duplicate_groups": len(duplicates),
            "assets_touching_all_edges": len(all_edges),
            "literal_references_checked": len(literal_refs),
            "literal_references_missing": len(missing_refs),
            "data_references_checked": len(data_refs),
            "data_references_missing": len(missing_data_refs),
            "total_bytes": sum(a["bytes"] for a in assets),
        },
        "dimensions": {f"{w}x{h}": count for (w, h), count in sorted(dimensions.items())},
        "errors": errors,
        "unexpected_dimensions": unexpected,
        "fully_transparent": invisible,
        "exact_duplicates": duplicates,
        "assets_touching_all_edges": all_edges,
        "literal_references": sorted(literal_refs),
        "literal_references_missing": missing_refs,
        "data_references": sorted(data_refs),
        "data_references_missing": missing_data_refs,
        "assets": assets,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("eidryn/assets/sprites"))
    parser.add_argument("--source", type=Path, default=Path("scripts/eidryn_html"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--strict", action="store_true", help="falha em PNG/referência inválida, vazio, invisível ou dimensão inesperada")
    args = parser.parse_args()
    report = audit(args.root, args.source)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, sort_keys=True))
    bad = (report["errors"] or report["fully_transparent"] or report["unexpected_dimensions"] or
           report["literal_references_missing"] or report["data_references_missing"] or
           report["summary"]["zero_byte"])
    return 1 if args.strict and bad else 0


if __name__ == "__main__":
    sys.exit(main())
