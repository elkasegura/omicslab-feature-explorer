export interface DatasetMeta {
  id: string;
  name: string;
  omics: string;
  samples: number;
  features: number;
  classes: string;
  file: string;
  description: string;
}

export const DATASETS: DatasetMeta[] = [
  {
    id: "colon",
    name: "Colon Cancer",
    omics: "Transcriptomics (microarray)",
    samples: 62,
    features: 2000,
    classes: "-1 (40) / 1 (22)",
    file: "python/datasets/colon.mat",
    description: "Gene-expression benchmark included with the original project.",
  },
  {
    id: "madelon",
    name: "Madelon",
    omics: "Benchmark dataset (.mat)",
    samples: 2600,
    features: 500,
    classes: "-1 (1300) / 1 (1300)",
    file: "python/datasets/madelon.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "usps",
    name: "USPS",
    omics: "Benchmark dataset (.mat)",
    samples: 9298,
    features: 256,
    classes: "10 classes",
    file: "python/datasets/USPS.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "gli-85",
    name: "GLI-85",
    omics: "Benchmark dataset (.mat)",
    samples: 85,
    features: 22283,
    classes: "1 (26) / 2 (59)",
    file: "python/datasets/GLI-85.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "orlraws10p",
    name: "ORL Raws 10P",
    omics: "Benchmark dataset (.mat)",
    samples: 100,
    features: 10304,
    classes: "10 classes",
    file: "python/datasets/orlraws10P.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "coil20",
    name: "COIL20",
    omics: "Benchmark dataset (.mat)",
    samples: 1440,
    features: 1024,
    classes: "20 classes",
    file: "python/datasets/COIL20.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "pixraw10p",
    name: "Pixraw 10P",
    omics: "Benchmark dataset (.mat)",
    samples: 100,
    features: 10000,
    classes: "10 classes",
    file: "python/datasets/pixraw10P.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "glioma",
    name: "GLIOMA",
    omics: "Benchmark dataset (.mat)",
    samples: 50,
    features: 4434,
    classes: "4 classes",
    file: "python/datasets/GLIOMA.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "isolet",
    name: "Isolet",
    omics: "Benchmark dataset (.mat)",
    samples: 1560,
    features: 617,
    classes: "26 classes",
    file: "python/datasets/Isolet.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "leukemia",
    name: "Leukemia",
    omics: "Benchmark dataset (.mat)",
    samples: 72,
    features: 7070,
    classes: "-1 (47) / 1 (25)",
    file: "python/datasets/leukemia.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "basehock",
    name: "BASEHOCK",
    omics: "Benchmark dataset (.mat)",
    samples: 1993,
    features: 4862,
    classes: "1 (994) / 2 (999)",
    file: "python/datasets/BASEHOCK.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "lymphoma",
    name: "Lymphoma",
    omics: "Benchmark dataset (.mat)",
    samples: 96,
    features: 4026,
    classes: "9 classes",
    file: "python/datasets/lymphoma.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "lung-small",
    name: "Lung Small",
    omics: "Benchmark dataset (.mat)",
    samples: 73,
    features: 325,
    classes: "7 classes",
    file: "python/datasets/lung_small.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "smk-can-187",
    name: "SMK-CAN-187",
    omics: "Benchmark dataset (.mat)",
    samples: 187,
    features: 19993,
    classes: "1 (90) / 2 (97)",
    file: "python/datasets/SMK-CAN-187.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "pcmac",
    name: "PCMAC",
    omics: "Benchmark dataset (.mat)",
    samples: 1943,
    features: 3289,
    classes: "1 (982) / 2 (961)",
    file: "python/datasets/PCMAC.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
  {
    id: "relathe",
    name: "RELATHE",
    omics: "Benchmark dataset (.mat)",
    samples: 1427,
    features: 4322,
    classes: "1 (779) / 2 (648)",
    file: "python/datasets/RELATHE.mat",
    description: "Dataset supplied in data.zip, stored as X (samples × features) and Y (class labels).",
  },
];

export interface ModelParameterMeta {
  id: string;
  label: string;
  defaultValue: number | string;
  type?: "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

interface FeatureSelectionModelDefinition {
  name: string;
  full: string;
  description: string;
  usesClusters: boolean;
  usesEpochs: boolean;
  defaultEpochs?: number;
  dependency?: string;
  parameters: ModelParameterMeta[];
}

const MODEL_DEFINITIONS = {
  mcfs: {
    name: "MCFS",
    full: "Multi-Cluster Feature Selection",
    description:
      "Spectral multi-cluster feature selection with an affinity graph and L1-regularized regressions. Implemented as a Python class with the common model interface.",
    usesClusters: true,
    usesEpochs: false,
    parameters: [],
  },
  ndfs: {
    name: "NDFS",
    full: "Nonnegative Discriminative Feature Selection",
    description:
      "Unsupervised spectral feature selection using nonnegative pseudo-labels, graph regularization and an L2,1 penalty.",
    usesClusters: true,
    usesEpochs: false,
    parameters: [
      { id: "alpha", label: "alpha", defaultValue: 1, type: "number", min: 0, step: 0.001 },
      { id: "beta", label: "beta", defaultValue: 1, type: "number", min: 0, step: 0.001 },
      { id: "gamma", label: "gamma", defaultValue: 1e9, type: "number", min: 0, step: 1 },
    ],
  },
  aefs: {
    name: "AEFS",
    full: "Autoencoder Inspired Feature Selection",
    description:
      "One-hidden-layer autoencoder with row-wise L2,1 sparsity on encoder weights and proximal optimization.",
    usesClusters: false,
    usesEpochs: true,
    defaultEpochs: 100,
    parameters: [
      { id: "hidden", label: "Hidden", defaultValue: 128, type: "number", min: 1, step: 1 },
      { id: "alpha", label: "alpha", defaultValue: 0.01, type: "number", min: 0, step: 0.001 },
      { id: "beta", label: "beta", defaultValue: 0.01, type: "number", min: 0, step: 0.001 },
      { id: "lr", label: "Learning rate", defaultValue: 0.001, type: "number", min: 0.000001, step: 0.0001 },
    ],
  },
  dga: {
    name: "DGA",
    full: "Differentiable Gated Autoencoder",
    description:
      "Autoencoder with stochastic differentiable gates and a regularized objective for unsupervised feature selection.",
    usesClusters: false,
    usesEpochs: true,
    defaultEpochs: 50,
    parameters: [
      { id: "hidden", label: "Hidden", defaultValue: 20, type: "number", min: 1, step: 1 },
      { id: "gamma", label: "gamma", defaultValue: 0.1, type: "number", min: 0, step: 0.001 },
      { id: "lam", label: "lambda", defaultValue: 0.1, type: "number", min: 0, step: 0.001 },
      { id: "lr", label: "Learning rate", defaultValue: 0.001, type: "number", min: 0.000001, step: 0.0001 },
      { id: "optimizer", label: "Optimizer", defaultValue: "sgd", type: "select", options: ["sgd", "adam"] },
    ],
  },
  drae: {
    name: "DRAE",
    full: "Deep Robust Autoencoder",
    description:
      "Robust autoencoder feature selection coupled to a clustering objective and L2,1 regularization.",
    usesClusters: true,
    usesEpochs: true,
    defaultEpochs: 100,
    parameters: [
      { id: "d_hidden", label: "Hidden", defaultValue: 10, type: "number", min: 1, step: 1 },
      { id: "alpha", label: "alpha", defaultValue: 1e8, type: "number", min: 0, step: 1 },
      { id: "beta", label: "beta", defaultValue: 0.001, type: "number", min: 0, step: 0.001 },
      { id: "gamma", label: "gamma", defaultValue: 0.01, type: "number", min: 0, step: 0.001 },
      { id: "zeta", label: "zeta", defaultValue: 100, type: "number", min: 0, step: 0.1 },
      { id: "lam", label: "lambda", defaultValue: 10000, type: "number", min: 0, step: 1 },
    ],
  },
  rfae: {
    name: "RFAE",
    full: "Robust Feature AutoEncoder",
    description:
      "Learns trainable feature weights, progressively reduces the active feature window and reconstructs the input.",
    usesClusters: false,
    usesEpochs: true,
    defaultEpochs: 100,
    parameters: [
      { id: "batch_size", label: "Batch size", defaultValue: 16, type: "number", min: 1, step: 1 },
    ],
  },
  smlae: {
    name: "SMLAE",
    full: "Sparse Manifold Learning AutoEncoder",
    description:
      "Sparse autoencoder feature selection with sample-manifold and latent-structure regularization.",
    usesClusters: true,
    usesEpochs: true,
    defaultEpochs: 100,
    parameters: [
      { id: "d_hidden", label: "Hidden", defaultValue: 20, type: "number", min: 1, step: 1 },
      { id: "n_neighbors", label: "Neighbors", defaultValue: 5, type: "number", min: 1, step: 1 },
      { id: "alpha", label: "alpha", defaultValue: 1e-6, type: "number", min: 0, step: 0.000001 },
      { id: "beta", label: "beta", defaultValue: 0.001, type: "number", min: 0, step: 0.001 },
      { id: "gamma", label: "gamma", defaultValue: 0.001, type: "number", min: 0, step: 0.001 },
      { id: "omega", label: "omega", defaultValue: 0.001, type: "number", min: 0, step: 0.001 },
      { id: "rho1", label: "rho1", defaultValue: 1e-6, type: "number", min: 0, step: 0.000001 },
      { id: "rho2", label: "rho2", defaultValue: 1e-6, type: "number", min: 0, step: 0.000001 },
    ],
  },
} satisfies Record<string, FeatureSelectionModelDefinition>;

export type FeatureSelectionModelId = keyof typeof MODEL_DEFINITIONS;

export interface FeatureSelectionModelMeta extends FeatureSelectionModelDefinition {
  id: FeatureSelectionModelId;
}

export const FEATURE_SELECTION_MODEL_IDS = Object.keys(MODEL_DEFINITIONS) as [
  FeatureSelectionModelId,
  ...FeatureSelectionModelId[],
];

export const MODELS: FeatureSelectionModelMeta[] = FEATURE_SELECTION_MODEL_IDS.map((id) => ({
  id,
  ...MODEL_DEFINITIONS[id],
}));



export const CLASSIFIERS = [
  { id: "rf", name: "Random Forest" },
  { id: "xgboost", name: "Gradient Boosting" },
] as const;

export type ClassifierId = (typeof CLASSIFIERS)[number]["id"];

export const CLASSIFIER_IDS = CLASSIFIERS.map((classifier) => classifier.id) as [
  ClassifierId,
  ...ClassifierId[],
];
