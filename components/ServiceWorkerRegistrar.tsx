"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        const checkForUpdate = () => reg.update().catch(() => {});

        // Проверяем обновление при возврате на вкладку и каждые 30 минут.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("focus", checkForUpdate);
        const interval = window.setInterval(checkForUpdate, 30 * 60 * 1000);

        return () => window.clearInterval(interval);
      })
      .catch(() => {});
  }, []);

  return null;
}
