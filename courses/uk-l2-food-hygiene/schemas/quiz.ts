import { z } from "zod";
import { pageSchema } from "./page";

export const quizFileSchema = z.object({
  pool_id: z.string().min(1),
  items: z.array(pageSchema),
});

export const quizSchema = quizFileSchema;

export type QuizFile = z.infer<typeof quizFileSchema>;
