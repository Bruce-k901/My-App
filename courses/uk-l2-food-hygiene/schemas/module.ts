import { z } from "zod";

export const moduleQuizSchema = z.object({
  pool: z.string().min(1),
  count: z.number().int().positive(),
  pass_mark_percent: z.number().min(0).max(100),
});

export const moduleManifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  duration_min: z.number().int().positive().optional(),
  media_path: z.string().optional(),
  pages: z.array(z.string().min(1)).optional(),
  quiz: moduleQuizSchema.optional(),
  quiz_ref: z.string().optional(),
  pages_file: z.string().optional(),
  outcomes_file: z.string().optional(),
  order: z.number().int().positive().optional(),
});

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
