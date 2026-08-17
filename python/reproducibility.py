"""Deterministic execution helpers shared by every Python model run."""
from __future__ import annotations

import os
import random
import sys

DEFAULT_SEED = int(os.environ.get("OMICSLAB_SEED", "42"))

# These must be set before TensorFlow/PyTorch initialize their backends.
os.environ.setdefault("PYTHONHASHSEED", str(DEFAULT_SEED))
os.environ.setdefault("TF_DETERMINISTIC_OPS", "1")
os.environ.setdefault("TF_CUDNN_DETERMINISTIC", "1")
os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")


def set_global_seed(seed: int = DEFAULT_SEED) -> int:
    """Seed every RNG currently available and request deterministic kernels."""
    seed = int(seed)
    random.seed(seed)

    import numpy as np

    np.random.seed(seed)

    if "torch" in sys.modules:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        try:
            torch.use_deterministic_algorithms(True)
        except Exception:
            # Older torch/platform combinations may not expose this uniformly.
            pass
        if hasattr(torch.backends, "cudnn"):
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
        try:
            torch.set_num_threads(1)
        except RuntimeError:
            pass
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass

    if "tensorflow" in sys.modules:
        import tensorflow as tf

        tf.keras.utils.set_random_seed(seed)
        try:
            tf.config.experimental.enable_op_determinism()
        except Exception:
            pass

    return seed
