#!/usr/bin/env python3
"""JSON stdin/stdout bridge between the TypeScript server and Python models."""
from __future__ import annotations

import contextlib
import json
import math
import os
import sys
import traceback

# Determinism-related environment flags must be set before ML frameworks load.
os.environ.setdefault("OMICSLAB_SEED", "42")
os.environ.setdefault("PYTHONHASHSEED", os.environ["OMICSLAB_SEED"])
os.environ.setdefault("TF_DETERMINISTIC_OPS", "1")
os.environ.setdefault("TF_CUDNN_DETERMINISTIC", "1")
os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np

from reproducibility import DEFAULT_SEED, set_global_seed
from models.registry import ModelContext, run_model


def _json_number(value: float) -> float:
    value = float(value)
    return value if math.isfinite(value) else 0.0


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        X = np.asarray(payload["X"], dtype=float)
        y_raw = payload.get("y")
        y = None if y_raw is None else np.asarray(y_raw)
        n_features = max(1, min(int(payload["n_features"]), X.shape[1]))
        set_global_seed(DEFAULT_SEED)
        context = ModelContext(
            n_features=n_features,
            seed=DEFAULT_SEED,
            n_clusters=int(payload.get("n_clusters", 5)),
            epochs=payload.get("epochs"),
            params=dict(payload.get("params") or {}),
        )
        model_id = str(payload["model"]).lower()

        # Model implementations may print training progress. Keep stdout as JSON.
        with contextlib.redirect_stdout(sys.stderr):
            scores = np.asarray(run_model(model_id, X, y, context), dtype=float).reshape(-1)

        if scores.size != X.shape[1]:
            raise RuntimeError(
                f"{model_id} devolvió {scores.size} scores para {X.shape[1]} features"
            )
        ranking = np.argsort(scores, kind="stable")[::-1]
        json.dump(
            {
                "model": model_id,
                "ranking": [int(v) for v in ranking.tolist()],
                "scores": [_json_number(v) for v in scores.tolist()],
                "seed": DEFAULT_SEED,
            },
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
