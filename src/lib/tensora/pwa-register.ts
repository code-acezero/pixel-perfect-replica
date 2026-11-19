/** Native offline service worker registration for Tensora. */
export async function registerTensoraSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    new URLSearchParams(location.search).get("sw") === "off";
  if (refused) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}
