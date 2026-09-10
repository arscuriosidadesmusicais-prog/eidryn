#!/usr/bin/env python3
"""Regressões P0-06 do pacote-fonte Godot distribuído."""

from pathlib import Path
from zipfile import ZipFile

from package_godot import DEFAULT_OUTPUT, PROJECT_ROOT, archive_name, project_files, validate_archive


def check(condition: bool, label: str) -> None:
    if not condition:
        raise AssertionError(label)
    print(f"✓ {label}")


def main() -> None:
    validate_archive(DEFAULT_OUTPUT, compare_contents=True)
    files = project_files()
    expected = {archive_name(path) for path in files}
    expected_pngs = {name for name in expected if name.endswith(".png")}

    with ZipFile(DEFAULT_OUTPUT) as archive:
        names = {name for name in archive.namelist() if not name.endswith("/")}
        check("project.godot" in names, "P0-06 inclui project.godot")
        check(expected_pngs <= names, f"P0-06 inclui todos os {len(expected_pngs)} PNGs")
        check(names == expected, "P0-06 manifesto corresponde ao projeto atual")
        check(all(not Path(name).is_absolute() and ".." not in Path(name).parts for name in names),
              "P0-06 não contém caminhos absolutos ou traversal")
        check(archive.read("project.godot") == (PROJECT_ROOT / "project.godot").read_bytes(),
              "P0-06 project.godot está atualizado")
        check(all(archive.read(name) == (PROJECT_ROOT / name).read_bytes() for name in names),
              "P0-06 conteúdo do ZIP está sincronizado byte a byte")

    print("RESULTADO: 6 passou | 0 falhou")


if __name__ == "__main__":
    main()
