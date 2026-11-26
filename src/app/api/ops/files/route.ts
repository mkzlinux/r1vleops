import { getBackend, requireOperator, respond } from "@/server/backend";
import { StoreError } from "@/server/sqlStore";

export const dynamic = "force-dynamic";

/** Operator: short-lived download link for a client file. */
export function GET(req: Request) {
  return respond(async () => {
    await requireOperator();
    const key = new URL(req.url).searchParams.get("key") ?? "";
    const name = new URL(req.url).searchParams.get("name") ?? "file";
    if (!/^[\w-]+\/\d+-[\w.-]+$/.test(key)) throw new StoreError("Invalid file.");
    return { url: await (await getBackend()).r2.downloadUrl(key, name) };
  });
}
