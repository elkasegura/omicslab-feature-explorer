import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export interface LoadedMatDataset {
  X: number[][];
  y: number[];
  features: string[];
}

function resolveDatasetRunner(): string {
  const runner = path.resolve(process.cwd(), "python", "dataset_runner.py");
  if (!existsSync(runner)) {
    throw new Error("No se encuentra python/dataset_runner.py.");
  }
  return runner;
}

export function loadMatDataset(file: string): Promise<LoadedMatDataset> {
  const python = process.env["OMICSLAB_PYTHON"] ?? process.env["PYTHON"] ?? "python3";
  const runner = resolveDatasetRunner();

  return new Promise((resolve, reject) => {
    const child = spawn(python, [runner], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", (error) => reject(new Error(`No se pudo iniciar Python: ${error.message}`)));
    child.on("close", (code) => {
      let parsed: (LoadedMatDataset & { error?: string }) | undefined;
      try {
        parsed = JSON.parse(stdout || "{}") as LoadedMatDataset & { error?: string };
      } catch {
        reject(new Error(`Python devolvió un dataset inválido${stderr ? `: ${stderr.trim()}` : "."}`));
        return;
      }
      if (code !== 0 || parsed.error) {
        reject(new Error(parsed.error || stderr.trim() || `Python terminó con código ${code}`));
        return;
      }
      if (!Array.isArray(parsed.X) || !Array.isArray(parsed.y) || !Array.isArray(parsed.features)) {
        reject(new Error("El cargador Python no devolvió X, y y features."));
        return;
      }
      resolve(parsed);
    });

    child.stdin.end(JSON.stringify({ file }));
  });
}
