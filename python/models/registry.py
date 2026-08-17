"""Single dispatch layer for the Python feature-selection models.

This module contains orchestration only: every scientific model keeps a single
implementation in ``python/models``.  No per-model adapter classes are used.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from reproducibility import DEFAULT_SEED, set_global_seed


@dataclass(frozen=True)
class ModelContext:
    n_features: int
    seed: int = DEFAULT_SEED
    n_clusters: int = 5
    epochs: int | None = None
    params: dict[str, Any] = field(default_factory=dict)

    def get(self, name: str, default: Any) -> Any:
        return self.params.get(name, default)


def _zscore(X: np.ndarray) -> np.ndarray:
    X = np.asarray(X, dtype=float)
    return (X - X.mean(axis=0, keepdims=True)) / (X.std(axis=0, keepdims=True) + 1e-12)


def run_model(model_id: str, X: np.ndarray, y: np.ndarray | None, context: ModelContext) -> np.ndarray:
    """Fit one model and return one score per input feature."""
    model_id = model_id.lower()
    X = np.asarray(X, dtype=float)

    if model_id == "mcfs":
        from .MCFS import MCFS

        set_global_seed(context.seed)
        model = MCFS(
            n_selected_features=context.n_features,
            n_clusters=context.n_clusters,
            normalize=bool(context.get("normalize", True)),
        )
        model.fit(X)
        return np.asarray(model.feature_scores(), dtype=float)

    if model_id == "ndfs":
        from .NDFS import ndfs

        set_global_seed(context.seed)
        weights = np.asarray(
            ndfs(
                _zscore(X).copy(),
                n_clusters=context.n_clusters,
                alpha=float(context.get("alpha", 1.0)),
                beta=float(context.get("beta", 1.0)),
                gamma=float(context.get("gamma", 1e9)),
                verbose=False,
            ),
            dtype=float,
        )
        return np.linalg.norm(weights, axis=1)

    if model_id == "aefs":
        from .AEFS import AEFS

        set_global_seed(context.seed)
        model = AEFS(
            hidden=int(context.get("hidden", 128)),
            alpha=float(context.get("alpha", 0.01)),
            beta=float(context.get("beta", 0.01)),
            lr=float(context.get("lr", 1e-3)),
        )
        model.fit(
            X,
            epochs=int(context.epochs or 100),
            normalize=bool(context.get("normalize", True)),
            verbose=False,
        )
        return np.asarray(model.feature_scores(), dtype=float)

    if model_id == "dga":
        from .DGA import DGA

        set_global_seed(context.seed)
        model = DGA(
            hidden=int(context.get("hidden", 20)),
            gamma=float(context.get("gamma", 0.1)),
            lam=float(context.get("lam", 0.1)),
            lr=float(context.get("lr", 1e-3)),
            optimizer=str(context.get("optimizer", "sgd")),
            max_grad_norm=float(context.get("max_grad_norm", 1.0)),
            seed=context.seed,
        )
        model.fit(X, epochs=int(context.epochs or 50), B=context.get("B", None), verbose=False)
        if model.g_last is None:
            raise RuntimeError("DGA no produjo gates")
        return model.g_last.mean(dim=0).cpu().numpy().astype(float)

    if model_id == "drae":
        from .DRAE import DRAE

        set_global_seed(context.seed)
        model = DRAE(
            d_hidden=int(context.get("d_hidden", 10)),
            n_clusters=context.n_clusters,
            alpha=float(context.get("alpha", 1e8)),
            beta=float(context.get("beta", 1e-3)),
            gamma=float(context.get("gamma", 1e-2)),
            zeta=float(context.get("zeta", 1e2)),
            lam=float(context.get("lam", 1e4)),
            device=str(context.get("device", "cpu")),
        )
        # Supplied DRAE implementation expects (features, samples).
        model.fit(X.T, epochs=int(context.epochs or 100))
        return np.asarray(model.get_gene_scores(), dtype=float)

    if model_id == "smlae":
        from .SMLAE import SMLAE

        set_global_seed(context.seed)
        model = SMLAE(
            d_hidden=int(context.get("d_hidden", 20)),
            n_neighbors=int(context.get("n_neighbors", 5)),
            alpha=float(context.get("alpha", 1e-6)),
            beta=float(context.get("beta", 1e-3)),
            gamma=float(context.get("gamma", 1e-3)),
            omega=float(context.get("omega", 1e-3)),
            rho1=float(context.get("rho1", 1e-6)),
            rho2=float(context.get("rho2", 1e-6)),
            device=str(context.get("device", "cpu")),
            n_clusters=context.n_clusters,
        )
        model.fit(X.T, epochs=int(context.epochs or 100))
        return np.asarray(model.get_gene_score(), dtype=float)

    if model_id == "rfae":
        from .RFAE import cal

        set_global_seed(context.seed)
        X32 = X.astype(np.float32, copy=False)
        if y is None or len(y) != len(X32):
            labels = np.zeros(len(X32), dtype=np.float32)
        else:
            labels = np.asarray(y, dtype=np.float32)
        _, scores = cal(
            X32,
            labels,
            datasetname="omicslab_",
            p_key_feture_number=context.n_features,
            p_epochs_number=int(context.epochs or 100),
            p_batch_size_value=int(context.get("batch_size", 16)),
            clf=False,
            p_seed=context.seed,
            device=int(context.get("device_index", 0)),
        )
        return np.asarray(scores, dtype=float)

    raise ValueError(f"Modelo desconocido: {model_id}")
