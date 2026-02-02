# Research: Norce Checkout Control MVP

**Feature**: 001-nco-control-mvp
**Date**: 2026-01-30
**Status**: Complete (no unknowns)

## Overview

This research document consolidates decisions already made during project specification. The `specification/` folder contains detailed rationale for technology choices validated by the **nocc** prototype.

## Technology Decisions

### 1. Language: TypeScript on Node.js

**Decision**: TypeScript 5.x on Node.js >= 20 (LTS)

**Rationale**:
- Claude has excellent TypeScript knowledge (Claude-First Development principle)
- Strong type system catches errors at compile time
- Same language for CLI, server, and web client (reduced context switching)
- Proven in nocc prototype
- Native fetch API and ES modules in Node.js 20+

**Alternatives Considered**:
- Go: Faster binaries but less Claude familiarity; web UI would require separate frontend
- Python: Good for CLIs but weaker typing; harder to share code with React frontend
- Rust: Maximum performance but highest complexity; overkill for this use case

### 2. Monorepo Structure: npm Workspaces

**Decision**: npm workspaces (native)

**Rationale**:
- Built into npm, no extra tooling required
- Simple and well-understood
- Enables shared types between packages
- Avoids complexity of Turborepo, Lerna, pnpm workspaces

**Alternatives Considered**:
- Turborepo: Powerful caching but adds complexity
- Lerna: Deprecated in favor of native workspaces
- pnpm workspaces: Good but requires pnpm adoption

### 3. CLI Framework: Commander.js

**Decision**: Commander.js 12.x

**Rationale**:
- Industry standard for Node.js CLIs
- Well-documented with clear patterns
- Proven in nocc prototype
- Simple declarative command definition
- Good TypeScript support

**Alternatives Considered**:
- oclif: More powerful but more complex, overkill for 5 commands
- yargs: Similar quality, but Commander is more common

### 4. Web Server: Hono

**Decision**: Hono 4.x

**Rationale**:
- Lightweight (~12kb vs Express ~1mb)
- Web standards aligned (native Request/Response)
- TypeScript-native (no @types package)
- Modern and fast

**Alternatives Considered**:
- Express: Industry standard but heavier, not TypeScript-native
- Fastify: Good but Hono is lighter and more modern

### 5. Web Frontend: React + Mantine

**Decision**: React 18 + Mantine 7

**Rationale**:
- React is extremely well-known by Claude
- Mantine provides complete UI components
- Less verbose than Shadcn + Tailwind for developer tools
- Built-in components for tabs, forms, code display

**Alternatives Considered**:
- Vue + Vuetify: Good but less Claude familiarity
- Shadcn + Tailwind: More verbose for component-heavy UIs
- Svelte: Modern but less ecosystem maturity

### 6. Schema Validation: Ajv

**Decision**: Ajv 8.x

**Rationale**:
- Fast and standards-compliant
- Supports JSON Schema Draft-07 and Draft-2020-12
- Proven in nocc prototype
- Good error messages

**Alternatives Considered**:
- Zod: TypeScript-first but doesn't support fetching schemas from URLs
- JSON Schema validators: Ajv is the most performant

### 7. YAML Processing: js-yaml

**Decision**: js-yaml 4.x

**Rationale**:
- Well-maintained and widely used
- Supports YAML 1.1 (sufficient for config files)
- Proven in nocc prototype
- Simple API

**Alternatives Considered**:
- yaml: More YAML 1.2 features but more complex API
- js-yaml with custom types: Not needed for our use case

### 8. Diffing: deep-diff

**Decision**: deep-diff 1.x

**Rationale**:
- Structural diff of JavaScript objects
- Returns machine-readable diff results
- Proven in nocc prototype
- Simple and focused

**Alternatives Considered**:
- json-diff: Similar but less maintained
- Custom implementation: Unnecessary when library exists

### 9. Testing: Vitest + Playwright

**Decision**: Vitest 2.x for unit/integration, Playwright for E2E

**Rationale**:
- Vitest is fast with native ESM support
- Compatible with Jest APIs (familiar patterns)
- Works well with TypeScript and Vite
- Playwright for full web E2E testing

**Alternatives Considered**:
- Jest: Slower, ESM support still evolving
- Cypress: Good but Playwright is faster and more modern

### 10. State Management: Zustand

**Decision**: Zustand 4.x

**Rationale**:
- Minimal and lightweight
- Works well with React
- No boilerplate
- Simple API

**Alternatives Considered**:
- Redux: Too much boilerplate for a simple app
- MobX: More complex than needed
- React Context: Sufficient but Zustand is cleaner

## Integration Patterns

### Configuration API Integration

**Pattern**: Simple REST client with native fetch

**Endpoints Used**:
- `GET /api/v1/configuration/merchants/{merchant}/channels` - List channels
- `GET /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations` - List configs
- `GET /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations/{name}` - Get config
- `PUT /api/v1/configuration/merchants/{merchant}/channels/{channel}/configurations/{name}` - Update config

**Error Handling**:
- Network errors → User-friendly message with retry suggestion
- 401/403 → Token expired/invalid, prompt for new token
- 404 → Channel/config not found (might be new)
- 5xx → Service unavailable, retry later

### Schema Fetching

**Pattern**: Fetch from `$schema` URL with local cache

**Cache Strategy**:
- Cache directory: `.ncoctl/schemas/`
- TTL: 24 hours (configurable)
- Cache key: URL hash
- Bypass: `--no-cache` flag (future)

### Secret Substitution

**Pattern**: Environment variable substitution at plan/apply time

**Syntax**: `${VAR_NAME}` in YAML values
**Source**: `.env` file in project root
**Timing**: After YAML parsing, before validation and API calls

## Best Practices Applied

### From nocc Prototype

1. **Validate before plan**: Always validate configs before comparing to remote
2. **Show merged values**: Display fully-merged config, not just overlay
3. **Field-level diffs**: Show which specific fields changed, not just "config changed"
4. **Explicit inheritance**: Require `id` field to opt into inheritance
5. **Array replacement**: Arrays are replaced, not merged (intentional design choice)

### From Industry Standards

1. **Exit codes**: 0 = success, 1 = validation/apply error, 2 = fatal error
2. **Color control**: Respect NO_COLOR and FORCE_COLOR environment variables
3. **JSON output**: `--json` flag for machine-readable output
4. **Confirmation prompts**: Require confirmation for destructive operations

## Open Questions Resolved

All technical questions were resolved during specification:

| Question | Resolution |
|----------|------------|
| How to handle schema version conflicts? | Skip inheritance if `$schema` differs |
| How to handle unmanaged configs? | Count but don't show diff; never delete |
| How to handle missing env vars? | Report all missing vars before plan/apply |
| How to handle API errors during apply? | Report partial success/failure per config |
| How to handle concurrent edits? | Out of scope for MVP; last-write-wins |

## Conclusion

No additional research required. Technology stack is well-documented in `specification/tech-stack.md` and validated by the nocc prototype. Proceed to Phase 1: Design & Contracts.
