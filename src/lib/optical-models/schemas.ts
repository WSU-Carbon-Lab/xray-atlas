/**
 * Pure Zod contracts for optical model content, shared by the server, the REST routes, and clients.
 *
 * Owns the normalization specification, peak rows, tensor manifest, draft content, and the
 * visibility vocabulary. Does not read the database, apply normalization, or fit peaks. Every
 * numeric field rejects non-finite values, and every refinement error names its field path.
 */

import { z } from "zod";

/** Visibility levels of an optical model, from most to least restricted. */
export const MODEL_VISIBILITIES = ["private", "shared", "public"] as const;

/** Visibility level of an optical model. */
export type ModelVisibility = (typeof MODEL_VISIBILITIES)[number];

/** Assignment kinds a peak can carry. */
export const MODEL_PEAK_KINDS = ["pi-star", "sigma-star", "other"] as const;

/** Assignment kind of a peak. */
export type ModelPeakKind = (typeof MODEL_PEAK_KINDS)[number];

/** Reference frames a tensor manifest can declare. */
export const TENSOR_FRAMES = ["lab", "molecular", "principal"] as const;

/** Tensor component labels a manifest can list. */
export const TENSOR_COMPONENTS = [
  "xx",
  "yy",
  "zz",
  "xy",
  "xz",
  "yz",
  "delta",
  "beta",
] as const;

const finiteNumber = z
  .number()
  .refine((value) => Number.isFinite(value), "must be a finite number");

const nonNegativeFinite = finiteNumber.refine(
  (value) => value >= 0,
  "must be zero or greater",
);

const energyWindow = z.tuple([finiteNumber, finiteNumber]);

const windowPairSchema = z.object({ pre: energyWindow, post: energyWindow });

/** Channels that carry their own windows when the normalization scope is `per_channel`. */
export const NORMALIZATION_CHANNELS = ["od", "massabsorption", "beta"] as const;

function checkWindowPair(
  pair: { pre: [number, number]; post: [number, number] },
  basePath: string[],
  ctx: z.RefinementCtx,
): void {
  if (pair.pre[0] >= pair.pre[1]) {
    ctx.addIssue({
      code: "custom",
      path: [...basePath, "pre"],
      message: "pre window must have low < high",
    });
  }
  if (pair.post[0] >= pair.post[1]) {
    ctx.addIssue({
      code: "custom",
      path: [...basePath, "post"],
      message: "post window must have low < high",
    });
  }
  if (pair.pre[1] > pair.post[0]) {
    ctx.addIssue({
      code: "custom",
      path: [...basePath, "post"],
      message: "pre window must end at or before the post window starts",
    });
  }
}

/**
 * Normalization specification of an optical model.
 *
 * `scope: "unified"` applies one `pre` and one `post` energy window (eV, `[low, high]`) to every
 * channel. `scope: "per_channel"` gives each of `od`, `massabsorption`, and `beta` its own pair.
 * This is the same information datasets store, so a dataset normalization copies in without loss.
 * Each window requires `low < high`, and each pre window must end at or before its post window
 * starts. A model with no normalization stores `null` instead of a spec.
 */
export const normalizationSpecSchema = z
  .discriminatedUnion("scope", [
    z.object({
      schemaVersion: z.literal(1),
      scope: z.literal("unified"),
      pre: energyWindow,
      post: energyWindow,
    }),
    z.object({
      schemaVersion: z.literal(1),
      scope: z.literal("per_channel"),
      od: windowPairSchema,
      massabsorption: windowPairSchema,
      beta: windowPairSchema,
    }),
  ])
  .superRefine((value, ctx) => {
    if (value.scope === "unified") {
      checkWindowPair({ pre: value.pre, post: value.post }, [], ctx);
      return;
    }
    for (const channel of NORMALIZATION_CHANNELS) {
      checkWindowPair(value[channel], [channel], ctx);
    }
  });

/** Normalization specification of an optical model. */
export type NormalizationSpec = z.infer<typeof normalizationSpecSchema>;

/**
 * One assigned peak produced by the user's own fitting code.
 *
 * `centerEv` is in eV. `width` and every `*Err` field are zero or greater when present.
 * `experimentId` and `polarizationId` tie the peak to one linked dataset and geometry when set.
 */
const paramValue = finiteNumber.or(z.string().max(200)).or(z.boolean());

export const modelPeakSchema = z.object({
  centerEv: finiteNumber,
  kind: z.enum(MODEL_PEAK_KINDS),
  transition: z.string().trim().max(200).nullish(),
  amplitude: finiteNumber.nullish(),
  width: nonNegativeFinite.nullish(),
  shape: z.string().trim().max(60).nullish(),
  centerErr: nonNegativeFinite.nullish(),
  amplitudeErr: nonNegativeFinite.nullish(),
  widthErr: nonNegativeFinite.nullish(),
  experimentId: z.string().uuid().nullish(),
  polarizationId: z.string().uuid().nullish(),
  params: z
    .record(z.string().min(1).max(60), paramValue)
    .refine(
      (record) => Object.keys(record).length <= 50,
      "params may hold at most 50 keys",
    )
    .nullish(),
  fitProvenance: z
    .object({
      tool: z.string().trim().min(1).max(100),
      version: z.string().trim().max(100).optional(),
      codeHash: z.string().trim().max(100).optional(),
    })
    .nullish(),
});

/** One assigned peak. */
export type ModelPeak = z.infer<typeof modelPeakSchema>;

/**
 * Manifest describing a stored tensor blob.
 *
 * `energyEv` gives the grid bounds and sample count, `shape` the array dimensions, and
 * `components` the labelled components in storage order.
 */
export const tensorManifestSchema = z.object({
  schemaVersion: z.literal(1),
  format: z.enum(["npz", "parquet"]),
  energyEv: z
    .object({
      min: finiteNumber,
      max: finiteNumber,
      count: z.number().int().positive(),
    })
    .refine(
      (grid) => grid.min < grid.max,
      "energyEv.min must be less than max",
    ),
  components: z.array(z.enum(TENSOR_COMPONENTS)).min(1),
  frame: z.enum(TENSOR_FRAMES),
  units: z.string().trim().min(1).max(40),
  dtype: z.string().trim().min(1).max(20),
  shape: z.array(z.number().int().positive()).min(1).max(6),
});

/** Manifest describing a stored tensor blob. */
export type TensorManifest = z.infer<typeof tensorManifestSchema>;

/** Link from a draft to one dataset. */
export const draftDatasetLinkSchema = z.object({
  experimentId: z.string().uuid(),
  role: z.string().trim().min(1).max(60).default("primary"),
});

/** Link from a draft to one dataset. */
export type DraftDatasetLink = z.infer<typeof draftDatasetLinkSchema>;

/**
 * Editable content of a model draft. `peaks` and `datasets` replace the stored value when present;
 * `normalization: null` clears it.
 */
export const draftContentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullish(),
  normalization: normalizationSpecSchema.nullish(),
  peaks: z.array(modelPeakSchema).max(2000).optional(),
  datasets: z
    .array(draftDatasetLinkSchema)
    .min(1)
    .max(50)
    .refine(
      (links) =>
        new Set(links.map((link) => link.experimentId)).size === links.length,
      "datasets must not repeat an experimentId",
    )
    .optional(),
});

/** Editable content of a model draft. */
export type DraftContent = z.infer<typeof draftContentSchema>;
