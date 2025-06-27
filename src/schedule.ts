import ics from "ics";
import { en } from "zod/v4/locales";

export type EventPattern = {
  type: "event" | "placeholder";
  span: number;
  desc: string;
  title: string;
};

export function getCurrentDate() {
  const now = new Date();
  const mstOffset = -7 * 60; // MST is UTC-7 (or UTC-6 for MDT, but using MST as requested)
  const mstTime = new Date(now.getTime() + (mstOffset * 60 * 1000));
  return mstTime.toISOString().slice(0, 10);
}

export function totalDaysInPattern(pattern: EventPattern[]) {
  return pattern.reduce((a, b) => a + b.span, 0);
}

export function anchor(
  pattern: EventPattern[],
  indexOfCurrentEvent: number,
  offset: number,
) {
  console.log(pattern[indexOfCurrentEvent]);
  return totalDaysInPattern(pattern.slice(0, indexOfCurrentEvent + 1)) - offset;
}

export function getEventsForPattern(
  pattern: EventPattern[],
  start: string,
  totalDaysInPattern: number,
  currentDayOfPattern: number,
  totalDays: number,
  textOnly: boolean = true,
): string | ics.EventAttributes[] {
  console.log(start);
  const startDate = new Date(start + 'T00:00:00-07:00'); // Parse as MST
  const eventsByDay = pattern.flatMap((r) => {
    return new Array(r.span).fill(r);
  });
  let currentIndex = currentDayOfPattern - 1;

  if (textOnly) {
    const textEvents: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const entry = eventsByDay[currentIndex + i];
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + i);
      if (entry.type == "event") {
        textEvents.push(
          `${entry.title}\n  Date: ${eventDate.toLocaleDateString('en-US', { 
            timeZone: 'America/Denver',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}\n  Description: ${entry.desc}`,
        );
      }
    }
    console.log(textEvents);
    return textEvents.join("\n\n");
  } else {
    const events: ics.EventAttributes[] = [];
    for (let i = 0; i < totalDays; i++) {
      const entry = eventsByDay[(currentIndex + i) % totalDaysInPattern];
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + i);
      if (entry.type == "event") {
        events.push({
          start: [
            eventDate.getFullYear(),
            eventDate.getMonth() + 1,
            eventDate.getDate(),
          ],
          title: entry.title,
          description: entry.desc,
          duration: { days: 1 },
        });
      }
    }
    return events;
  }
}
