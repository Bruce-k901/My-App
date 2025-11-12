import { z } from "zod";

export const blueprintSchema = z
  .object({
    course_id: z.string().min(1),
    module_id: z.string().min(1),
    pool: z.string().min(1),
    target_count: z.number().int().positive(),
    coverage: z.array(
      z.object({
        topic: z.string().min(1),
        min: z.number().int().min(0),
        max: z.number().int().min(0),
      })
    ),
    difficulty_split: z
      .object({
        easy: z.number().min(0).max(1),
        medium: z.number().min(0).max(1),
        hard: z.number().min(0).max(1),
      })
      .partial()
      .optional(),
  })
  .refine((value) => value.coverage.every((entry) => entry.max >= entry.min), {
    message: "coverage max must be >= min",
  });

export const assessmentBlueprintSchema = blueprintSchema;

export type AssessmentBlueprint = z.infer<typeof blueprintSchema>;
