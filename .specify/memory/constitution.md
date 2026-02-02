<!--
  Sync Impact Report
  ===================
  Version change: Initial → 1.0.0

  Added principles:
  - I. Simplicity Over Cleverness
  - II. Validation First
  - III. Explicit Over Automatic
  - IV. Core-First Architecture
  - V. Safe by Default

  Added sections:
  - Technical Constraints
  - Development Workflow
  - Governance

  Templates checked:
  - ✅ .specify/templates/plan-template.md - Constitution Check section exists
  - ✅ .specify/templates/spec-template.md - Requirements section compatible
  - ✅ .specify/templates/tasks-template.md - Phase structure compatible

  Deferred items: None
-->

# Norce Checkout Control (nco-control) Constitution

## Core Principles

### I. Simplicity Over Cleverness

Prefer straightforward, well-documented solutions over cutting-edge or complex implementations.

- MUST favor explicit code over "magic" abstractions
- MUST avoid over-engineering; only implement what is directly requested
- MUST NOT add features, refactor code, or make improvements beyond what was asked
- MUST keep solutions focused on the current task, not hypothetical future requirements
- SHOULD choose libraries and patterns that Claude understands well (prioritize developer velocity)

**Rationale:** This project is built 100% with Claude Code. Technology choices and implementation patterns must favor simplicity and clarity to maximize AI-assisted development effectiveness.

### II. Validation First

Validate configurations against their schemas before any remote changes are made.

- MUST validate local configurations against JSON schemas before plan/apply operations
- MUST report validation errors with clear, actionable messages
- MUST use exit codes that support CI integration (0 = success, 1 = validation errors, 2 = fatal errors)
- MUST NOT allow invalid configurations to reach the remote API
- SHOULD cache schemas locally to avoid repeated fetches

**Rationale:** Early validation catches errors before they affect live systems, providing a safety net that enables confident configuration management.

### III. Explicit Over Automatic

Users define their configuration structure manually. No auto-generation or "magic" inference.

- MUST require explicit user action for all changes (plan shows diff, apply requires confirmation)
- MUST require explicit opt-in for inheritance (channel file with `id` field inherits from root)
- MUST NOT auto-generate configurations or infer structure from remote state
- MUST NOT delete remote configurations that are not managed locally (unmanaged configs stay untouched)
- SHOULD show clear previews of all operations before execution

**Rationale:** Predictable, trustworthy behavior builds user confidence. Users should understand exactly what the tool will do before it does it.

### IV. Core-First Architecture

All business logic lives in the core package. CLI and web are thin wrappers.

- MUST implement business logic in `@nco-control/core` (API client, merge, diff, validate, plan)
- MUST keep CLI package (`@nco-control/cli`) limited to command parsing, terminal formatting, and prompts
- MUST keep web package (`@nco-control/web`) limited to HTTP routing and React UI
- MUST NOT duplicate business logic across packages
- SHOULD design core functions to be framework-agnostic

**Rationale:** Shared core ensures consistent behavior between CLI and web interfaces while avoiding duplication. Testing effort concentrates on the core package where business logic lives.

### V. Safe by Default

Protect users from accidental data loss and credential exposure.

- MUST require confirmation for apply operations (unless explicitly bypassed with `--yes`)
- MUST substitute secrets (`${VAR}`) only at plan/apply time, never commit actual values
- MUST ensure `.env` files are in `.gitignore` (init command creates appropriate entries)
- MUST NOT log, display, or persist actual secret values
- MUST NOT perform destructive operations on remote configurations without explicit user intent
- SHOULD show `"${VAR}"` placeholder in web UI instead of actual values

**Rationale:** Configuration management tools have direct access to production systems. Conservative defaults prevent accidents while still allowing power users to opt into faster workflows.

## Technical Constraints

Mandatory technology and structural requirements for this project.

### Language and Runtime
- TypeScript with strict type checking (no `any` without justification)
- Node.js >= 20 (LTS) for native fetch and ES modules
- ES modules (`import`/`export`), not CommonJS

### Project Structure
- npm workspaces monorepo with three packages: `core`, `cli`, `web`
- One component per file
- Co-locate tests with source (`foo.ts` → `foo.test.ts`)
- Export from `index.ts` for clean imports

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, and React components
- `kebab-case` for file names
- `SCREAMING_SNAKE_CASE` for constants

### Dependencies
- Commander.js for CLI commands
- Hono for web server
- React + Mantine for web UI
- Ajv for JSON Schema validation
- js-yaml for YAML parsing
- Vitest for testing

## Development Workflow

Guidelines for consistent development practices.

### Testing
- Use Vitest for all tests
- Test core package thoroughly (where business logic lives)
- CLI and web packages can have lighter testing (integration-focused)
- Core functions should be independently testable without mocking framework internals

### Code Review Focus
- Does the change follow Simplicity Over Cleverness?
- Is business logic in core, not in CLI/web wrappers?
- Are secrets handled safely?
- Does the change require explicit user action where appropriate?

### Configuration as Code Workflow
1. User edits local YAML files
2. `ncoctl plan` shows diff between local and remote
3. User reviews changes
4. `ncoctl apply` pushes changes (with confirmation)
5. Changes are version-controlled with meaningful git diffs

## Governance

### Amendment Process
1. Propose change with rationale
2. Document impact on existing code and templates
3. Update constitution with version increment
4. Update dependent templates and documentation

### Version Policy
- MAJOR: Backward-incompatible principle changes or removals
- MINOR: New principles added or existing principles materially expanded
- PATCH: Clarifications, wording improvements, non-semantic changes

### Compliance
- All code changes must be verifiable against these principles
- Constitution supersedes other practices when conflicts arise
- Complexity beyond these constraints requires explicit justification in plan documents

**Version**: 1.0.0 | **Ratified**: 2026-01-30 | **Last Amended**: 2026-01-30
