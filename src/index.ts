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

// Re-export for tests
export { getEventsForPattern, type EventPattern };

/*
my buddy hudson works 6 on, 2 off, 5 on 2 off, 3 on, 2 off, 5 on, 3 off, and then it repeats
i want to put in my calendar what days he has off for this month

- get the current date
- get total days in pattern
- totalDays for schedule based on start date
- ask a follow up question to get where you are in the pattern, are we in the 3 on, 2 off cycle?
- we then request a list of events for said pattern and return them to the user

*/

export class ChroneyServer extends McpAgent {
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

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return ChroneyServer.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return ChroneyServer.serve("/mcp").fetch(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
