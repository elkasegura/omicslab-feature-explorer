"""Affinity-graph construction shared by MCFS and NDFS.

The original implementation repeated the same sparse-matrix construction and
symmetrisation blocks in every metric/weight branch.  This version keeps the
same public ``construct_W(X, **kwargs)`` API while centralising those operations.
"""
from __future__ import annotations

import numpy as np
from scipy.sparse import csc_matrix, lil_matrix
from sklearn.metrics.pairwise import pairwise_distances


def _row_normalize(X: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    return X / np.maximum(norms, 1e-12)


def _symmetrize_max(W: csc_matrix) -> csc_matrix:
    """Make an affinity graph undirected by keeping the larger directed edge."""
    bigger = W.T > W
    return W - W.multiply(bigger) + W.T.multiply(bigger)


def _sparse_from_neighbors(
    row_ids: np.ndarray,
    neighbor_ids: np.ndarray,
    values: np.ndarray,
    n_samples: int,
) -> csc_matrix:
    """Build a sparse graph from one neighbor matrix per source row."""
    width = neighbor_ids.shape[1]
    rows = np.tile(row_ids, width)
    cols = np.ravel(neighbor_ids, order="F")
    data = np.ravel(values, order="F")
    return csc_matrix((data, (rows, cols)), shape=(n_samples, n_samples))


def _neighbor_graph(
    X: np.ndarray,
    row_ids: np.ndarray,
    k: int,
    metric: str,
    weight_mode: str,
    t: float,
) -> csc_matrix:
    """Construct directed k-NN edges for the supplied rows."""
    if row_ids.size == 0:
        return csc_matrix((X.shape[0], X.shape[0]))

    local = X[row_ids]
    local_k = min(int(k), max(0, len(row_ids) - 1))
    width = local_k + 1  # include each sample itself, as in the supplied code

    if metric == "euclidean":
        distances = pairwise_distances(local) ** 2
        order = np.argsort(distances, axis=1)[:, :width]
        selected_measure = np.take_along_axis(distances, order, axis=1)
    elif metric == "cosine":
        normalized = _row_normalize(local)
        similarities = normalized @ normalized.T
        order = np.argsort(-similarities, axis=1)[:, :width]
        selected_measure = np.take_along_axis(similarities, order, axis=1)
    else:
        raise ValueError(f"metric no soportada: {metric}")

    neighbors = row_ids[order]
    if weight_mode == "binary":
        values = np.ones_like(selected_measure, dtype=float)
    elif weight_mode == "heat_kernel":
        values = np.exp(-selected_measure / (2.0 * t * t))
    elif weight_mode == "cosine":
        if metric != "cosine":
            raise ValueError("weight_mode='cosine' requiere metric='cosine'")
        values = selected_measure
    else:
        raise ValueError(f"weight_mode no soportado: {weight_mode}")

    return _sparse_from_neighbors(row_ids, neighbors, values, X.shape[0])


def _supervised_graph(
    X: np.ndarray,
    y: np.ndarray,
    k: int,
    metric: str,
    weight_mode: str,
    t: float,
) -> csc_matrix:
    graph = csc_matrix((X.shape[0], X.shape[0]))
    for label in np.unique(y):
        row_ids = np.flatnonzero(y == label)
        graph = graph + _neighbor_graph(X, row_ids, k, metric, weight_mode, t)
    return _symmetrize_max(graph)


def _fisher_graph(y: np.ndarray) -> lil_matrix:
    n_samples = len(y)
    W = lil_matrix((n_samples, n_samples))
    for label in np.unique(y):
        idx = np.flatnonzero(y == label)
        if idx.size:
            W[np.ix_(idx, idx)] = 1.0 / idx.size
    return W


def _relief_graph(X: np.ndarray, y: np.ndarray, k: int) -> csc_matrix:
    """Construct the supervised ReliefF-style graph supported by the legacy API."""
    n_samples = X.shape[0]
    labels = np.unique(y)
    if len(labels) < 2:
        raise ValueError("reliefF requiere al menos dos clases")

    same = csc_matrix((n_samples, n_samples))
    different = csc_matrix((n_samples, n_samples))

    for label in labels:
        source = np.flatnonzero(y == label)
        if source.size == 0:
            continue

        same_k = min(k, max(0, source.size - 1))
        if same_k > 0:
            distances = pairwise_distances(X[source]) ** 2
            order = np.argsort(distances, axis=1)[:, : same_k + 1]
            neighbors = source[order]
            values = np.full(neighbors.shape, 1.0 / same_k)
            same = same + _sparse_from_neighbors(source, neighbors, values, n_samples)

        for other_label in labels:
            if other_label == label:
                continue
            target = np.flatnonzero(y == other_label)
            cross_k = min(k, target.size)
            if cross_k == 0:
                continue
            distances = pairwise_distances(X[source], X[target])
            order = np.argsort(distances, axis=1)[:, :cross_k]
            neighbors = target[order]
            values = np.full(
                neighbors.shape,
                -1.0 / ((len(labels) - 1) * max(1, k)),
            )
            different = different + _sparse_from_neighbors(source, neighbors, values, n_samples)

    same.setdiag(1.0)
    return same + _symmetrize_max(different)


def construct_W(X: np.ndarray, **kwargs):
    """Construct the affinity matrix used by MCFS/NDFS.

    Defaults match the supplied implementation: k-NN, cosine metric, binary
    weights, and ``k=5``.  The legacy supervised, Fisher-score and ReliefF modes
    remain available without duplicating graph-building code.
    """
    X = np.asarray(X, dtype=float)
    if X.ndim != 2:
        raise ValueError("X debe tener forma (n_samples, n_features)")
    n_samples = X.shape[0]
    if n_samples == 0:
        raise ValueError("X no puede estar vacío")

    neighbor_mode = str(kwargs.get("neighbor_mode", "knn"))
    weight_mode = str(kwargs.get("weight_mode", "binary"))
    metric = str(kwargs.get("metric", "cosine"))
    k = min(int(kwargs.get("k", 5)), max(1, n_samples - 1))
    t = float(kwargs.get("t", 1.0))

    # Preserve the compatibility rules from the supplied implementation.
    if weight_mode == "heat_kernel":
        metric = "euclidean"
    elif weight_mode == "cosine":
        metric = "cosine"

    if neighbor_mode == "knn":
        rows = np.arange(n_samples)
        return _symmetrize_max(_neighbor_graph(X, rows, k, metric, weight_mode, t))

    if neighbor_mode != "supervised":
        raise ValueError(f"neighbor_mode no soportado: {neighbor_mode}")

    if "y" not in kwargs:
        raise ValueError("neighbor_mode='supervised' requiere y")
    y = np.asarray(kwargs["y"]).reshape(-1)
    if y.size != n_samples:
        raise ValueError("y debe tener una etiqueta por muestra")

    if bool(kwargs.get("fisher_score", False)):
        return _fisher_graph(y)
    if bool(kwargs.get("reliefF", False)):
        return _relief_graph(X, y, k)
    return _supervised_graph(X, y, k, metric, weight_mode, t)


__all__ = ["construct_W"]
