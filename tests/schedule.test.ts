import { describe, expect, it } from "vitest";
import { nextDigestRun, periodForDate } from "../src/services/schedule";

describe("periodForDate", () => {
  it("uses morning before the evening digest hour", () => {
    expect(periodForDate(new Date(2026, 4, 7, 9, 0, 0))).toBe("morning");
    expect(periodForDate(new Date(2026, 4, 7, 19, 59, 0))).toBe("morning");
  });

  it("uses evening from 20:00 onward", () => {
    expect(periodForDate(new Date(2026, 4, 7, 20, 0, 0))).toBe("evening");
    expect(periodForDate(new Date(2026, 4, 7, 23, 30, 0))).toBe("evening");
  });
});

describe("nextDigestRun", () => {
  it("schedules 09:00 when the day has not reached morning run yet", () => {
    const next = nextDigestRun(new Date(2026, 4, 7, 8, 30, 0));

    expect(next.period).toBe("morning");
    expect(next.date.getHours()).toBe(9);
    expect(next.date.getMinutes()).toBe(0);
  });

  it("schedules 20:00 between morning and evening runs", () => {
    const next = nextDigestRun(new Date(2026, 4, 7, 12, 0, 0));

    expect(next.period).toBe("evening");
    expect(next.date.getHours()).toBe(20);
    expect(next.date.getDate()).toBe(7);
  });

  it("schedules next day morning after the evening run", () => {
    const next = nextDigestRun(new Date(2026, 4, 7, 21, 0, 0));

    expect(next.period).toBe("morning");
    expect(next.date.getHours()).toBe(9);
    expect(next.date.getDate()).toBe(8);
  });
});

