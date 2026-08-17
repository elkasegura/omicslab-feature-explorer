#!/usr/bin/env python3
"""Load one repository .mat dataset and return it as JSON to the TS server."""
from __future__ import annotations

import json
import os
import sys
import traceback
from pathlib import Path

import numpy as np
from scipy.io import loadmat

DATASETS_DIR = (Path(__file__).resolve().parent / "datasets").resolve()


def _safe_dataset_path(filename: str) -> Path:
    path = (DATASETS_DIR / filename).resolve()
    if path.parent != DATASETS_DIR or path.suffix.lower() != ".mat":
        raise ValueError("Ruta de dataset no permitida")
    if not path.is_file():
        raise FileNotFoundError(f"No se encuentra el dataset: {filename}")
    return path


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        path = _safe_dataset_path(str(payload["file"]))
        mat = loadmat(path)
        if "X" not in mat or "Y" not in mat:
            raise ValueError(f"{path.name} debe contener matrices X e Y")

        X = np.asarray(mat["X"])
        y = np.asarray(mat["Y"]).reshape(-1)
        if X.ndim != 2:
            raise ValueError(f"X debe ser 2D en {path.name}")
        if len(y) != X.shape[0]:
            raise ValueError(
                f"Y tiene {len(y)} etiquetas pero X tiene {X.shape[0]} muestras en {path.name}"
            )

        # Keep payload compact for integer-valued benchmark datasets.
        X_out = X.tolist()
        y_out = y.tolist()
        features = [f"feature_{i + 1}" for i in range(X.shape[1])]
        json.dump(
            {"X": X_out, "y": y_out, "features": features},
            sys.stdout,
            separators=(",", ":"),
        )
        return 0
    except Exception as exc:
        traceback.print_exc(file=sys.stderr)
        json.dump({"error": str(exc), "type": type(exc).__name__}, sys.stdout)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
