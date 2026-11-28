"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroVisual = dynamic(() => import("./HeroVisual"), { ssr: false, loading: () => null });

/** Live 3D only on capable desktops; everyone else (phones, tablets, data-saver, reduced motion) gets a still. */
function canRun3d(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 961px)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  return true;
}

export function HeroArt() {
  const [use3d, setUse3d] = useState(false);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setUse3d(canRun3d()); }, []);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-rendered still of the 3D portal */}
      <img src="/brand/hero-portal.webp" alt="" width={720} height={807} className={`hero-still${isReady ? " is-hidden" : ""}`} fetchPriority="high" decoding="async" />
      {use3d && <HeroVisual onReady={() => setIsReady(true)} />}
    </>
  );
}
