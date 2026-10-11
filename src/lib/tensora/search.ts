export function tabSearch(search: Record<string, unknown>): { tab?: string } {
  return typeof search.tab === "string" ? { tab: search.tab } : {};
}
