import { ZodSchema, ZodIssue } from "zod";

export function safeParseOrThrow<T>(schema: ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Zod: use 'issues' property, not 'errors'
    const message = result.error.issues
      .map((issue: ZodIssue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`${context} validation failed: ${message}`);
  }
  return result.data;
}
