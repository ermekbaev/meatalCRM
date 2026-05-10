"use client";
import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const STORAGE_KEY = "ios-install-hint-dismissed";

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIosSafari()) return;
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-slate-200 bg-white shadow-lg p-4">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="text-sm font-semibold mb-1">Установите приложение</div>
      <div className="text-xs text-slate-600 leading-relaxed">
        Нажмите <Share className="inline h-3.5 w-3.5 align-text-bottom mx-0.5" />
        внизу экрана, затем «На экран &laquo;Домой&raquo;». Это включит push-уведомления и работу в офлайн.
      </div>
    </div>
  );
}
