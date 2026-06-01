import { RouteLifecycleManager } from "./RouteLifecycleManager";

export async function autoFinalizeUnfinishedRoutes(): Promise<void> {
  console.log("[RouteAutoFinalizer] Invoking manual trigger of RouteLifecycleManager JIT transitions...");
  await RouteLifecycleManager.performJitTransitions();
}

export function initRouteAutoFinalizer(): void {
  console.log("[RouteAutoFinalizer] Initializing secondary automatic route finalizer daemon fallback...");

  // Run immediately on boot to reconcile open route statuses right away
  RouteLifecycleManager.performJitTransitions()
    .then(() => console.log("[RouteAutoFinalizer] Initial startup JIT route reconciliation complete."))
    .catch((err) => console.error("[RouteAutoFinalizer] Crash during initial startup JIT sweep:", err));

  // Run JIT transition checking as a regular consistency backup every 5 minutes
  setInterval(async () => {
    try {
      console.log("[RouteAutoFinalizer] Background fallback sweeper tick executing.");
      await RouteLifecycleManager.performJitTransitions();
    } catch (err) {
      console.error("[RouteAutoFinalizer] Error in route auto-finalizer fallback timer tick:", err);
    }
  }, 5 * 60 * 1000); // Ticks every 5 minutes
}
