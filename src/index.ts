import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ics from "ics";
import { number, z } from "zod";
import {
  anchor,
  getCurrentDate,
  getEventsForPattern,
  totalDaysInPattern,
  type EventPattern,
} from "./schedule";
import { Hono } from "hono";

type Env = {
  ChroneyMCP: DurableObjectNamespace<ChroneyMCP>;
};

const app = new Hono<{ Bindings: Env }>();

export { getEventsForPattern, type EventPattern };

export class ChroneyMCP extends McpAgent {
  server = new McpServer({
    name: "Authless calendar Mcp",
    version: "1.0.0",
  });
  async init() {
    this.server.tool(
      "get-current-day-of-pattern",
      "Get the current day of pattern",
      {
        pattern: z
          .array(
            z.object({
              type: z.enum(["event", "placeholder"]),
              span: z.number().min(1),
              desc: z.string(),
              title: z.string(),
            }),
          )
          .describe("Array of schedule pattern elements"),
        indexOfCurrentEvent: z
          .number()
          .describe("the index that represents the current event"),
        offset: z.number().describe("the number of days into said event"),
      },
      {
        title: "Get current Day of Pattern",
        description: "Calculates the last day to occur in the pattern",
      },
      (params) => {
        const totalDays = anchor(
          params.pattern,
          params.indexOfCurrentEvent,
          params.offset,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `currentDayOfPattern: ${totalDays}`,
            },
          ],
        };
      },
    );
    this.server.tool(
      "get-total-days-in-pattern",
      "Calculate total days in a schedule pattern",
      {
        pattern: z
          .array(
            z.object({
              type: z.enum(["event", "placeholder"]),
              span: z.number().min(1),
              desc: z.string(),
              title: z.string(),
            }),
          )
          .describe("Array of schedule pattern elements"),
      },
      {
        title: "Get Total Days in Pattern",
        description:
          "Calculates the total number of days in a repeating schedule pattern",
      },
      (params) => {
        const totalDays = totalDaysInPattern(params.pattern);
        return {
          content: [
            {
              type: "text" as const,
              text: `totalPatternDays: ${totalDays}`,
            },
          ],
        };
      },
    );
    this.server.tool(
      "get-current-date-string",
      "Get current date string",
      {},
      {
        title: "Get Current Date",
        description: "Returns the current date in YYYY-MM-DD format",
      },
      (_) => {
        return {
          content: [
            {
              type: "text" as const,
              text: `startDate: ${getCurrentDate()}`,
            },
          ],
        };
      },
    );
    this.server.tool(
      "generate-schedule-events",
      {
        pattern: z
          .array(
            z.object({
              type: z.enum(["event", "placeholder"]),
              span: z.number().min(1),
              desc: z.string(),
              title: z.string(),
            }),
          )
          .describe("Array of schedule pattern elements"),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        currentDayOfPattern: z
          .number()
          .min(0)
          .describe("Current day offset within the pattern (0-based)"),
        totalDays: z
          .number()
          .min(1)
          .describe("Total number of days to generate events for"),
        textOnly: z
          .boolean()
          .default(true)
          .describe("Return text format instead of ICS calendar data"),
      },
      {
        title: "Generate Schedule Events",
        description:
          "Generates calendar events based on a repeating work schedule pattern",
      },
      (params) => {
        const totalPatternDays = totalDaysInPattern(params.pattern);
        const result = getEventsForPattern(
          params.pattern,
          params.startDate,
          totalPatternDays,
          params.currentDayOfPattern,
          params.totalDays,
          params.textOnly,
        );

        if (params.textOnly) {
          return {
            content: [
              {
                type: "text" as const,
                text: result as string,
              },
            ],
          };
        } else {
          const events = result as ics.EventAttributes[];
          const icsResult = ics.createEvents(events);

          return {
            content: [
              {
                type: "text" as const,
                text: `Generated ${events.length} calendar events.\n\nICS Calendar Data:\n${icsResult.error ? "Error generating ICS" : icsResult.value}`,
              },
            ],
          };
        }
      },
    );
  }
}

app.mount("/sse", ChroneyMCP.serveSSE("/sse").fetch, {
  replaceRequest: false,
});

app.mount("/mcp", ChroneyMCP.serve("/mcp").fetch, {
  replaceRequest: false,
});

export default app;
