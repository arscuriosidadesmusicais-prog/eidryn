#!/usr/bin/env python3
"""Empacota o projeto Godot completo em um ZIP determinístico e validado."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

REPO_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = REPO_ROOT / "eidryn"
DEFAULT_OUTPUT = REPO_ROOT / "download" / "eidryn-o-ciclo-do-eclipse_v1.0.0_godot44.zip"
EXCLUDED_PARTS = {".godot", "__pycache__"}
EXCLUDED_NAMES = {".DS_Store"}


def project_files() -> list[Path]:
    """Retorna todos os arquivos-fonte publicáveis, em ordem estável."""
    return sorted(
        (
            path
            for path in PROJECT_ROOT.rglob("*")
            if path.is_file()
            and not any(part in EXCLUDED_PARTS for part in path.parts)
            and path.name not in EXCLUDED_NAMES
            and not path.name.endswith((".tmp", ".pyc"))
        ),
        key=lambda path: path.relative_to(PROJECT_ROOT).as_posix(),
    )


def archive_name(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def write_archive(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    files = project_files()
    with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for source in files:
            info = ZipInfo(archive_name(source), date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            executable = bool(source.stat().st_mode & 0o111)
            info.external_attr = ((0o100755 if executable else 0o100644) << 16)
            archive.writestr(info, source.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    os.replace(temporary, output)
    validate_archive(output, compare_contents=True)
    print(f"OK: {output} ({output.stat().st_size} bytes | {len(files)} arquivos)")


def validate_archive(output: Path, *, compare_contents: bool) -> None:
    expected = {archive_name(path): path for path in project_files()}
    with ZipFile(output) as archive:
        names = {name for name in archive.namelist() if not name.endswith("/")}
        missing = sorted(set(expected) - names)
        extra = sorted(names - set(expected))
        if missing or extra:
            raise RuntimeError(f"manifesto inválido; ausentes={missing[:5]}, extras={extra[:5]}")
        if "project.godot" not in names:
            raise RuntimeError("project.godot ausente do pacote")
        expected_pngs = {name for name in expected if name.endswith(".png")}
        archived_pngs = {name for name in names if name.endswith(".png")}
        if archived_pngs != expected_pngs:
            raise RuntimeError("conjunto de PNGs do pacote diverge do projeto")
        if compare_contents:
            for name, source in expected.items():
                if archive.read(name) != source.read_bytes():
                    raise RuntimeError(f"conteúdo desatualizado no pacote: {name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="valida o ZIP existente sem recriá-lo")
    args = parser.parse_args()
    output = args.output.resolve()
    if args.check:
        validate_archive(output, compare_contents=True)
        print(f"OK: pacote validado: {output}")
    else:
        write_archive(output)


if __name__ == "__main__":
    main()
