"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getPlatform() {
  if (typeof navigator === "undefined") {
    return { isIos: false, isAndroid: false, isSafari: false };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIpadOsDesktop =
    /macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;
  const isIos = /iphone|ipad|ipod/.test(userAgent) || isIpadOsDesktop;
  const isAndroid = /android/.test(userAgent);
  const isSafari =
    /safari/.test(userAgent) &&
    !/crios|fxios|edgios|chrome|chromium/.test(userAgent);

  return { isIos, isAndroid, isSafari };
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState({
    isIos: false,
    isAndroid: false,
    isSafari: false,
  });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setPlatform(getPlatform());
    setIsStandalone(isStandaloneMode());

    const displayModeQuery = window.matchMedia(
      "(display-mode: standalone)",
    ) as LegacyMediaQueryList;
    const updateStandalone = () => setIsStandalone(isStandaloneMode());
    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener("change", updateStandalone);
    } else if (displayModeQuery.addListener) {
      displayModeQuery.addListener(updateStandalone);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener("change", updateStandalone);
      } else if (displayModeQuery.removeListener) {
        displayModeQuery.removeListener(updateStandalone);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptMode = useMemo(() => {
    if (isStandalone || dismissed) {
      return "hidden";
    }

    if (platform.isIos && platform.isSafari) {
      return "ios";
    }

    if (deferredPrompt) {
      return "android-install";
    }

    if (platform.isAndroid) {
      return "android-manual";
    }

    return "hidden";
  }, [deferredPrompt, dismissed, isStandalone, platform]);

  async function installApp() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
    setDismissed(true);
  }

  if (promptMode === "hidden") {
    return null;
  }

  return (
    <div
      className="install-prompt-panel fixed z-50 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
      role="status"
      aria-live="polite"
      data-pwa-install-prompt={promptMode}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">
            加入手機主畫面
          </p>
          {promptMode === "ios" ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              iPhone 可點選分享按鈕，再選擇「加入主畫面」。
            </p>
          ) : promptMode === "android-install" ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Android Chrome 可直接安裝成 App。
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Android Chrome 選單中可使用「安裝應用程式」或「加入主畫面」。
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {promptMode === "android-install" ? (
              <button type="button" className="btn-primary" onClick={installApp}>
                <Download className="h-4 w-4" aria-hidden="true" />
                安裝
              </button>
            ) : null}
            {promptMode === "ios" ? (
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                <Share2 className="h-4 w-4" aria-hidden="true" />
                分享
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700"
          aria-label="關閉安裝提示"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
