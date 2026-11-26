import { describe, expect, test, vi } from "vitest";
import { ApiError, createHttpRepository } from "@/lib/data/httpRepository";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("HTTP repository (Cloudflare mode)", () => {
  test("unwraps the data envelope and sends JSON bodies", async () => {
    const fetcher = vi.fn(async () => json(201, { data: { trackingCode: "R1V-AAAA-BBBB" } }));
    const repo = createHttpRepository(fetcher as unknown as typeof fetch);
    const order = await repo.createOrder({ client: { name: "A", company: "", email: "a@b.co", whatsapp: "+263771234567" }, brief: "", items: [{ serviceId: "cre-logo", qty: 1 }], region: "zw" });
    expect(order.trackingCode).toBe("R1V-AAAA-BBBB");
    expect(fetcher).toHaveBeenCalledWith("/api/orders", expect.objectContaining({ method: "POST" }));
  });

  test("surfaces API error messages with their status", async () => {
    const repo = createHttpRepository((async () => json(401, { error: "Sign in to continue." })) as unknown as typeof fetch);
    await expect(repo.listOrders()).rejects.toMatchObject({ status: 401, message: "Sign in to continue." });
    await expect(repo.listOrders()).rejects.toBeInstanceOf(ApiError);
  });

  test("uploads each file to its presigned URL", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url);
      return url.startsWith("/api/") ? json(200, { data: { uploads: [{ key: "o1/0-a.png", url: "https://r2.example/put-a" }] } }) : new Response(null, { status: 200 });
    });
    const repo = createHttpRepository(fetcher as unknown as typeof fetch);
    const file = new File([new Uint8Array([1, 2])], "a.png", { type: "image/png" });
    const order = await repo.attachFiles({ trackingCode: "R1V-AAAA-BBBB", attachments: [] } as never, [file]);
    expect(calls).toEqual(["/api/orders/R1V-AAAA-BBBB/files", "https://r2.example/put-a"]);
    expect(order.attachments).toEqual([{ key: "o1/0-a.png", name: "a.png", type: "image/png", size: 2 }]);
  });
});
