import { z } from "zod";

export const outcomesSchema = z.object({
  outcomes: z.array(
    z.object({
      id: z.string().min(1),
      statement: z.string().min(1),
    })
  ),
  mapping: z
    .array(
      z
        .object({
          page_id: z.string().min(1).optional(),
          quiz_id: z.string().min(1).optional(),
          outcome_id: z.string().min(1),
        })
        .refine((value) => Boolean(value.page_id || value.quiz_id), {
          message: "mapping entry requires a page_id or quiz_id",
        })
    )
    .optional(),
});

export type OutcomesMapping = z.infer<typeof outcomesSchema>;

export const outcomesMappingSchema = outcomesSchema;
