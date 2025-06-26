# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (starts Wrangler dev server)
- **Deploy**: `npm run deploy` (deploys to Cloudflare Workers with minification)
- **Type generation**: `npm run cf-typegen` (generates CloudflareBindings types from Worker configuration)
- **Package manager**: Uses pnpm (pnpm-lock.yaml present)

## Architecture Overview

This is a Cloudflare Workers application built with:
- **Hono**: Web framework for handling HTTP requests
- **ICS**: Library for generating calendar events
- **TypeScript**: Configured with ESNext target and strict mode

### Core Structure

- **Entry point**: `src/index.ts` - Main Hono application
- **Worker config**: `wrangler.jsonc` - Cloudflare Workers configuration
- **Static assets**: `public/` directory bound as ASSETS
- **Types**: `worker-configuration.d.ts` contains auto-generated Cloudflare bindings

### Application Logic

The main application implements a shift schedule calendar generator:
- Generates calendar events based on work patterns (e.g., "6 on, 2 off, 5 on 2 off" cycles)
- Uses the `events()` function to calculate dates within repeating patterns
- Returns ICS calendar format for integration with calendar apps

### Key Functions

- `totalDaysInPattern()`: Calculates total days in a schedule pattern
- `events()`: Generates calendar events based on pattern, start date, and current position
- `EventPattern` type: Defines work/off day patterns with span and description

### Cloudflare Integration

- Uses `CloudflareBindings` type interface (auto-generated via cf-typegen)
- Configured for observability monitoring
- Static asset serving enabled via ASSETS binding