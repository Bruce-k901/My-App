import { ZodSchema } from "zod";

export function safeParseOrThrow<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.log("Validation failed for context:", context);
    console.log("Result object:", JSON.stringify(result, null, 2));
    if (!result.error) {
      console.error(
        "WTF: result.success is false but result.error is missing!",
        result,
      );
      throw new Error(
        `${context} validation failed with unknown error (result.error missing)`,
      );
    }
    const message = result.error.errors
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`${context} validation failed: ${message}`);
  }
  return result.data;
}
