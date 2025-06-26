import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ics from "ics";
import { z } from "zod";
import {
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
              text: getCurrentDate(),
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
      },
      {
        title: "Generate Schedule Events",
        description:
          "Generates calendar events based on a repeating work schedule pattern",
      },
      (params) => {
        const totalPatternDays = totalDaysInPattern(params.pattern);
        const events = getEventsForPattern(
          params.pattern,
          params.startDate,
          totalPatternDays,
          params.currentDayOfPattern,
          params.totalDays,
        );

        const icsResult = ics.createEvents(events);

        const result = {
          events: events.length,
          icsString: icsResult.error ? "Error generating ICS" : icsResult.value,
          error: icsResult.error?.message || null,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `Generated ${events.length} calendar events.\n\nICS Calendar Data:\n${result.icsString || "Error occurred"}`,
            },
          ],
        };
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
