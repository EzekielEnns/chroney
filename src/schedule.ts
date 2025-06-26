import ics from "ics";

export type EventPattern = {
  type: "event" | "placeholder";
  span: number;
  desc: string;
  title: string;
};

export function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

export function totalDaysInPattern(pattern: EventPattern[]) {
  return pattern.reduce((a, b) => a + b.span, 0);
}

export function getEventsForPattern(
  pattern: EventPattern[],
  start: string,
  totalDaysInPattern: number,
  currentDayOfPattern: number,
  totalDays: number,
) {
  const startDate = new Date(start);
  const events: ics.EventAttributes[] = [];
  const eventsByDay = pattern.flatMap((r) => {
    return new Array(r.span).fill(r);
  });
  let currentIndex = currentDayOfPattern;
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

