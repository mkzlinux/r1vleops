// Writes godot/data/demo_snapshot.json: the bridge snapshot for the seed data, so the Godot
// project runs (read-only) in the editor, on desktop and in headless tests.
import { mkdirSync, writeFileSync } from "node:fs";
import { createLocalRepository, memoryStore } from "../src/lib/data/localRepository";
import { createOpsBridge } from "../src/lib/opsBridge";

async function main(): Promise<void> {
  const now = () => new Date(Date.UTC(2026, 10, 25));
  const bridge = createOpsBridge(createLocalRepository(memoryStore(), now), now);
  const res = JSON.parse(await bridge.request("snapshot", "{}")) as { ok: boolean; data?: unknown; error?: string };
  if (!res.ok) throw new Error(res.error);
  mkdirSync("godot/data", { recursive: true });
  writeFileSync("godot/data/demo_snapshot.json", JSON.stringify(res.data, null, 1));
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
