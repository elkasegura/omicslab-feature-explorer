import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CLASSIFIER_IDS, FEATURE_SELECTION_MODEL_IDS } from "./datasets";

const csvSchema = z
  .object({
    X: z.array(z.array(z.number())).min(4),
    y: z.array(z.number()).optional(),
    features: z.array(z.string()),
    name: z.string(),
  })
  .optional();

const modelSchema = z.enum(FEATURE_SELECTION_MODEL_IDS);

const selectSchema = z.object({
  datasetId: z.string().optional(),
  upload: csvSchema,
  model: modelSchema.default("mcfs"),
  nFeatures: z.number().int().min(1).max(500),
  nClusters: z.number().int().min(2).max(50).default(5),
  epochs: z.number().int().min(1).max(5000).optional(),
  modelParams: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])).optional(),
});

const classifySchema = z.object({
  datasetId: z.string().optional(),
  upload: csvSchema,
  featureIndices: z.array(z.number().int()).min(1),
  model: z.enum(CLASSIFIER_IDS),
});

async function resolveDataset(
  upload: z.infer<typeof csvSchema>,
  datasetId?: string,
) {
  const pipeline = await import("./pipeline.server");
  const dataset = upload
    ? {
        X: upload.X,
        y: upload.y ? pipeline.normalizeUploadedLabels(upload.y) : upload.X.map(() => 0),
        features: upload.features,
      }
    : await pipeline.loadDataset(datasetId ?? "colon");
  return { dataset, pipeline };
}

export const selectFeatures = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => selectSchema.parse(input))
  .handler(async ({ data }) => {
    const { dataset, pipeline } = await resolveDataset(data.upload, data.datasetId);
    const name = data.upload?.name ?? data.datasetId ?? "colon";
    return pipeline.runFeatureSelection({
      dataset,
      datasetName: name,
      model: data.model,
      nFeatures: Math.min(data.nFeatures, dataset.X[0]!.length),
      nClusters: Math.min(data.nClusters, Math.max(2, dataset.X.length - 1)),
      epochs: data.epochs,
      modelParams: data.modelParams,
    });
  });

export const classifyWithFeatures = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => classifySchema.parse(input))
  .handler(async ({ data }) => {
    const { dataset, pipeline } = await resolveDataset(data.upload, data.datasetId);
    const labels = new Set(dataset.y);
    if (labels.size < 2) {
      return { unlabeled: true as const };
    }
    return {
      unlabeled: false as const,
      ...pipeline.runClassification({
        dataset,
        featureIndices: data.featureIndices,
        model: data.model,
      }),
    };
  });
