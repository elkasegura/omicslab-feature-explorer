import { createFileRoute, Link } from "@tanstack/react-router";
import { DATASETS, MODELS } from "@/lib/datasets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "About Us — OmicsFeatureSelectionLab | Unsupervised Feature Selection" },
      {
        name: "description",
        content:
          "OmicsFeatureSelectionLab runs multiple unsupervised feature-selection models on high-dimensional omics datasets and validates the selected subset with downstream classifiers.",
      },
      { property: "og:title", content: "About Us — OmicsFeatureSelectionLab" },
      {
        property: "og:description",
        content:
          "Unsupervised feature selection for omics data with multiple Python models and classifier validation.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Unsupervised Feature Selection
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            AI-Based Unsupervised Feature Selection for High-Dimensional Omics Data
          </h1><p className="mt-4 text-base leading-relaxed text-muted-foreground">
            This project aims to provide a unified platform that brings together
            unsupervised feature-selection methods reported and validated in the
            scientific literature. The platform is designed to support technical
            and research personnel in the analysis of high-dimensional omics data,
            facilitating dimensionality reduction while preserving the most
            informative features for downstream analysis.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/analyses"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Analyses
            </Link>
            <Link
              to="/database"
              className="rounded-md border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Browse datasets
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="w-full">
          <h2 className="mt-2 text-3xl font-bold">
            Description
          </h2>

          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            OmicsFeatureSelectionLab provides a unified environment for exploring
            label-free feature selection in high-dimensional omics data. Users can
            select a reference dataset or upload their own data, apply an
            unsupervised feature selection method, and subsequently evaluate the
            selected subset using tree-based predictive models.
          </p>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div className="border-t border-border pt-6">
            <span className="font-mono text-sm font-semibold text-cyan-700">
              01
            </span>

            <h3 className="mt-3 text-lg font-semibold">
              High-dimensional data
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Omics datasets typically contain far more variables than samples.
              Feature selection reduces this dimensionality by identifying a compact
              subset of informative and non-redundant features.
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <span className="font-mono text-sm font-semibold text-cyan-700">
              02
            </span>

            <h3 className="mt-3 text-lg font-semibold">
              Unsupervised feature selection
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Clinical labels are not used during feature selection. Instead, UFS
              methods aim to preserve the intrinsic structure of the data. The
              platform includes established methods from the literature together
              with more recent approaches.
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <span className="font-mono text-sm font-semibold text-cyan-700">
              03
            </span>

            <h3 className="mt-3 text-lg font-semibold">
              Validation & interpretation
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              After feature selection, Random Forest and XGBoost are used to evaluate
              the predictive quality of the reduced subset. Explainable AI methods,
              including SHAP, are then used to analyse feature-level contributions
              to model predictions.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <h2 className="mt-2 text-3xl font-bold">
            How it works
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {[
            {
              number: "01",
              title: "Select your data",
              text: "Choose a dataset from the repository or upload your own CSV file.",
            },
            {
              number: "02",
              title: "Configure the analysis",
              text: "Select the number of features and the unsupervised feature selection method.",
            },
            {
              number: "03",
              title: "Run feature selection",
              text: "Launch the analysis and follow the feature selection process.",
            },
            {
              number: "04",
              title: "Validate & interpret",
              text: "Evaluate the selected subset using RF or XGBoost and explore its SHAP-based interpretation.",
            },
          ].map((step) => (
            <div
              key={step.number}
              className="relative border-t border-border pt-6"
            >
              <span className="font-mono text-sm font-semibold text-cyan-700">
                {step.number}
              </span>

              <h3 className="mt-4 text-base font-semibold">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold">Info project</h2>

        <dl className="mt-6 grid gap-10 sm:grid-cols-2">
          {/* LEFT */}
          <div className="justify-self-start">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Team
            </dt>

            <dd className="mt-2 text-sm">
              <ul className="mt-3 space-y-1 text-sm">
                <li><b>Project Leader:</b></li>
                <li>Sabrina Giordano</li>

                <li className="pt-3">
                  <b>Experts in Statistics, Data Science, ML, AI and XAI:</b>
                </li>
                <li>Carlo Adornetto</li>
                <li>Elka Segura Sánchez</li>
              </ul>
            </dd>
          </div>

          {/* RIGHT */}
          <div className="justify-self-end text-justify max-w-md">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Supported by
            </dt>

            <dd className="mt-2 text-sm">
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  Fondazione ANTHEM – AdvaNced Technology for Human centEred Medicine
                </li>
                <li>Università della Calabria</li>
                <li>
                  Dipartimento di Economia, Statistica e Finanza “Giovanni Anania”
                </li>
                <li>Dipartimento di Matematica e Informatica</li>
              </ul>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
