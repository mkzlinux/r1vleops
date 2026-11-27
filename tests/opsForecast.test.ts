import { describe, expect, test } from "vitest";
import { dailyActivity, forecast } from "@/lib/opsForecast";
import { seedOrders } from "@/lib/data/seed";
import { advanceOrder } from "@/lib/orders";

const now = new Date(Date.UTC(2026, 10, 25, 12));

describe("ops forecast", () => {
  test("headline leads with new requests when there are any", () => {
    const f = forecast(seedOrders(), now);
    expect(f.headline).toMatch(/1 new request/);
    expect(f.summary).toMatch(/3 projects in production/);
    expect(f.summary).toMatch(/\$297\.50/); // pending deposit
  });

  test("calm pipeline reads as clear skies", () => {
    const closed = seedOrders().map((o) => advanceOrder(o, { stage: "closed", progress: 100, note: "" }, now));
    expect(forecast(closed, now).headline).toMatch(/clear skies/i);
    expect(forecast([], now).headline).toMatch(/clear skies/i);
  });

  test("steady build when work is active but nothing new", () => {
    const orders = seedOrders().filter((o) => o.stage !== "awaiting_deposit");
    expect(forecast(orders, now).headline).toMatch(/3 projects in flight/);
  });

  test("daily activity covers the last 7 days ending today", () => {
    const days = dailyActivity(seedOrders(), now, 7);
    expect(days).toHaveLength(7);
    expect(days[6].isToday).toBe(true);
    expect(days[6].label).toBe("Wed");
    const total = days.reduce((n, d) => n + d.value, 0);
    expect(total).toBeGreaterThan(0);
  });
});
