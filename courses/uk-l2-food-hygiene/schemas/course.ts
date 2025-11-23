import { z } from "zod";

export const courseManifestSchema = z.object({
  course_id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  modules: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
      }),
    )
    .min(1),
  certificate_module: z.string().min(1).optional(),
  pass_mark_percent: z.number().min(0).max(100),
});

export type CourseManifest = z.infer<typeof courseManifestSchema>;
