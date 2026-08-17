# OmicsLab Feature Explorer

Aplicación web para ejecutar métodos de **selección no supervisada de características** sobre datos ómicos de alta dimensión y validar el subconjunto seleccionado con clasificadores.

## Arquitectura

La implementación científica de los modelos vive únicamente en Python:

```text
React / TanStack Start
        │
        ▼
src/lib/analysis.functions.ts
        │
        ▼
src/lib/pipeline.server.ts
        │
        ▼
src/lib/python-models.server.ts
        │ JSON stdin/stdout
        ▼
python/runner.py
        │
        ▼
python/models/registry.py       # solo despacho/configuración
        │
        ├── MCFS.py
        ├── NDFS.py
        ├── AEFS.py
        ├── DGA.py
        ├── DRAE.py
        ├── RFAE.py
        └── SMLAE.py
```

No hay ports de los algoritmos de selección de características en TypeScript ni clases `*Adapter` que reimplementen una segunda interfaz sobre los modelos.

## Modelos

- MCFS — Multi-Cluster Feature Selection
- NDFS — Nonnegative Discriminative Feature Selection
- AEFS — Autoencoder Inspired Feature Selection
- DGA — Differentiable Gated Autoencoder
- DRAE — Deep Robust Autoencoder
- RFAE — Robust Feature AutoEncoder
- SMLAE — Sparse Manifold Learning AutoEncoder

`python/models/construct_W.py` es la única implementación del grafo de afinidad usado por MCFS/NDFS.

`python/models/Functions.py` contiene la función `top_k_keepWeights_1` suministrada para RFAE; `RFAE.py` la importa directamente y no mantiene otra copia NumPy de esa función.

## Instalación

### JavaScript

```bash
npm install
npm run dev
```

### Python

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r python/requirements.txt
```

Para indicar el intérprete Python usado por el servidor:

```bash
export OMICSLAB_PYTHON=/ruta/a/.venv/bin/python
npm run dev
```

## Protocolo Python

`python/runner.py` recibe un JSON por `stdin`, ejecuta el modelo solicitado mediante `python/models/registry.py` y devuelve un score por feature, el ranking descendente y el seed usado por `stdout`. Los mensajes de entrenamiento se redirigen a `stderr` para no romper la respuesta JSON.

## Reproducibilidad

Todas las ejecuciones usan un **seed global fijo de 42**. El servidor fija `PYTHONHASHSEED`, NumPy, Python `random`, PyTorch y TensorFlow/Keras, activa operaciones deterministas cuando el framework lo permite y desactiva fuentes de aleatoriedad innecesarias como el orden de validación de RFAE. El clasificador y el estimador SHAP usan igualmente secuencias pseudoaleatorias derivadas del seed 42.

Con el mismo dataset, modelo y parámetros, una nueva pulsación de `RUN` debe producir el mismo ranking y los mismos scores.

## Datasets

Los datasets integrados se conservan **una sola vez** como archivos `.mat` en `python/datasets/`. `python/dataset_runner.py` los carga con SciPy y entrega `X`, `Y` y los nombres de feature al servidor; no hay copias JSON de los datasets.

El repositorio incluye Colon y los 15 datasets suministrados en `data.zip`: Madelon, USPS, GLI-85, ORL Raws 10P, COIL20, Pixraw 10P, GLIOMA, Isolet, Leukemia, BASEHOCK, Lymphoma, Lung Small, SMK-CAN-187, PCMAC y RELATHE.

Los CSV subidos deben representar muestras por filas y features por columnas. Si incluyen etiquetas, la interfaz reconoce una columna `y`, `label`, `class` o `target`. Las etiquetas pueden ser numéricas o categóricas de texto y se codifican internamente.

La validación con Random Forest / Gradient Boosting admite clasificación binaria y multiclase. `Accuracy` se calcula globalmente y `Precision`, `Recall` y `F1` se muestran como promedio **macro** entre clases, de modo que cada categoría pesa por igual. La validación cruzada es estratificada (hasta 5 folds, limitada por el tamaño de la clase minoritaria).

## Build

```bash
npm run build
```

En producción, el proceso del servidor debe tener acceso a `python/` y a un entorno con las dependencias de `python/requirements.txt` instaladas.
