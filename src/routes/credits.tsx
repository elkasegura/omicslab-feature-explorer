import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Credits — References and stack | OmicsLab" },
      {
        name: "description",
        content:
          "Academic references for the feature-selection models, data sources and technologies used by OmicsLab.",
      },
      { property: "og:title", content: "Credits — OmicsLab" },
      {
        property: "og:description",
        content: "Academic references, datasets and technology stack of the project.",
      },
    ],
  }),
  component: CreditsPage,
});

const REFERENCES = [
  {
    title: "Unsupervised Feature Selection for Multi-Cluster Data",
    authors: "Deng Cai et al. — KDD 2010",
    note: "MCFS.",
  },
  {
    title: "Unsupervised Feature Selection Using Nonnegative Spectral Analysis",
    authors: "Zechao Li et al. — AAAI 2012",
    note: "NDFS.",
  },
  {
    title: "Autoencoder Inspired Unsupervised Feature Selection",
    authors: "Kai Han, Yunhe Wang, Chao Zhang, Chao Li, Chao Xu — ICASSP 2018",
    note: "AEFS.",
  },
  {
    title: "Differentiable Gated Autoencoders for Unsupervised Feature Selection",
    authors: "Zebin Chen, Jintang Bian, Bo Qiao, Xiaohua Xie — Neurocomputing 2024",
    note: "DGA.",
  },
  {
    title: "Deep Robust Autoencoder for Unsupervised Feature Selection",
    authors: "Yunzhi Ling, Feiping Nie, Weizhong Yu, Xuelong Li — IEEE TNNLS 2025",
    note: "DRAE.",
  },
  {
    title: "Robust Feature AutoEncoder",
    authors: "Jingfeng Ou et al. — Expert Systems With Applications 2025",
    note: "RFAE.",
  },
  {
    title: "Sparse Manifold Learning AutoEncoder",
    authors: "Moslemi & Jamshidi — Information Processing & Management 2025",
    note: "SMLAE.",
  },
  {
    title: "Broad patterns of gene expression revealed by clustering of tumor and normal colon tissues",
    authors: "U. Alon et al. — PNAS 1999",
    note: "Source of the colon dataset.",
  },
];

function CreditsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-3xl font-bold">Credits</h1>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          References
        </h2>
        <ul className="mt-4 space-y-4">
          {REFERENCES.map((r) => (
            <li key={r.title} className="panel p-5">
              <p className="font-semibold">{r.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.authors}</p>
              <p className="mt-2 text-sm">{r.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Stack
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>React 19 + TanStack Router (front-end)</li>
            <li>Tailwind CSS (design system)</li>
            <li>Python model runtime — NumPy, SciPy, scikit-learn, PyTorch and TensorFlow</li>
            <li>TanStack server functions — Python bridge, classifiers and SHAP execution</li>
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Architecture
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The browser sends the selected model and dataset to a server function. The server calls
            the shared Python runner, which resolves the model through a registry and returns one
            score per feature plus a global ranking.
          </p>
        </div>
      </section>
    </div>
  );
}
