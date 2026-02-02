# nco-control Development Guide

This file provides context for Claude Code when working on this project.

## Project Overview

**nco-control** (Norce Checkout Control) is a configuration management tool for Norce Checkout. It provides:
- CLI (`ncoctl`) for validating, planning, and applying configuration changes
- Web interface for visualizing and comparing channel configurations

The project builds on learnings from **nocc**, a CLI prototype that validated the core workflow.

## Project Status

Currently in **specification phase**. See `specification/` for design documents.

## Build Commands

Once implementation begins:
```bash
npm install              # Install dependencies
npm run build            # Build all packages
npm run dev              # Development mode with watch
npm test                 # Run tests
npm run lint             # Lint code
npm run format           # Format code with Prettier
```

## Code Style Guidelines

- Use TypeScript with strict type checking
- Use ES modules (import/export), not CommonJS
- Use async/await for asynchronous operations
- Implement proper error handling with try/catch

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, and React components
- `kebab-case` for file names
- `SCREAMING_SNAKE_CASE` for constants

### React Patterns
- Use functional components with hooks
- Keep components small and focused on single responsibility
- Extract business logic to core package, not in components

### File Organization
- One component per file
- Co-locate tests with source (`foo.ts` → `foo.test.ts`)
- Export from index.ts files for clean imports

## Project Organization

```
nco-control/
├── packages/
│   ├── core/           # Shared business logic (API client, merge, diff, validate)
│   ├── cli/            # Commander.js CLI wrapper
│   └── web/            # Hono server + React client
├── specification/      # Public design documents
└── .internal/          # Internal notes (gitignored)
```

### Core Package (`@nco-control/core`)
Framework-agnostic business logic. Both CLI and web depend on this.
- `api/` - Configuration API client
- `config/` - Load YAML files, project config
- `merge/` - Deep merge with inheritance
- `diff/` - Compare configurations
- `schema/` - JSON Schema validation
- `secrets/` - Environment variable substitution
- `plan/` - Orchestrate plan generation

### CLI Package (`@nco-control/cli`)
Thin wrapper adding:
- Command parsing (Commander.js)
- Terminal output formatting
- Interactive prompts

### Web Package (`@nco-control/web`)
- `server/` - Hono HTTP server exposing core via REST
- `client/` - React + Mantine SPA

## Key Concepts

### Configuration Hierarchy
Base configurations can be overridden per-channel:
```
norce_adapter.yaml          # Shared defaults
store-se-klarna/
  norce_adapter.yaml        # Channel-specific overrides (merged with base)
```

### Plan/Apply Workflow
1. User edits local YAML files
2. `ncoctl plan` shows diff between local and remote
3. `ncoctl apply` pushes changes to API (with confirmation)

### Secret Handling
- Secrets stored in `.env` (gitignored)
- Referenced as `${VAR_NAME}` in YAML
- Substituted at plan/apply time, never committed

## Testing

- Use Vitest for unit tests
- Test core business logic thoroughly
- CLI/web can have lighter testing (integration)

## Documentation

- `specification/` - Design documents
- `.internal/` - Local notes and reference material (gitignored)

When adding features, update specification docs if the public API changes.

## Active Technologies
- TypeScript 5.x on Node.js >= 20 (LTS) + Commander.js (CLI), Hono (web server), React 18 + Mantine 7 (web UI), Ajv (schema validation), js-yaml (YAML parsing), deep-diff (diffing) (001-nco-control-mvp)
- Local filesystem (YAML configs, schema cache); remote Configuration API (001-nco-control-mvp)

## Recent Changes
- 001-nco-control-mvp: Added TypeScript 5.x on Node.js >= 20 (LTS) + Commander.js (CLI), Hono (web server), React 18 + Mantine 7 (web UI), Ajv (schema validation), js-yaml (YAML parsing), deep-diff (diffing)
