/**
 * Outcome-trained factor weights (1.G), research mode.
 *
 *   npm run fit-weights -- --school=asu            fit on real outcomes, save a suggestion
 *   npm run fit-weights -- --school=asu --dry-run  fit and print, save nothing
 *   npm run fit-weights -- --synthetic             planted-effect demo, no database
 *
 * Real fits use only approved pairings from ended terms where every member consented to
 * research use. A housing admin reviews and adopts a suggestion in Staff → Term → Matching
 * rules; it is never adopted automatically.
 */
import {
  LIFESTYLE_FACTORS,
  fitOutcomeWeights,
  plantedOutcomes,
  type FitResult,
} from "../src/lib/matching/weights-optimizer";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const lambda = Number(args.get("lambda") ?? 1);
const IMPORTANCE = ["Doesn't matter", "Nice to have", "Important", "Must match"];

function report(fit: FitResult) {
  if (fit.status !== "ok") {
    console.error(`Refused. ${fit.message}`);
    process.exit(1);
  }
  console.log(
    `Rows ${fit.rows} · with friction ${fit.positives} (${((fit.positives / fit.rows) * 100).toFixed(1)}%) · in-sample AUC ${fit.auc} · λ ${fit.lambda}\n`,
  );
  console.log("Factor        coef     95% CI              evidence   suggested default");
  for (const f of LIFESTYLE_FACTORS) {
    const e = fit.estimates.find((x) => x.factor === f)!;
    console.log(
      `${f.padEnd(12)} ${e.coef.toFixed(3).padStart(7)}  [${e.low.toFixed(2).padStart(6)}, ${e.high.toFixed(2).padStart(6)}]   ${e.evidence.padEnd(9)}  ${IMPORTANCE[e.suggested]}`,
    );
  }
  console.log(
    "\nPositive coef: more mismatch on that factor went with more friction. Wald intervals; no protected attributes are inputs.",
  );
}

async function main() {
  if (args.has("synthetic")) {
    console.log("Synthetic data, planted effects: sleep 2.5, cleanliness 1.5.\n");
    report(
      fitOutcomeWeights(
        plantedOutcomes(Number(args.get("rows") ?? 2000), { sleep: 2.5, cleanliness: 1.5 }),
        lambda,
      ),
    );
    return;
  }
  const school = args.get("school");
  if (!school || school === "true") {
    console.error("Pass --school=<id>, or --synthetic for a demo.");
    process.exit(1);
  }
  const { fitAndSuggest } = await import("../src/lib/matching/weight-models");
  const { fit, modelId } = await fitAndSuggest(school, { lambda, save: !args.has("dry-run") });
  report(fit);
  console.log(
    modelId
      ? `\nSaved as suggestion ${modelId}. A housing admin can review and adopt it.`
      : "\nDry run: nothing saved.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
