from __future__ import annotations

from typing import Any

import numpy as np
import scipy.linalg
from sklearn import linear_model

from .construct_W import construct_W


class MCFS:
    """Multi-Cluster Feature Selection (Cai et al., KDD 2010).

    This class wraps the original functional implementation so MCFS exposes the
    same ``fit`` / ``feature_scores`` / ``select_top_features`` interface as the
    rest of the models in the project.
    """

    def __init__(
        self,
        n_selected_features: int,
        n_clusters: int = 5,
        *,
        normalize: bool = True,
        graph_kwargs: dict[str, Any] | None = None,
    ) -> None:
        self.n_selected_features = int(n_selected_features)
        self.n_clusters = int(n_clusters)
        self.normalize = bool(normalize)
        self.graph_kwargs = dict(graph_kwargs or {})
        self.weights_: np.ndarray | None = None
        self.scores_: np.ndarray | None = None
        self.ranking_: np.ndarray | None = None

    @staticmethod
    def _zscore(X: np.ndarray) -> np.ndarray:
        mu = X.mean(axis=0, keepdims=True)
        sigma = X.std(axis=0, keepdims=True)
        return (X - mu) / (sigma + 1e-12)

    def fit(self, X: np.ndarray, y: np.ndarray | None = None, W=None) -> "MCFS":
        del y  # MCFS is unsupervised.
        X = np.asarray(X, dtype=float)
        if X.ndim != 2:
            raise ValueError("X debe tener forma (n_samples, n_features)")
        n_samples, n_features = X.shape
        if n_samples < 3 or n_features < 1:
            raise ValueError("MCFS necesita al menos 3 muestras y 1 feature")

        k = min(max(1, self.n_selected_features), n_features)
        n_clusters = min(max(2, self.n_clusters), max(2, n_samples - 1))
        X_fit = self._zscore(X) if self.normalize else X.copy()

        affinity = construct_W(X_fit.copy(), **self.graph_kwargs) if W is None else W
        affinity = affinity.toarray() if hasattr(affinity, "toarray") else np.asarray(affinity)
        affinity = (affinity + affinity.T) / 2.0

        degree = affinity.sum(axis=1)
        degree = np.maximum(degree, 1e-12)
        d_inv_sqrt = np.diag(1.0 / np.sqrt(degree))
        normalized = d_inv_sqrt @ affinity @ d_inv_sqrt
        normalized = np.maximum(normalized, normalized.T)

        _, eigenvectors = scipy.linalg.eigh(normalized)
        # Same spectral embedding used by the original function: discard the
        # trivial largest eigenvector and keep the preceding c vectors.
        start = max(0, eigenvectors.shape[1] - n_clusters - 1)
        stop = eigenvectors.shape[1] - 1
        Y = d_inv_sqrt @ eigenvectors[:, start:stop]
        if Y.shape[1] == 0:
            raise RuntimeError("No se pudieron obtener vectores espectrales para MCFS")

        weights = np.zeros((n_features, Y.shape[1]), dtype=float)
        for i in range(Y.shape[1]):
            clf = linear_model.Lars(n_nonzero_coefs=k, fit_intercept=True)
            clf.fit(X_fit, Y[:, i])
            weights[:, i] = clf.coef_

        # Preserve the score definition of the supplied MCFS implementation.
        scores = weights.max(axis=1)
        ranking = np.argsort(scores, kind="stable")[::-1]

        self.weights_ = weights
        self.scores_ = scores
        self.ranking_ = ranking
        return self

    def feature_scores(self) -> np.ndarray:
        if self.scores_ is None:
            raise RuntimeError("Debes llamar fit() antes de feature_scores().")
        return self.scores_.copy()

    def ranking(self) -> np.ndarray:
        if self.ranking_ is None:
            raise RuntimeError("Debes llamar fit() antes de ranking().")
        return self.ranking_.copy()
