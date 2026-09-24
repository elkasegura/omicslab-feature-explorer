import { crossValidate, shapValues } from "./classifiers.server";
import { runPythonFeatureSelection } from "./python-models.server";
import { DATASETS, type ClassifierId, type FeatureSelectionModelId } from "./datasets";
import { loadMatDataset } from "./dataset-loader.server";


function standardize(X: number[][]): number[][] {
  const n = X.length;
  const p = X[0]!.length;
  const means = Array.from({ length: p }, (_, j) =>
    X.reduce((sum, row) => sum + row[j]!, 0) / n,
  );
  const stds = means.map((mean, j) => {
    const variance =
      X.reduce((sum, row) => sum + (row[j]! - mean) ** 2, 0) / Math.max(1, n - 1);
    return Math.sqrt(variance) || 1;
  });
  return X.map((row) => row.map((value, j) => (value - means[j]!) / stds[j]!));
}

export interface Dataset {
  X: number[][];
  y: number[];
  features: string[];
}

function encodeLabels(values: number[]): number[] {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const mapping = new Map(unique.map((value, index) => [value, index]));
  return values.map((value) => mapping.get(value) ?? 0);
}

export async function loadDataset(id: string): Promise<Dataset> {
  const meta = DATASETS.find((dataset) => dataset.id === id);
  if (!meta) throw new Error(`Dataset desconocido: ${id}`);

  const loaded = await loadMatDataset(meta.file.replace(/^python\/datasets\//, ""));
  return {
    X: loaded.X,
    y: encodeLabels(loaded.y),
    features: loaded.features,
  };
}

export function normalizeUploadedLabels(values: number[]): number[] {
  return encodeLabels(values);
}

export interface SelectedFeature {
  index: number;
  name: string;
  score: number;
}

export interface AnalysisOutput {
  datasetName: string;
  model: FeatureSelectionModelId;
  samples: number;
  totalFeatures: number;
  selected: SelectedFeature[];
  elapsedMs: number;
  seed: number;
}

export async function runFeatureSelection(input: {
  dataset: Dataset;
  datasetName: string;
  model: FeatureSelectionModelId;
  nFeatures: number;
  nClusters: number;
  epochs?: number;
  modelParams?: Record<string, number | string | boolean | null>;
}): Promise<AnalysisOutput> {
  const started = Date.now();
  const { dataset, nFeatures } = input;
  const result = await runPythonFeatureSelection({
  model: input.model,
  X: dataset.X,
  y: dataset.y,
  nFeatures,
  nClusters: input.nClusters,
  ...(input.epochs !== undefined
    ? { epochs: input.epochs }
    : {}),
  ...(input.modelParams !== undefined
    ? { params: input.modelParams }
    : {}),
  });

  const selected = result.ranking.slice(0, nFeatures).map((index) => ({
    index,
    name: dataset.features[index] ?? `feature_${index + 1}`,
    score: result.scores[index] ?? 0,
  }));

  return {
    datasetName: input.datasetName,
    model: input.model,
    samples: dataset.X.length,
    totalFeatures: dataset.X[0]!.length,
    selected,
    elapsedMs: Date.now() - started,
    seed: result.seed,
  };
}

export function runClassification(input: {
  dataset: Dataset;
  featureIndices: number[];
  model: ClassifierId;
}) {
  const sub = input.dataset.X.map((row) => input.featureIndices.map((j) => row[j]!));
  const Z = standardize(sub);
  const metrics = crossValidate(Z, input.dataset.y, input.model);
  const matrix = shapValues(Z, input.dataset.y, input.model);

  const shap = input.featureIndices
    .map((globalIdx, local) => {
      const points = matrix.map((row) => ({
        value: row[local]!.value,
        featureValue: row[local]!.featureValue,
      }));
      const meanAbs = points.reduce((a, s) => a + Math.abs(s.value), 0) / Math.max(1, points.length);
      return {
        index: globalIdx,
        name: input.dataset.features[globalIdx] ?? `feature_${globalIdx + 1}`,
        meanAbs,
        points,
      };
    })
    .sort((a, b) => b.meanAbs - a.meanAbs);

  const shapScore = shap.reduce((a, f) => a + f.meanAbs, 0) / Math.max(1, shap.length);
  return { ...metrics, shap, shapScore };
}
