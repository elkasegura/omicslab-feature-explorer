import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CLASSIFIERS, DATASETS, MODELS } from "@/lib/datasets";
import { classifyWithFeatures, selectFeatures } from "@/lib/analysis.functions";

export const Route = createFileRoute("/analyses")({
  head: () => ({
    meta: [
      { title: "Analyses — Feature selection models | OmicsLab" },
      {
        name: "description",
        content:
          "Pick an omics dataset or upload your own CSV, run one of the available unsupervised feature-selection models, then validate the selected subset and inspect SHAP values.",
      },
      { property: "og:title", content: "Analyses — OmicsLab" },
      {
        property: "og:description",
        content: "Run unsupervised feature selection and validate the selected subset.",
      },
    ],
  }),
  component: AnalysesPage,
});

interface Upload {
  name: string;
  features: string[];
  X: number[][];
  y?: number[] | undefined;
}

function defaultModelParams(modelId: (typeof MODELS)[number]["id"]): Record<string, number | string> {
  const meta = MODELS.find((m) => m.id === modelId);
  return Object.fromEntries((meta?.parameters ?? []).map((p) => [p.id, p.defaultValue]));
}

function parseCsv(text: string, name: string): Upload {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 3) throw new Error("The CSV needs at least 3 rows.");
  const split = (line: string) => line.split(/[,;\t]/).map((c) => c.trim());
  const first = split(lines[0]!);
  const headerIsText = first.some((c) => c !== "" && Number.isNaN(Number(c)));
  const header = headerIsText ? first : first.map((_, i) => `feature_${i + 1}`);
  const rows = (headerIsText ? lines.slice(1) : lines).map(split);

  const labelIdx = header.findIndex((h) => /^(y|label|class|target)$/i.test(h));
  const featureIdx = header.map((_, i) => i).filter((i) => i !== labelIdx);

  const X = rows.map((r) => featureIdx.map((i) => Number(r[i] ?? 0) || 0));
  let y: number[] | undefined;
  if (labelIdx >= 0) {
    const rawLabels = rows.map((r) => (r[labelIdx] ?? "").trim());
    if (rawLabels.some((label) => label === "")) {
      throw new Error("The label column contains empty values.");
    }
    const numeric = rawLabels.map(Number);
    if (numeric.every(Number.isFinite)) {
      y = numeric;
    } else {
      const mapping = new Map<string, number>();
      y = rawLabels.map((label) => {
        if (!mapping.has(label)) mapping.set(label, mapping.size);
        return mapping.get(label)!;
      });
    }
  }
  if (X[0]!.length < 2) throw new Error("The CSV needs at least 2 feature columns.");
  return { name, features: featureIdx.map((i) => header[i]!), X, y };
}

function AnalysesPage() {
  const [datasetId, setDatasetId] = useState<string>(DATASETS[0]!.id);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [nFeatures, setNFeatures] = useState(10);
  const [nClusters, setNClusters] = useState(5);
  const [model, setModel] = useState<(typeof MODELS)[number]["id"]>(MODELS[0]!.id);
  const [epochs, setEpochs] = useState(MODELS[0]!.defaultEpochs ?? 100);
  const [modelParams, setModelParams] = useState<Record<string, number | string>>(() =>
    defaultModelParams(MODELS[0]!.id),
  );
  const [classifier, setClassifier] = useState<"rf" | "xgboost">("rf");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0]!;

  const runSelection = useServerFn(selectFeatures);
  const runClassifier = useServerFn(classifyWithFeatures);

  const selection = useMutation({
    mutationFn: () =>
      runSelection({
        data: {
          datasetId: upload ? undefined : datasetId,
          upload: upload ?? undefined,
          model,
          nFeatures,
          nClusters,
          epochs: selectedModel.usesEpochs ? epochs : undefined,
          modelParams,
        },
      }),
    onError: (e: Error) => toast.error(e.message || "Feature selection failed"),
  });

  const classification = useMutation({
    mutationFn: (indices: number[]) =>
      runClassifier({
        data: {
          datasetId: upload ? undefined : datasetId,
          upload: upload ?? undefined,
          featureIndices: indices,
          model: classifier,
        },
      }),
    onError: (e: Error) => toast.error(e.message || "Classification failed"),
  });

  const result = selection.data;
  const maxScore = useMemo(
    () => (result ? Math.max(...result.selected.map((s) => s.score), 1e-9) : 1),
    [result],
  );

  const onFile = async (file: File) => {
    try {
      const parsed = parseCsv(await file.text(), file.name);
      setUpload(parsed);
      classification.reset();
      selection.reset();
      toast.success(`${parsed.X.length} samples × ${parsed.features.length} features`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-3xl font-bold">Analyses</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Choose a dataset from the repository or upload your own (CSV: samples × features). Set the
        parameters and run the unsupervised model.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Parameters */}
        <aside className="panel h-fit p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Parameters
          </h2>

          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium">Dataset</legend>
            {DATASETS.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
              >
                <input
                  type="radio"
                  name="dataset"
                  className="accent-[var(--color-primary)]"
                  checked={!upload && datasetId === d.id}
                  onChange={() => {
                    setUpload(null);
                    setDatasetId(d.id);
                    selection.reset();
                    classification.reset();
                  }}
                />
                <span>
                  {d.name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {d.samples}×{d.features}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs text-muted-foreground">OR</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md border border-dashed border-input px-3 py-3 text-sm transition-colors hover:bg-secondary"
            >
              {upload ? `${upload.name} ✓` : "Upload .csv dataset"}
            </button>
            {upload && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {upload.X.length} samples × {upload.features.length} features
                {upload.y ? " · labelled" : " · unlabelled"}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium"># Features</span>
              <input
                type="number"
                min={1}
                max={500}
                value={nFeatures}
                onChange={(e) => setNFeatures(Math.max(1, Math.min(500, Number(e.target.value))))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Model</span>
              <select
                value={model}
                onChange={(e) => {
                  const next = MODELS.find((m) => m.id === e.target.value);
                  if (!next) return;
                  setModel(next.id);
                  if (next.defaultEpochs) setEpochs(next.defaultEpochs);
                  setModelParams(defaultModelParams(next.id));
                  selection.reset();
                  classification.reset();
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.full}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
{selectedModel.description}
              </span>
            </label>

            {selectedModel.usesClusters && (
              <label className="block">
                <span className="text-sm font-medium"># Clusters</span>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={nClusters}
                  onChange={(e) => setNClusters(Math.max(2, Math.min(50, Number(e.target.value))))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            )}

            {selectedModel.usesEpochs && (
              <label className="block">
                <span className="text-sm font-medium">Epochs</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={epochs}
                  onChange={(e) => setEpochs(Math.max(1, Math.min(5000, Number(e.target.value))))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                {selectedModel.dependency && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Extra dependency: {selectedModel.dependency}
                  </span>
                )}
              </label>
            )}

            {selectedModel.parameters.length > 0 && (
              <details className="rounded-md border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Advanced parameters</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {selectedModel.parameters.map((parameter) => (
                    <label key={parameter.id} className="block">
                      <span className="text-xs text-muted-foreground">{parameter.label}</span>
                      {parameter.type === "select" ? (
                        <select
                          value={String(modelParams[parameter.id] ?? parameter.defaultValue)}
                          onChange={(e) =>
                            setModelParams((current) => ({ ...current, [parameter.id]: e.target.value }))
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs"
                        >
                          {(parameter.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={parameter.min}
                          max={parameter.max}
                          step={parameter.step ?? "any"}
                          value={Number(modelParams[parameter.id] ?? parameter.defaultValue)}
                          onChange={(e) =>
                            setModelParams((current) => ({
                              ...current,
                              [parameter.id]: Number(e.target.value),
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </details>
            )}
          </div>

          <button
            onClick={() => {
              classification.reset();
              selection.mutate();
            }}
            disabled={selection.isPending}
            className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {selection.isPending ? "Running…" : "RUN"}
          </button>
        </aside>

        {/* Results */}
        <section className="min-h-[420px]">
          {selection.isPending && <ProgressPanel nFeatures={nFeatures} model={selectedModel.name} />}

          {!selection.isPending && !result && (
            <div className="panel grid h-full min-h-[420px] place-items-center p-10 text-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  No results yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set the parameters and press RUN.
                </p>
              </div>
            </div>
          )}

          {!selection.isPending && result && (
            <div className="space-y-6">
              <div className="panel p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    Selected features ({result.selected.length})
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    {result.datasetName} · {result.model.toUpperCase()} · seed {result.seed} · {result.samples} samples · {result.totalFeatures}{" "}
                    features · {result.elapsedMs} ms
                  </p>
                </div>

                <ul className="mt-5 space-y-2">
                  {result.selected.map((f, i) => (
                    <li key={f.index} className="flex items-center gap-3">
                      <span className="w-6 font-mono text-xs text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="w-40 shrink-0 truncate font-mono text-xs">{f.name}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(3, (f.score / maxScore) * 100)}%` }}
                        />
                      </span>
                      <span className="w-20 text-right font-mono text-xs text-muted-foreground">
                        {f.score.toFixed(4)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel p-6">
                <h2 className="text-lg font-semibold">Classification model</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Validate the subset with stratified cross-validation (up to 5 folds). Binary and
                  multiclass targets are supported; Precision, Recall and F1 use macro averaging.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <select
                    value={classifier}
                    onChange={(e) => setClassifier(e.target.value as "rf" | "xgboost")}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CLASSIFIERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      classification.mutate(result.selected.map((f) => f.index))
                    }
                    disabled={classification.isPending}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {classification.isPending ? "Training…" : "Train and evaluate"}
                  </button>
                </div>

                {classification.data?.unlabeled && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    The uploaded dataset has no label column (y/label/class/target), so the
                    classification cannot be evaluated.
                  </p>
                )}

                {classification.data && classification.data.unlabeled === false && (
                  <>
                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        ["Accuracy", classification.data.accuracy],
                        ["Precision", classification.data.precision],
                        ["Recall", classification.data.recall],
                        ["F1", classification.data.f1],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-lg bg-surface p-4">
                          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-1 font-display text-2xl font-bold">
                            {((value as number) * 100).toFixed(1)}%
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 font-mono text-xs text-muted-foreground">
                      {classification.data.classes.length} classes · {classification.data.folds} folds ·
                      macro-averaged Precision / Recall / F1
                    </p>
                  </>
                )}
              </div>

              {classification.data && classification.data.unlabeled === false && (
                <ShapPanel
                  shap={classification.data.shap}
                  score={classification.data.shapScore}
                  model={CLASSIFIERS.find((c) => c.id === classifier)?.name ?? classifier}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ProgressPanel({ nFeatures, model }: { nFeatures: number; model: string }) {
  const steps = [
    "Preparing samples × features matrix",
    `Running ${model} in the Python model runtime`,
    `Selecting the top ${nFeatures} features`,
    "Preparing scores and ranking for the interface",
  ];
  return (
    <div className="panel p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">
        Progress · running model
      </p>
      <ul className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-primary"
              style={{ animationDelay: `${i * 200}ms` }}
            />
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}

interface ShapFeature {
  index: number;
  name: string;
  meanAbs: number;
  points: { value: number; featureValue: number }[];
}

/** SHAP summary (beeswarm) plot: one row per feature, one dot per sample. */
function ShapPanel({
  shap,
  score,
  model,
}: {
  shap: ShapFeature[];
  score: number;
  model: string;
}) {
  const rowHeight = 34;
  const width = 720;
  const padLeft = 150;
  const padRight = 60;
  const padTop = 16;
  const padBottom = 40;
  const plotWidth = width - padLeft - padRight;
  const height = padTop + shap.length * rowHeight + padBottom;

  const maxAbs = Math.max(
    ...shap.flatMap((f) => f.points.map((p) => Math.abs(p.value))),
    1e-9,
  );
  const xOf = (v: number) => padLeft + plotWidth / 2 + (v / maxAbs) * (plotWidth / 2);
  const ticks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs];

  // Deterministic jitter so dots at similar SHAP values stay readable.
  const jitter = (row: ShapFeature, i: number) => {
    const bucket = Math.round((row.points[i]!.value / maxAbs) * 40);
    let count = 0;
    for (let k = 0; k < i; k++) {
      if (Math.round((row.points[k]!.value / maxAbs) * 40) === bucket) count++;
    }
    const side = count % 2 === 0 ? 1 : -1;
    return side * Math.ceil(count / 2) * 2.6;
  };

  // SHAP's blue -> pink ramp, interpolated in sRGB so no green ever appears.
  const colorOf = (t: number) => {
    const c = Math.max(0, Math.min(1, t));
    const r = Math.round(0 + c * (255 - 0));
    const g = Math.round(139 + c * (0 - 139));
    const b = Math.round(251 + c * (81 - 251));
    return `rgb(${r}, ${g}, ${b})`;
  };


  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Model interpretability · SHAP summary plot</h2>
        <p className="font-mono text-xs text-muted-foreground">{model}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Each dot is one sample. Its position shows how much that feature changed the model score
        for the class predicted for that sample; the colour encodes whether the feature value was
        low or high. This definition also works for multiclass problems. Features are sorted by mean
        absolute SHAP value.
      </p>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Low feature value</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{ background: `linear-gradient(90deg, ${colorOf(0)}, ${colorOf(0.5)}, ${colorOf(1)})` }}
        />
        <span>High feature value</span>
      </div>

      <div className="mt-2 overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="SHAP summary beeswarm plot of the selected features"
          className="min-w-[680px]"
        >
          {/* Gridlines and x-axis ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={xOf(t)}
                x2={xOf(t)}
                y1={padTop}
                y2={height - padBottom}
                stroke="currentColor"
                strokeWidth={t === 0 ? 1.4 : 0.6}
                className={t === 0 ? "text-muted-foreground" : "text-border"}
                opacity={t === 0 ? 0.8 : 0.6}
              />
              <text
                x={xOf(t)}
                y={height - padBottom + 16}
                textAnchor="middle"
                className="fill-muted-foreground font-mono"
                fontSize={10}
              >
                {t.toFixed(3)}
              </text>
            </g>
          ))}
          <text
            x={padLeft + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={11}
          >
            SHAP value (impact on model output)
          </text>

          {/* Feature rows */}
          {shap.map((f, r) => {
            const cy = padTop + r * rowHeight + rowHeight / 2;
            return (
              <g key={f.index}>
                <text
                  x={padLeft - 12}
                  y={cy + 3}
                  textAnchor="end"
                  className="fill-foreground font-mono"
                  fontSize={11}
                >
                  {f.name}
                </text>
                {f.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={xOf(p.value)}
                    cy={cy + jitter(f, i)}
                    r={3}
                    fill={colorOf(p.featureValue)}
                    fillOpacity={0.85}
                  >
                    <title>
                      {`${f.name} — SHAP ${p.value.toFixed(4)}, feature value ${(
                        p.featureValue * 100
                      ).toFixed(0)}% of range`}
                    </title>
                  </circle>
                ))}
                <text
                  x={width - padRight + 10}
                  y={cy + 3}
                  className="fill-muted-foreground font-mono"
                  fontSize={10}
                >
                  {f.meanAbs.toFixed(3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-6 flex items-baseline justify-between rounded-lg bg-surface p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Score</p>
        <p className="font-display text-2xl font-bold">{score.toFixed(4)}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Score = arithmetic mean of the mean absolute SHAP magnitude of the {shap.length} selected
        features.
      </p>
    </div>
  );
}
