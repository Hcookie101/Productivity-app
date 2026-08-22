"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

const BRIDGE_KEY = "orbit-extension-sites";

function toSiteStats(raw: unknown): { domain: string; history: Record<string, number> }[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!raw || typeof raw !== "object") return [];
  const out: { domain: string; history: Record<string, number> }[] = [];
  for (const [domain, value] of Object.entries(raw as Record<string, unknown>) ) {
    if (typeof value === "number") {
      out.push({ domain, history: { [todayKey()]: Math.round(value) } });
    } else if (value && typeof value === "object") {
      const hist = (value as Record<string, unknown>).daily as Record<string, number> | undefined;
      if (hist && typeof hist === "object") {
        out.push({ domain, history: Object.fromEntries(
          Object.entries(hist).map(([d, s]) => [d, Math.round(Number(s) || 0)])
        )});
      }
    }
  }
  return out;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Bridges the companion Chrome extension (writes JSON into localStorage on this
 * origin) into the Orbit store, and reacts to live messages.
 */
export function ExtensionBridge() {
  useEffect(() => {
    const ingest = () => {
      const raw = window.localStorage.getItem(BRIDGE_KEY);
      if (!raw) return;
      const stats = toSiteStats(raw);
      if (!stats.length) return;
      useStore.getState().setSiteStats(stats);
    };

    const onLive = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && Array.isArray(detail.sites)) {
        useStore.getState().setSiteStats(detail.sites);
        return;
      }
      ingest();
    };

    // first pull + interval while the app is open
    ingest();
    const iv = window.setInterval(ingest, 20_000);
    window.addEventListener("orbit-sites", onLive);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("orbit-sites", onLive);
    };
  }, []);
  return null;
}