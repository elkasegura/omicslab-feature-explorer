import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import type { FeatureSelectionModelId } from "./datasets";
import { FIXED_SEED } from "./reproducibility";

export interface PythonSelectionInput {
  model: FeatureSelectionModelId;
  X: number[][];
  y?: number[];
  nFeatures: number;
  nClusters: number;
  epochs?: number;
  params?: Record<string, number | string | boolean | null>;
}

export interface PythonSelectionOutput {
  model: FeatureSelectionModelId;
  ranking: number[];
  scores: number[];
  seed: number;
}

function resolveRunner(): string {
  const runner = path.resolve(process.cwd(), "python", "runner.py");
  if (!existsSync(runner)) {
    throw new Error(
      "No se encuentra python/runner.py. Ejecuta el servidor desde la raíz del proyecto.",
    );
  }
  return runner;
}

export function runPythonFeatureSelection(input: PythonSelectionInput): Promise<PythonSelectionOutput> {
  const python = process.env.OMICSLAB_PYTHON ?? process.env.PYTHON ?? "python3";
  const runner = resolveRunner();

  return new Promise((resolve, reject) => {
    const child = spawn(python, [runner], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        OMICSLAB_SEED: String(FIXED_SEED),
        PYTHONHASHSEED: String(FIXED_SEED),
        TF_DETERMINISTIC_OPS: "1",
        TF_CUDNN_DETERMINISTIC: "1",
        CUBLAS_WORKSPACE_CONFIG: ":4096:8",
        OMP_NUM_THREADS: "1",
        MKL_NUM_THREADS: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `No se pudo iniciar Python (${python}): ${error.message}. ` +
            "Instala Python y las dependencias de python/requirements.txt.",
        ),
      );
    });
    child.on("close", (code) => {
      let parsed: (PythonSelectionOutput & { error?: string }) | undefined;
      try {
        parsed = JSON.parse(stdout || "{}") as PythonSelectionOutput & { error?: string };
      } catch {
        reject(
          new Error(
            `Python devolvió una respuesta inválida${stderr ? `: ${stderr.trim()}` : "."}`,
          ),
        );
        return;
      }

      if (code !== 0 || parsed.error) {
        const detail = parsed.error || stderr.trim() || `Python terminó con código ${code}`;
        reject(new Error(detail));
        return;
      }
      if (!Array.isArray(parsed.ranking) || !Array.isArray(parsed.scores)) {
        reject(new Error("El modelo Python no devolvió ranking y scores."));
        return;
      }
      resolve(parsed);
    });

    child.stdin.end(
      JSON.stringify({
        model: input.model,
        X: input.X,
        y: input.y,
        n_features: input.nFeatures,
        n_clusters: input.nClusters,
        epochs: input.epochs,
        params: input.params ?? {},
      }),
    );
  });
}
