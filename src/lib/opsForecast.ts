import { formatUsd } from "./orders";
import { depositPosition, summarize } from "./opsStats";
import type { Order } from "./types";

/** Weather-style read of the business for the ops dashboard header. */
export interface Forecast {
  readonly headline: string;
  readonly summary: string;
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

export function forecast(orders: readonly Order[], now: Date): Forecast {
  const s = summarize(orders);
  const deposits = depositPosition(orders);
  const inReview = orders.filter((o) => o.stage === "in_review").length;
  const thisWeek = orders.filter((o) => now.getTime() - new Date(o.createdAt).getTime() < 7 * 86_400_000).length;

  const headline = s.requests > 0
    ? `Busy front with ${plural(s.requests, "new request")}`
    : s.active > 0
      ? `Steady build, ${plural(s.active, "project")} in flight`
      : "Clear skies, quiet pipeline";

  const summary = [
    `${plural(s.active, "project")} in production${inReview > 0 ? `, ${inReview} awaiting client review` : ""}.`,
    `${formatUsd(deposits.pending)} in deposits expected, ${formatUsd(deposits.collected)} collected.`,
    `${plural(thisWeek, "order")} landed this week across ${plural(s.clients, "client")}.`,
  ].join(" ");

  return { headline, summary };
}

export interface DayActivity {
  readonly label: string;
  readonly value: number;
  readonly isToday: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Activity per day (orders created + updates logged) for the last `days` days, oldest first. */
export function dailyActivity(orders: readonly Order[], now: Date, days = 7): DayActivity[] {
  const dayKey = (d: Date): string => d.toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  for (const o of orders) {
    for (const u of o.updates) counts.set(dayKey(new Date(u.at)), (counts.get(dayKey(new Date(u.at))) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 86_400_000);
    return { label: DAY_LABELS[d.getUTCDay()], value: counts.get(dayKey(d)) ?? 0, isToday: i === days - 1 };
  });
}
