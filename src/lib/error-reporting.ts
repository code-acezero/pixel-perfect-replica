/** Native error reporting for Tensora */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[Tensora Error]", error, {
    route: window.location.pathname,
    ...context,
  });
}
