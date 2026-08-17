import type { ClassifierId } from "./datasets";
import { FIXED_SEED } from "./reproducibility";

/**
 * Lightweight classifiers used to validate the selected feature subset.
 * Both classifiers support binary and multiclass targets. Random Forest uses
 * multiclass Gini directly; Gradient Boosting uses one-vs-rest class scores.
 * Metrics are macro-averaged so every class contributes equally.
 */

type Matrix = number[][];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Node {
  feature?: number;
  threshold?: number;
  left?: Node;
  right?: Node;
  value?: number;
}

/** Binary Gini impurity. Multiclass models train one binary scorer per class. */
function gini(labels: number[]): number {
  if (labels.length === 0) return 0;
  const pos = labels.filter((l) => l > 0).length / labels.length;
  return 1 - pos * pos - (1 - pos) * (1 - pos);
}

function buildTree(
  X: Matrix,
  y: number[],
  idx: number[],
  features: number[],
  depth: number,
  rand: () => number,
): Node {
  const labels = idx.map((i) => y[i]!);
  const mean = labels.reduce((a, b) => a + b, 0) / labels.length;
  if (depth === 0 || idx.length < 4 || gini(labels) === 0) return { value: mean };

  const tried = features
    .slice()
    .sort(() => rand() - 0.5)
    .slice(0, Math.max(1, Math.round(Math.sqrt(features.length))));

  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;
  const parentImpurity = gini(labels);

  for (const f of tried) {
    const values = idx.map((i) => X[i]![f]!).sort((a, b) => a - b);
    const candidates = [
      values[Math.floor(values.length / 4)]!,
      values[Math.floor(values.length / 2)]!,
      values[Math.floor((3 * values.length) / 4)]!,
    ];
    for (const th of candidates) {
      const left = idx.filter((i) => X[i]![f]! <= th);
      const right = idx.filter((i) => X[i]![f]! > th);
      if (left.length === 0 || right.length === 0) continue;
      const gain =
        parentImpurity -
        (left.length / idx.length) * gini(left.map((i) => y[i]!)) -
        (right.length / idx.length) * gini(right.map((i) => y[i]!));
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = th;
      }
    }
  }

  if (bestFeature < 0) return { value: mean };
  const left = idx.filter((i) => X[i]![bestFeature]! <= bestThreshold);
  const right = idx.filter((i) => X[i]![bestFeature]! > bestThreshold);
  return {
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildTree(X, y, left, features, depth - 1, rand),
    right: buildTree(X, y, right, features, depth - 1, rand),
  };
}

function predictTree(node: Node, x: number[]): number {
  let current = node;
  while (current.value === undefined) {
    current = x[current.feature!]! <= current.threshold! ? current.left! : current.right!;
  }
  return current.value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function uniqueClasses(y: number[]): number[] {
  return [...new Set(y)].sort((a, b) => a - b);
}

function argMax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! > values[best]!) best = i;
  }
  return best;
}

function trainBinaryPredictor(
  X: Matrix,
  y: number[],
  model: ClassifierId,
  seed: number,
): (x: number[]) => number {
  const rand = mulberry32(seed);
  const features = [...Array(X[0]!.length).keys()];

  if (model === "rf") {
    const trees: Node[] = [];
    for (let t = 0; t < 60; t++) {
      const idx = Array.from({ length: X.length }, () => Math.floor(rand() * X.length));
      trees.push(buildTree(X, y, idx, features, 4, rand));
    }
    return (x) => clamp01(trees.reduce((a, tree) => a + predictTree(tree, x), 0) / trees.length);
  }

  const lr = 0.15;
  const base = y.reduce((a, b) => a + b, 0) / y.length;
  const preds = new Array<number>(X.length).fill(base);
  const stumps: Node[] = [];
  const idx = [...Array(X.length).keys()];
  for (let m = 0; m < 80; m++) {
    const residual = y.map((v, i) => v - preds[i]!);
    const stump = buildTree(X, residual, idx, features, 2, rand);
    stumps.push(stump);
    for (let i = 0; i < X.length; i++) preds[i] = preds[i]! + lr * predictTree(stump, X[i]!);
  }
  return (x) => {
    let p = base;
    for (const stump of stumps) p += lr * predictTree(stump, x);
    return clamp01(p);
  };
}

interface ScorePredictor {
  classes: number[];
  predictScores: (x: number[]) => number[];
}

interface ClassNode {
  feature?: number;
  threshold?: number;
  left?: ClassNode;
  right?: ClassNode;
  probabilities?: number[];
}

function multiclassGini(labels: number[], classCount: number): number {
  if (labels.length === 0) return 0;
  const counts = new Array<number>(classCount).fill(0);
  for (const label of labels) counts[label] = counts[label]! + 1;
  return 1 - counts.reduce((sum, count) => sum + (count / labels.length) ** 2, 0);
}

function classDistribution(labels: number[], classCount: number): number[] {
  const counts = new Array<number>(classCount).fill(0);
  for (const label of labels) counts[label] = counts[label]! + 1;
  return counts.map((count) => count / Math.max(1, labels.length));
}

function buildClassTree(
  X: Matrix,
  y: number[],
  idx: number[],
  features: number[],
  depth: number,
  rand: () => number,
  classCount: number,
): ClassNode {
  const labels = idx.map((i) => y[i]!);
  const parentImpurity = multiclassGini(labels, classCount);
  if (depth === 0 || idx.length < 4 || parentImpurity === 0) {
    return { probabilities: classDistribution(labels, classCount) };
  }

  const tried = features
    .slice()
    .sort(() => rand() - 0.5)
    .slice(0, Math.max(1, Math.round(Math.sqrt(features.length))));

  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const f of tried) {
    const values = idx.map((i) => X[i]![f]!).sort((a, b) => a - b);
    const candidates = [
      values[Math.floor(values.length / 4)]!,
      values[Math.floor(values.length / 2)]!,
      values[Math.floor((3 * values.length) / 4)]!,
    ];
    for (const th of candidates) {
      const left = idx.filter((i) => X[i]![f]! <= th);
      const right = idx.filter((i) => X[i]![f]! > th);
      if (left.length === 0 || right.length === 0) continue;
      const gain =
        parentImpurity -
        (left.length / idx.length) * multiclassGini(left.map((i) => y[i]!), classCount) -
        (right.length / idx.length) * multiclassGini(right.map((i) => y[i]!), classCount);
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = th;
      }
    }
  }

  if (bestFeature < 0) return { probabilities: classDistribution(labels, classCount) };
  const left = idx.filter((i) => X[i]![bestFeature]! <= bestThreshold);
  const right = idx.filter((i) => X[i]![bestFeature]! > bestThreshold);
  return {
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildClassTree(X, y, left, features, depth - 1, rand, classCount),
    right: buildClassTree(X, y, right, features, depth - 1, rand, classCount),
  };
}

function predictClassTree(node: ClassNode, x: number[]): number[] {
  let current = node;
  while (current.probabilities === undefined) {
    current = x[current.feature!]! <= current.threshold! ? current.left! : current.right!;
  }
  return current.probabilities;
}

function trainMulticlassRandomForest(
  X: Matrix,
  y: number[],
  classes: number[],
  seed: number,
): ScorePredictor {
  const rand = mulberry32(seed);
  const features = [...Array(X[0]!.length).keys()];
  const classIndex = new Map(classes.map((label, index) => [label, index]));
  const encoded = y.map((label) => classIndex.get(label)!);
  const trees: ClassNode[] = [];
  for (let t = 0; t < 60; t++) {
    const idx = Array.from({ length: X.length }, () => Math.floor(rand() * X.length));
    trees.push(buildClassTree(X, encoded, idx, features, 4, rand, classes.length));
  }

  return {
    classes,
    predictScores: (x) => {
      const scores = new Array<number>(classes.length).fill(0);
      for (const tree of trees) {
        const probs = predictClassTree(tree, x);
        for (let i = 0; i < scores.length; i++) scores[i] = scores[i]! + probs[i]!;
      }
      return scores.map((score) => score / trees.length);
    },
  };
}

/** Train one binary score model per class and return class scores. */
function trainScorePredictor(
  X: Matrix,
  y: number[],
  model: ClassifierId,
  seed = FIXED_SEED,
): ScorePredictor {
  const classes = uniqueClasses(y);
  if (classes.length < 2) throw new Error("La clasificación necesita al menos dos clases.");

  if (model === "rf") return trainMulticlassRandomForest(X, y, classes, seed);

  const predictors = classes.map((classValue, classIndex) =>
    trainBinaryPredictor(
      X,
      y.map((value) => (value === classValue ? 1 : 0)),
      model,
      seed + classIndex * 1009,
    ),
  );

  return {
    classes,
    predictScores: (x) => predictors.map((predict) => predict(x)),
  };
}

export interface PerClassMetrics {
  label: number;
  support: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ClassificationResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  folds: number;
  classes: number[];
  averaging: "macro";
  confusion: { labels: number[]; matrix: number[][] };
  perClass: PerClassMetrics[];
}

function shuffled(indices: number[], rand: () => number): number[] {
  const out = indices.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Stratified k-fold cross-validation on the selected feature subset. */
export function crossValidate(
  X: Matrix,
  y: number[],
  model: ClassifierId,
  folds = 5,
): ClassificationResult {
  const n = X.length;
  const classes = uniqueClasses(y);
  if (classes.length < 2) throw new Error("La clasificación necesita al menos dos clases.");

  const classCounts = classes.map((label) => y.filter((value) => value === label).length);
  const minClassCount = Math.min(...classCounts);
  if (minClassCount < 2) {
    throw new Error("Cada clase necesita al menos 2 muestras para validación cruzada estratificada.");
  }

  const k = Math.max(2, Math.min(folds, minClassCount, n));
  const assignment = new Array<number>(n).fill(-1);
  const rand = mulberry32(FIXED_SEED + 500);

  // Distribute every class independently across folds (true stratification).
  for (const label of classes) {
    const members = shuffled(
      [...Array(n).keys()].filter((i) => y[i] === label),
      rand,
    );
    members.forEach((sample, position) => {
      assignment[sample] = position % k;
    });
  }

  const classIndex = new Map(classes.map((label, index) => [label, index]));
  const confusion = Array.from({ length: classes.length }, () =>
    new Array<number>(classes.length).fill(0),
  );

  for (let fold = 0; fold < k; fold++) {
    const trainIdx = [...Array(n).keys()].filter((i) => assignment[i] !== fold);
    const testIdx = [...Array(n).keys()].filter((i) => assignment[i] === fold);
    if (testIdx.length === 0) continue;

    const Xtr = trainIdx.map((i) => X[i]!);
    const ytr = trainIdx.map((i) => y[i]!);
    const Xte = testIdx.map((i) => X[i]!);
    const yte = testIdx.map((i) => y[i]!);
    const predict = trainPredictor(Xtr, ytr, model, FIXED_SEED + fold);
    const yhat = Xte.map(predict);

    yhat.forEach((predicted, i) => {
      const actual = yte[i]!;
      const row = classIndex.get(actual);
      const col = classIndex.get(predicted);
      if (row !== undefined && col !== undefined) confusion[row]![col] = confusion[row]![col]! + 1;
    });
  }

  const total = confusion.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
  const correct = confusion.reduce((sum, row, i) => sum + row[i]!, 0);
  const accuracy = correct / Math.max(1, total);

  const perClass: PerClassMetrics[] = classes.map((label, i) => {
    const tp = confusion[i]![i]!;
    const fp = confusion.reduce((sum, row, r) => sum + (r === i ? 0 : row[i]!), 0);
    const fn = confusion[i]!.reduce((sum, value, c) => sum + (c === i ? 0 : value), 0);
    const support = confusion[i]!.reduce((sum, value) => sum + value, 0);
    const precision = tp / Math.max(1, tp + fp);
    const recall = tp / Math.max(1, tp + fn);
    const f1 = (2 * precision * recall) / Math.max(1e-9, precision + recall);
    return { label, support, precision, recall, f1 };
  });

  const macro = (key: "precision" | "recall" | "f1") =>
    perClass.reduce((sum, metrics) => sum + metrics[key], 0) / perClass.length;

  return {
    accuracy,
    precision: macro("precision"),
    recall: macro("recall"),
    f1: macro("f1"),
    folds: k,
    classes,
    averaging: "macro",
    confusion: { labels: classes, matrix: confusion },
    perClass,
  };
}

/** Train a model on all rows and return the predicted class label. */
export function trainPredictor(
  X: Matrix,
  y: number[],
  model: ClassifierId,
  seed = FIXED_SEED,
): (x: number[]) => number {
  const scorer = trainScorePredictor(X, y, model, seed);
  return (x) => scorer.classes[argMax(scorer.predictScores(x))]!;
}

export interface ShapSample {
  /** Signed SHAP value for this sample/feature pair. */
  value: number;
  /** Feature value of the sample, normalized to 0..1 for colouring. */
  featureValue: number;
}

/**
 * Sampling-based (permutation) Shapley values — model-agnostic estimator.
 * For multiclass problems each sample explains the score of the class that the
 * fitted model predicts for that sample.
 */
export function shapValues(
  X: Matrix,
  y: number[],
  model: ClassifierId,
  opts: { explain?: number; permutations?: number } = {},
): ShapSample[][] {
  const scorer = trainScorePredictor(X, y, model);
  const p = X[0]!.length;
  const rand = mulberry32(FIXED_SEED + 1000);
  const nExplain = Math.min(opts.explain ?? 40, X.length);
  const nPerm = opts.permutations ?? 16;

  const mins = new Array<number>(p).fill(Infinity);
  const maxs = new Array<number>(p).fill(-Infinity);
  for (const row of X) {
    for (let j = 0; j < p; j++) {
      if (row[j]! < mins[j]!) mins[j] = row[j]!;
      if (row[j]! > maxs[j]!) maxs[j] = row[j]!;
    }
  }

  const out: ShapSample[][] = [];
  for (let s = 0; s < nExplain; s++) {
    const x = X[Math.floor((s * X.length) / nExplain)]!;
    const targetClassIndex = argMax(scorer.predictScores(x));
    const phi = new Array<number>(p).fill(0);

    for (let t = 0; t < nPerm; t++) {
      const background = X[Math.floor(rand() * X.length)]!;
      const order = [...Array(p).keys()].sort(() => rand() - 0.5);
      const current = background.slice();
      let prev = scorer.predictScores(current)[targetClassIndex]!;
      for (const j of order) {
        current[j] = x[j]!;
        const next = scorer.predictScores(current)[targetClassIndex]!;
        phi[j] = phi[j]! + (next - prev);
        prev = next;
      }
    }

    out.push(
      phi.map((v, j) => ({
        value: v / nPerm,
        featureValue: (x[j]! - mins[j]!) / Math.max(1e-9, maxs[j]! - mins[j]!),
      })),
    );
  }
  return out;
}
