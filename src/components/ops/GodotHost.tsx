"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/data";
import { createOpsBridge } from "@/lib/opsBridge";

const GODOT_ENTRY = "/ops-app/index.html";

type HostState = "checking" | "ready" | "missing";

interface R1vleOpsHost {
  request(method: string, payloadJson: string, callback: (resultJson: string) => void): void;
}

declare global {
  interface Window {
    r1vleOps?: R1vleOpsHost;
  }
}

/**
 * Hosts the Godot web build in a same-origin iframe and installs `window.r1vleOps`, which the
 * Godot side (autoload OpsApi) calls through JavaScriptBridge. Data access goes through the same
 * repository as the rest of the site, so demo (browser) and Supabase modes both work.
 */
export function GodotHost() {
  const [state, setState] = useState<HostState>("checking");

  useEffect(() => {
    const bridge = createOpsBridge(getRepository());
    window.r1vleOps = {
      request(method, payloadJson, callback) {
        if (typeof callback !== "function") return;
        void bridge.request(String(method), String(payloadJson)).then(callback);
      },
    };
    let cancelled = false;
    fetch(GODOT_ENTRY, { method: "HEAD" })
      .then((res) => { if (!cancelled) setState(res.ok ? "ready" : "missing"); })
      .catch(() => { if (!cancelled) setState("missing"); });
    return () => {
      cancelled = true;
      delete window.r1vleOps;
    };
  }, []);

  if (state === "missing") {
    return (
      <div className="ops gate">
        <div className="glass">
          <span className="mode-pill">R1VLE Ops</span>
          <h1>Campus build not found</h1>
          <p className="hint-line">The Godot web export isn&rsquo;t in <span className="mono">public/ops-app/</span> yet. Run <span className="mono">npm run godot:export</span> and redeploy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="godot-host">
      {state === "ready"
        ? <iframe src={GODOT_ENTRY} title="R1VLE Ops campus" allow="fullscreen; autoplay" />
        : <div className="scene-loading">Loading campus…</div>}
    </div>
  );
}
