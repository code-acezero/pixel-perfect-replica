export function tabSearch(search: Record<string, unknown>): { tab?: string; pair?: string; roll?: string } {
  return {
    ...(typeof search["tab"] === "string" ? { tab: search["tab"] } : {}),
    ...(typeof search["pair"] === "string" ? { pair: search["pair"] } : {}),
    ...(typeof search["roll"] === "string" ? { roll: search["roll"] } : {}),
  };
}
