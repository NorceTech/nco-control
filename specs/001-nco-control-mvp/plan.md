# Implementation Plan: Norce Checkout Control MVP

**Branch**: `001-nco-control-mvp` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-nco-control-mvp/spec.md`

## Summary

Build a configuration management tool for Norce Checkout that enables:
1. **CLI (`ncoctl`)** - Validate, plan, and apply YAML configurations against a remote Configuration API
2. **Web Interface** - Visual browsing, comparison, and plan/apply workflow

The tool follows a plan/apply pattern (like Terraform) where users edit local YAML files, preview changes with `ncoctl plan`, and deploy with `ncoctl apply`. Configuration inheritance allows shared settings at the root level with per-channel overrides.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 20 (LTS)
**Primary Dependencies**: Commander.js (CLI), Hono (web server), React 18 + Mantine 7 (web UI), Ajv (schema validation), js-yaml (YAML parsing), deep-diff (diffing)
**Storage**: Local filesystem (YAML configs, schema cache); remote Configuration API
**Testing**: Vitest (unit/integration), Playwright (E2E for web)
**Target Platform**: macOS, Linux, Windows (Node.js)
**Project Type**: Monorepo with three packages (core, cli, web)
**Performance Goals**: Validate 50 configs in <10s; plan 10 channels in <30s; web UI loads in <3s
**Constraints**: Must run locally without network for validation; secrets never logged/displayed
**Scale/Scope**: Single merchant, up to 20 channels, ~50 configuration files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Simplicity Over Cleverness | PASS | Uses well-established libraries (Commander, Hono, React); no custom build tools; follows proven patterns from nocc prototype |
| II. Validation First | PASS | FR-011 through FR-014 require validation before plan/apply; exit codes support CI |
| III. Explicit Over Automatic | PASS | Inheritance requires `id` field opt-in; no auto-deletion of unmanaged configs; apply requires confirmation |
| IV. Core-First Architecture | PASS | Three-package structure with all business logic in `@nco-control/core`; CLI and web are thin wrappers |
| V. Safe by Default | PASS | FR-017, FR-024 ensure secrets not logged and apply requires confirmation; `.env` in `.gitignore` |

**Constitution Check Result**: All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-nco-control-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
nco-control/
├── package.json                    # Root package (npm workspaces)
├── tsconfig.json                   # Shared TypeScript config
├── vitest.config.ts                # Shared test config
├── packages/
│   ├── core/                       # @nco-control/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Public API exports
│   │       ├── api/
│   │       │   ├── client.ts       # Configuration API client
│   │       │   ├── client.test.ts
│   │       │   └── types.ts
│   │       ├── config/
│   │       │   ├── loader.ts       # Load YAML files
│   │       │   ├── loader.test.ts
│   │       │   ├── project.ts      # Project config parsing
│   │       │   ├── project.test.ts
│   │       │   └── discovery.ts    # Channel discovery
│   │       ├── merge/
│   │       │   ├── deep-merge.ts   # Deep merge algorithm
│   │       │   ├── deep-merge.test.ts
│   │       │   └── hierarchy.ts    # Merge order
│   │       ├── diff/
│   │       │   ├── differ.ts       # Compare configs
│   │       │   ├── differ.test.ts
│   │       │   └── formatter.ts    # Format diffs
│   │       ├── schema/
│   │       │   ├── fetcher.ts      # Fetch schemas from URLs
│   │       │   ├── cache.ts        # Schema caching
│   │       │   ├── validator.ts    # Ajv validation
│   │       │   └── validator.test.ts
│   │       ├── secrets/
│   │       │   ├── env.ts          # Load .env files
│   │       │   └── substitute.ts   # Replace ${VAR}
│   │       ├── plan/
│   │       │   ├── service.ts      # Plan orchestration
│   │       │   ├── service.test.ts
│   │       │   └── types.ts
│   │       └── types/
│   │           └── index.ts        # Shared types
│   │
│   ├── cli/                        # @nco-control/cli
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── bin/
│   │   │   └── ncoctl.ts           # CLI entry point
│   │   └── src/
│   │       ├── index.ts
│   │       ├── commands/
│   │       │   ├── init.ts
│   │       │   ├── validate.ts
│   │       │   ├── plan.ts
│   │       │   ├── apply.ts
│   │       │   └── serve.ts
│   │       ├── output/
│   │       │   ├── console.ts      # Terminal formatting
│   │       │   └── json.ts         # JSON output mode
│   │       └── __tests__/
│   │           ├── helpers/
│   │           │   ├── cli-runner.ts
│   │           │   ├── assertions.ts
│   │           │   └── fixtures.ts
│   │           ├── validate.test.ts
│   │           ├── plan.test.ts
│   │           └── apply.test.ts
│   │
│   └── web/                        # @nco-control/web
│       ├── package.json
│       ├── tsconfig.json
│       ├── server/
│       │   ├── index.ts            # Hono server entry
│       │   ├── routes/
│       │   │   ├── channels.ts     # List + detail (includes configs)
│       │   │   ├── validate.ts
│       │   │   ├── plan.ts
│       │   │   ├── apply.ts
│       │   │   └── compare.ts
│       │   └── middleware/
│       │       └── error.ts
│       ├── client/
│       │   ├── index.html
│       │   ├── vite.config.ts
│       │   └── src/
│       │       ├── App.tsx
│       │       ├── main.tsx
│       │       ├── components/
│       │       │   ├── Layout.tsx
│       │       │   ├── Sidebar.tsx
│       │       │   ├── ChannelList.tsx
│       │       │   ├── ConfigView.tsx
│       │       │   ├── DiffView.tsx
│       │       │   └── PlanView.tsx
│       │       ├── hooks/
│       │       │   ├── useChannels.ts
│       │       │   └── usePlan.ts
│       │       └── stores/
│       │           └── app.ts      # Zustand store
│       └── e2e/
│           └── plan-workflow.spec.ts
│
└── specification/                  # Design documents (reference)
```

**Structure Decision**: Monorepo with npm workspaces. Three packages follow Constitution Principle IV (Core-First Architecture). All business logic in `core`; `cli` and `web` are thin wrappers.

## Complexity Tracking

No Constitution violations. All complexity is justified by the three-package requirement in the constitution.
