import { z } from "zod";

export const hotspotSpotSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().min(1),
});

const outcomesField = {
  outcomes: z.array(z.string().min(1)).optional(),
};

const baseChoiceFields = {
  rationale: z.string().optional(),
};

const branchOptionSchema = z.object({
  label: z.string().min(1),
  result: z.string().min(1),
});

export const pageSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: z.string().min(1),
      type: z.literal("content"),
      title: z.string().min(1),
      body: z.string().min(1),
      media: z.string().optional(),
      voiceover: z.string().optional(),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("single_choice"),
      stem: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answer: z.number().int().nonnegative(),
    })
    .extend(baseChoiceFields)
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("multi_choice"),
      stem: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answers: z.array(z.number().int().nonnegative()).min(1),
    })
    .extend(baseChoiceFields)
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("drag_drop"),
      prompt: z.string().min(1),
      pairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])).min(1),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("reorder"),
      prompt: z.string().min(1),
      steps: z.array(z.string().min(1)).min(2),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("hotspot"),
      prompt: z.string().min(1),
      image: z.string().min(1),
      spots: z.array(hotspotSpotSchema).min(1),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("lottie"),
      title: z.string().optional(),
      caption: z.string().optional(),
      src: z.string().min(1),
      loop: z.boolean().optional(),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("branch"),
      title: z.string().min(1),
      stem: z.string().min(1),
      options: z.array(branchOptionSchema).min(2),
      correctIndex: z.number().int().nonnegative().optional(),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("temperature"),
      prompt: z.string().min(1),
      min: z.number().optional(),
      max: z.number().optional(),
      safeColdMax: z.number().optional(),
      hotHoldMin: z.number().optional(),
      initial: z.number().optional(),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("handwash"),
      steps: z.array(z.string().min(1)).min(2),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("completion"),
      title: z.string().min(1),
      body: z.array(z.string().min(1)).min(1),
      media: z.string().optional(),
      requires: z
        .object({
          modules: z.array(z.string().min(1)).optional(),
          minOverallPercent: z.number().min(0).max(100).optional(),
        })
        .optional(),
      actions: z
        .object({
          ctaLabel: z.string().min(1).optional(),
          generateCertificate: z
            .object({
              template: z.string().min(1),
              fields: z.array(z.string().min(1)).optional(),
              storeRecord: z
                .object({
                  table: z.string().min(1),
                  // Zod: z.record requires key and value schemas
                  fields: z.record(z.string(), z.string().min(1)).optional(),
                })
                .optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .extend(outcomesField),
  z
    .object({
      id: z.string().min(1),
      type: z.literal("recap"),
      bullets: z.array(z.string().min(1)).min(1),
    })
    .extend(outcomesField),
  z.object({
    id: z.string().min(1),
    type: z.literal("quiz_ref"),
    pool: z.string().min(1),
    count: z.number().int().positive(),
  }),
]);

export const pagesSchema = z.array(pageSchema);

export type Page = z.infer<typeof pageSchema>;
