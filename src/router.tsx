import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Self-heal stale deploys: when a hashed chunk from a previous deploy can no
// longer be fetched (it was replaced by a newer immutable build), force a
// one-time full reload so the browser pulls fresh HTML with valid chunk URLs.
if (typeof window !== "undefined") {
  const RELOAD_KEY = "chunk-reload-at";
  const reloadOnce = () => {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    // guard against reload loops (only retry once per 10s)
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  };
  const isChunkError = (msg?: string) =>
    !!msg &&
    /dynamically imported module|importing a module script failed|Failed to fetch/i.test(msg);

  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnce();
  });
  window.addEventListener("error", (e) => {
    if (isChunkError(e?.message)) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (isChunkError(e?.reason?.message ?? String(e?.reason))) reloadOnce();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
