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
          </h1><p>This project aims to provide a unified platform that brings together
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
        <h2 className="text-2xl font-bold">Description</h2>
        <p className="mt-5 text-base leading-relaxed">OmicsFeatureSelectionLab is a minimal application to experiment with <strong>label-free </strong>
            feature selection models. Pick a dataset (or upload your own CSV), set the number of
            features and the model runs the selection; afterwards you can validate the subset with
            a classifier (Random Forest or Gradient Boosting).
          </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "The n ≪ p problem",
              body: "Omics datasets are typically characterized by a limited number of samples and a very large number of variables. Since many of these variables may be noisy or redundant, feature selection is essential to reduce dimensionality while preserving the underlying biological structure",
            },
            {
              title: "Unsupervised",
              body: "The models operate without using the clinical labels. Instead, they learn the intrinsic multi-cluster structure of the data and identify the variables that best preserve it. The study considers established unsupervised feature selection (UFS) methods from the literature, together with a recent approach, reflecting the continuous development of this rapidly evolving research field.",
            },
            {
              title: "Downstream validation",
              body: "Only after feature selection are tree-based classifiers, namely Random Forest and Gradient Boosting, trained using cross-validation. Beyond evaluating the predictive quality of the reduced feature subset, these models are used to assess the relative contribution of the selected genes/features. Their tree-based structure also facilitates the application of Explainable AI (XAI) techniques, providing an interpretable representation of the variables that contribute most strongly to the classification outcome.",
            },
          ].map((card) => (
            <article key={card.title} className="panel p-6">
              <h3 className="text-base font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold">App</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Choose a dataset from the repository or upload your CSV (samples × features).",
              "Set the number of features and the unsupervised model.",
              "Run it and watch the selection progress.",
              "Validate the subset with RF or Gradient Boosting and review the metrics and SHAP plot.",
            ].map((step, i) => (
              <li key={step} className="panel p-5">
                <span className="font-mono text-xs text-primary">0{i + 1}</span>
                <p className="mt-2 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
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
