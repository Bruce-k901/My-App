import { ZodSchema } from "zod";

export function safeParseOrThrow<T>(schema: ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`${context} validation failed: ${message}`);
  }
  return result.data;
}
