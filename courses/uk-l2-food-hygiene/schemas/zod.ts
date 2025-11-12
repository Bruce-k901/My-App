import { z } from "zod";
import { moduleManifestSchema } from "./module";
import { pagesSchema as rawPagesSchema } from "./page";
import { courseManifestSchema } from "./course";
import { quizFileSchema } from "./quiz";
import { outcomesSchema } from "./outcomes";
import { blueprintSchema } from "./blueprint";

export { z };
export const moduleSchema = moduleManifestSchema;
export const pagesSchema = rawPagesSchema;
export const courseSchema = courseManifestSchema;
export const quizSchema = quizFileSchema;
export const outcomesMappingSchema = outcomesSchema;
export const assessmentBlueprintSchema = blueprintSchema;
