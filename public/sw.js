// Минимальный service worker: установка + push.
// Кеширование намеренно простое — Next.js сам отдаёт edge-кеш и HTTP-cache headers.

const SW_VERSION = "v1";

self.addEventListener("install", (event) => {
  // Сразу активируем новую версию
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Заглушка fetch — без кастомного кеша, всё идёт в сеть.
// Это нужно лишь для того, чтобы браузер считал PWA «installable».
self.addEventListener("fetch", () => {});

// Web Push
self.addEventListener("push", (event) => {
  let payload = { title: "ORIENT-LASER", body: "" , link: "/" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/public/logo.png",
    badge: "/public/logo.png",
    data: { link: payload.link ?? "/" },
    tag: payload.tag ?? undefined,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.link ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if ("focus" in c) {
          c.focus();
          c.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
