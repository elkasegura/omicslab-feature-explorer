"""Shared helper functions used by the Python feature-selection models.

Only helpers that are actually required by the web runtime live here.  The
original project utility module bundled plotting, datasets, classifiers and
TensorFlow/Keras imports together; RFAE only depends on ``top_k_keepWeights_1``.
Keeping this helper small avoids pulling unrelated optional dependencies into
RFAE and gives the backend one canonical implementation of the top-k mask.
"""
from __future__ import annotations

import numpy as np


def top_k_keepWeights_1(p_arr_: np.ndarray, p_top_k_: int) -> np.ndarray:
    """Return the binary positive top-k mask used by RFAE."""
    top_k_idx = p_arr_.argsort()[::-1][:p_top_k_]

    result = np.zeros_like(p_arr_)
    if np.sum(p_arr_ > 0) > p_top_k_:
        result[top_k_idx] = 1
    else:
        result = np.where(p_arr_ <= 0, 0, 1)
    return result


__all__ = ["top_k_keepWeights_1"]
