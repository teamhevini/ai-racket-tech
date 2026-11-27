import * as React from "react";

/**
 * "Add to Home Screen" support.
 * - Android / desktop Chrome & Edge fire `beforeinstallprompt`; we keep it and show our own one-tap button.
 * - iPhone / iPad Safari has no install prompt; we show the Share → Add to Home Screen steps instead.
 * - Already installed (opened from the home screen): nothing is shown.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initInstall() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of the browser's mini-bar
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
  // Offline support and faster repeat loads. Production only, so development never serves stale files.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type InstallPlatform = "installed" | "prompt" | "ios" | "ios-other-browser" | "android-manual" | "unsupported";

function detect(): InstallPlatform {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) {
    // Chrome/Firefox on iOS can also add to the home screen (iOS 16.4+), via their share menu.
    return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-other-browser" : "ios";
  }
  if (/Android/.test(ua)) return "android-manual"; // e.g. Firefox or Samsung Internet before the prompt is ready
  return "unsupported";
}

export function useInstall() {
  const [platform, setPlatform] = React.useState<InstallPlatform>(() => (typeof window === "undefined" ? "unsupported" : detect()));
  React.useEffect(() => {
    const update = () => setPlatform(detect());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  const prompt = React.useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    const e = deferred;
    deferred = null;
    await e.prompt();
    const { outcome } = await e.userChoice;
    emit();
    return outcome;
  }, []);
  return { platform, prompt };
}
