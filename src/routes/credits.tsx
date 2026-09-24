import { createFileRoute } from "@tanstack/react-router"; {/* Importing the createFileRoute function from the react-router package para definir las rutas del proyecto */}

{/*
 * Esta función define la ruta correspondiente a la página de créditos
 * del proyecto OmicsFeatureSelectionLab.
 *
 * Configura los metadatos utilizados por buscadores y plataformas sociales,
 * y renderiza la página donde los usuarios pueden consultar las referencias
 * académicas, los conjuntos de datos y la pila tecnológica utilizada.
 */}

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Credits — References and stack | OmicsFeatureSelectionLab" },
      {
        name: "description",
        content:
          "Academic references for the feature-selection models, data sources and technologies used by OmicsFeatureSelectionLab.",
      },
      { property: "og:title", content: "Credits — OmicsFeatureSelectionLab" },
      {
        property: "og:description",
        content: "Academic references, datasets and technology stack of the project.",
      },
    ],
  }),
  component: CreditsPage,
  
});

{/* Aqui se declara un array con las referencias académicas utilizadas en el proyecto */}
const REFERENCES = [
  {
    title: "Unsupervised Feature Selection for Multi-Cluster Data",
    authors: "Deng Cai, Chiyuan Zhang, Xiaofei He — KDD 2010",
    note: "MCFS.",
    doi: "10.1145/1835804.1835848",
  },
  {
    title: "Unsupervised Feature Selection Using Nonnegative Spectral Analysis",
    authors: "Zechao Li, Yi Yang, Jing Liu, Xiaofang Zhou, Hanqing Lu — AAAI 2012",
    note: "NDFS.",
    doi: "10.1609/aaai.v26i1.8289",
  },
  {
    title: "Autoencoder Inspired Unsupervised Feature Selection",
    authors: "Kai Han, Yunhe Wang, Chao Zhang, Chao Li, Chao Xu — ICASSP 2018",
    note: "AEFS.",
    doi: "10.1109/ICASSP.2018.8462261",
  },
  {
    title: "Differentiable Gated Autoencoders for Unsupervised Feature Selection",
    authors: "Zebin Chen, Jintang Bian, Bo Qiao, Xiaohua Xie — Neurocomputing 2024",
    note: "DGA.",
    doi: "10.1016/j.neucom.2024.128202",
  },
  {
    title: "Discriminative and Robust Autoencoders for Unsupervised Feature Selection",
    authors: "Yunzhi Ling, Feiping Nie, Weizhong Yu, Xuelong Li — IEEE Transactions on Neural Networks and Learning Systems 2025",
    note: "DRAE.",
    doi: "10.1109/TNNLS.2023.3333737",
  },
  {
    title: "RFAE: A High-Robust Feature Selector Based on Fractal Autoencoder",
    authors: "Jingfeng Ou, Jiawei Li, Zhiliang Xia, Shurui Dai, Yan Guo, Limin Jiang, Jijun Tang — Expert Systems with Applications 2025",
    note: "RFAE.",
    doi: "10.1016/j.eswa.2025.127519",
  },
  {
    title: "Unsupervised Feature Selection Using Sparse Manifold Learning: Auto-Encoder Approach",
    authors: "Amir Moslemi, Mina Jamshidi — Information Processing & Management 2025",
    note: "SMLAE.",
    doi: "10.1016/j.ipm.2024.103923",
  },
];

{/* Esta función renderiza la página de créditos, incluyendo las referencias académicas y la información del equipo del proyecto */}
function CreditsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-3xl font-bold">Credits</h1>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          References
        </h2>

        <ul className="panel p-5">
          {REFERENCES.map((r) => (
            <li key={r.title}>
              <p className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground uppercase">{r.title}</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {r.authors}
              </p>

              <p className="mt-2 text-sm">
                {r.note} DOI:{" "}
                <a
                  href={`https://doi.org/${r.doi}`}
                  className="text-blue-500 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {r.doi}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-10 sm:flex-row sm:justify-between">
        {/* LEFT */}
        <div className="sm:w-[45%]">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Team
          </h2>

          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <b>Project Leader:</b>
            </li>
            <li>Sabrina Giordano</li>

            <li className="pt-2">
              <b>Experts in Statistics, Data Science, ML, AI and XAI:</b>
            </li>
            <li>Carlo Adornetto</li>
            <li>Elka Segura Sánchez</li>
          </ul>
        </div>

        {/* RIGHT */}
        <div className="sm:w-[45%]">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Aims
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This project provides a unified platform for validated Unsupervised
            Feature Selection methods, supporting the analysis of
            high-dimensional omics data while preserving the most informative
            features. Explainable AI (XAI) techniques are integrated with
            downstream tree-based models, including Random Forest and XGBoost,
            to improve model interpretability and provide insight into the
            contribution of the selected features.
          </p>
        </div>
      </section>
    </div>
  );
}


