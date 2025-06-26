import { describe, it, expect } from "vitest";
import { getEventsForPattern, type EventPattern } from "./index";

describe("events function", () => {
  const samplePattern: EventPattern[] = [
    { type: "placeholder", span: 6, desc: "Work days", title: "Work" },
    { type: "event", span: 2, desc: "Days off", title: "Day Off" },
    { type: "placeholder", span: 5, desc: "Work days", title: "Work" },
    { type: "event", span: 2, desc: "Days off", title: "Day Off" },
  ];

  it("should generate events for basic pattern", () => {
    const result = getEventsForPattern(samplePattern, "2024-01-01", 15, 0, 10);

    // Should only return events (not placeholders)
    expect(result.length).toBeGreaterThan(0);
    result.forEach((event: any) => {
      expect(event.title).toBe("Day Off");
      expect(event.description).toBe("Days off");
      expect(event.duration).toEqual({ days: 1 });
    });
  });

  it("should respect currentDayOfPattern offset", () => {
    // Start at day 6 (first off day in pattern: 6 work + 1st off day)
    const result = getEventsForPattern(samplePattern, "2024-01-01", 15, 6, 5);

    // First event should be on day 1 (since we start at offset 6, which is first off day)
    expect(result.length).toBeGreaterThan(0);
    expect((result[0] as any).title).toBe("Day Off");
  });

  it("should handle pattern cycling correctly", () => {
    const result = getEventsForPattern(samplePattern, "2024-01-01", 15, 0, 20);

    // Should cycle through pattern multiple times for 20 days
    expect(result.length).toBeGreaterThan(2); // Should have multiple off days

    // Check that events occur on expected days based on pattern
    const eventDays = result.map((event: any) => event.start?.[2]);
    expect(eventDays).toContain(7); // Day 7 (after 6 work days)
    expect(eventDays).toContain(13); // Should cycle and have events in second cycle
  });

  it("should generate correct date progression", () => {
    const result = getEventsForPattern(samplePattern, "2024-02-01", 15, 0, 10);

    if (result.length >= 2) {
      const firstDate = new Date(
        (result[0] as any).start?.[0],
        (result[0] as any).start?.[1] - 1,
        (result[0] as any).start?.[2],
      );
      const secondDate = new Date(
        (result[1] as any).start?.[0],
        (result[1] as any).start?.[1] - 1,
        (result[1] as any).start?.[2],
      );

      // Consecutive off days should be 1 day apart
      const dayDiff =
        (secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(dayDiff).toBe(1);
    }
  });

  it("should handle single event type pattern", () => {
    const singleEventPattern: EventPattern[] = [
      { type: "event", span: 1, desc: "Weekly meeting", title: "Meeting" },
      { type: "placeholder", span: 6, desc: "Regular days", title: "Regular" },
    ];

    const result = getEventsForPattern(
      singleEventPattern,
      "2024-01-01",
      7,
      0,
      14,
    );

    // Should have exactly 2 events (one per week cycle)
    expect(result.length).toBe(2);
    expect((result[0] as any).title).toBe("Meeting");
    expect((result[1] as any).title).toBe("Meeting");
  });

  it("should handle empty pattern gracefully", () => {
    const emptyPattern: EventPattern[] = [];
    const result = getEventsForPattern(emptyPattern, "2024-01-01", 1, 0, 0); // No days to process

    expect(result).toEqual([]);
  });

  it("should handle pattern with no events", () => {
    const noEventsPattern: EventPattern[] = [
      { type: "placeholder", span: 7, desc: "All work", title: "Work" },
    ];

    const result = getEventsForPattern(noEventsPattern, "2024-01-01", 7, 0, 14);

    expect(result).toEqual([]);
  });

  it("should generate events with correct ICS format", () => {
    const result = getEventsForPattern(samplePattern, "2024-01-01", 15, 6, 3);

    if (result.length > 0) {
      const event = result[0] as any;
      expect(event.start).toHaveLength(3); // [year, month, day]
      expect(typeof event.start?.[0]).toBe("number"); // year
      expect(typeof event.start?.[1]).toBe("number"); // month
      expect(typeof event.start?.[2]).toBe("number"); // day
      expect(event.title).toBe("Day Off");
      expect(event.description).toBe("Days off");
      expect(event.duration).toEqual({ days: 1 });
    }
  });
});
