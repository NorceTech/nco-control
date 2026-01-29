# Tech Stack

This document describes the technology choices for nco-control and the rationale behind them.

## Design Principles

1. **Claude-First Development** - This project will be built 100% with Claude and Claude Code. Technology choices should favor languages and frameworks that Claude works well with.

2. **Simplicity Over Cleverness** - Prefer straightforward, well-documented technologies over cutting-edge or complex solutions.

3. **Monorepo with Shared Core** - CLI and web interface share business logic to avoid duplication.

4. **Modern Standards** - Use web standards (ES modules, native fetch) where possible.

## Prior Work: nocc

Several technology choices reference **nocc**, a CLI prototype for Norce Checkout configuration management. nocc validated the core workflow (plan/apply, YAML configs, schema validation) and informed which libraries work well for this problem space. nco-control builds on those learnings while adding a web interface and preparing for public release.

## Language: TypeScript

**Choice:** TypeScript (Node.js)

**Rationale:**
- Claude has excellent TypeScript knowledge and can generate high-quality TS code
- Strong type system catches errors early
- Same language for CLI, server, and web client
- Proven in nocc
- Rich ecosystem for CLI tools, web frameworks, and JSON Schema validation
- Good support for YAML parsing and manipulation

**Node.js Version:** >= 20 (LTS)
- Native fetch API
- ES modules support
- Stable and well-supported

## Monorepo Structure: npm Workspaces

**Choice:** npm workspaces (native)

**Rationale:**
- Simple and built into npm, no extra tooling
- Claude understands it well
- Proven pattern in similar developer tools
- Avoids complexity of Turborepo, Lerna, etc.

**Structure:**
```
packages/
├── core/      # Shared business logic (API client, merge, diff, validate)
├── cli/       # Commander.js CLI
└── web/       # Web interface (server + client)
```

## CLI Framework: Commander.js

**Choice:** Commander.js

**Rationale:**
- Industry standard for Node.js CLIs
- Well-documented with clear patterns
- Proven in nocc
- Simple, declarative command definition
- Good TypeScript support

**Alternatives Considered:**
- `oclif` - More powerful but more complex, overkill for our needs
- `yargs` - Also good, but Commander is more common

## Web Server: Hono

**Choice:** Hono

**Rationale:**
- Lightweight (~12kb vs Express ~1mb)
- Web standards aligned (native Request/Response)
- TypeScript-native (no @types package needed)
- Fast and modern
- Works well with Claude

**Alternatives Considered:**
- `Express` - Industry standard but heavier, not TypeScript-native
- `Fastify` - Good but Hono is lighter and more modern

## Web Frontend: React + Mantine

**Choice:** React 18 with Mantine UI

**Rationale:**
- React is extremely well-known by Claude
- Mantine provides complete UI components including layout primitives
- Less Tailwind verbosity than Shadcn for developer tools
- Built-in components for common patterns (tabs, forms, code display)
- Good TypeScript support

**Why Mantine over Shadcn:**
```tsx
// Mantine - concise
<Stack gap="md">
  <Alert color="yellow" title="Warning">{message}</Alert>
</Stack>

// Shadcn + Tailwind - verbose
<div className="flex flex-col gap-4">
  <div className="flex items-start gap-3 rounded-lg border border-yellow-200
    bg-yellow-50 p-4 text-yellow-800">{message}</div>
</div>
```

For a developer tool focused on displaying configurations and diffs, Mantine's built-in components reduce boilerplate significantly.

## Build Tool: Vite

**Choice:** Vite

**Rationale:**
- Fast development server with HMR
- Simple configuration
- Works well with React and TypeScript
- Industry standard for modern React projects

## Schema Validation: Ajv

**Choice:** Ajv (Another JSON Schema Validator)

**Rationale:**
- Fast and standards-compliant
- Supports JSON Schema Draft-07 and Draft-2020-12
- Proven in nocc
- Can add custom formats for OpenAPI compatibility

## YAML Processing: js-yaml

**Choice:** js-yaml

**Rationale:**
- Well-maintained and widely used
- Supports YAML 1.1 (sufficient for our needs)
- Proven in nocc
- Simple API for parse/stringify

## Diffing: deep-diff

**Choice:** deep-diff

**Rationale:**
- Provides structural diff of JavaScript objects
- Returns machine-readable diff results
- Proven in nocc
- Simple and focused

## HTTP Client: Native fetch

**Choice:** Native fetch API

**Rationale:**
- Built into Node.js 20+
- No external dependencies
- Web standards aligned
- Sufficient for our simple API calls

## Testing: Vitest

**Choice:** Vitest

**Rationale:**
- Fast, modern test runner
- Compatible with Jest APIs (familiar patterns)
- Works well with TypeScript and Vite
- Proven in nocc

## State Management (Web): Zustand

**Choice:** Zustand

**Rationale:**
- Minimal, lightweight state management
- Works well with React
- No boilerplate
- Commonly used in modern React apps

## Summary Table

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.x |
| Runtime | Node.js | >= 20 |
| Monorepo | npm workspaces | native |
| CLI Framework | Commander.js | 12.x |
| Web Server | Hono | 4.x |
| Web Framework | React | 18.x |
| UI Components | Mantine | 7.x |
| Build Tool | Vite | 5.x |
| Schema Validation | Ajv | 8.x |
| YAML | js-yaml | 4.x |
| Diffing | deep-diff | 1.x |
| Testing | Vitest | 2.x |
| State Management | Zustand | 4.x |

## Dependencies to Avoid

- **Heavy frameworks** - No Next.js, Remix (overkill for local tool)
- **Complex state management** - No Redux, MobX
- **CSS-in-JS complexity** - No Styled Components, Emotion
- **Auto-generated clients** - We'll write a simple API client

## Development Tooling

| Tool | Purpose |
|------|---------|
| TypeScript | Type checking |
| ESLint | Linting |
| Prettier | Code formatting |
| Vitest | Unit testing |
