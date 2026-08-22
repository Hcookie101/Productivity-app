"use client";

import { useEffect } from "react";
import { maybeBootstrap } from "@/lib/store";

/** Seeds the demo workspace on first load (and after version bumps). */
export function AppBootstrap() {
  useEffect(() => {
    maybeBootstrap();
  }, []);
  return null;
}