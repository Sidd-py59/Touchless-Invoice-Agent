export function reportLovableError(error: unknown, meta?: Record<string, string>) {
  console.error("[TIA Error]", error, meta);
}
