# Tasks: Norce Checkout Control MVP

**Input**: Design documents from `/specs/001-nco-control-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification. Omitted from task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo with three packages:
- `packages/core/src/` - Shared business logic
- `packages/cli/src/` - CLI wrapper
- `packages/web/` - Web server and React client

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure

- [x] T001 Create root package.json with npm workspaces configuration at package.json
- [x] T002 [P] Create root tsconfig.json with shared TypeScript settings at tsconfig.json
- [x] T003 [P] Create root vitest.config.ts with shared test configuration at vitest.config.ts
- [x] T004 [P] Create .gitignore with node_modules, dist, .env, .ncoctl at .gitignore
- [x] T005 [P] Create .prettierrc.json with formatting rules at .prettierrc.json
- [x] T006 [P] Create .eslintrc.json with linting rules at .eslintrc.json
- [x] T007 Create packages/core/package.json with core dependencies (ajv, js-yaml, deep-diff) at packages/core/package.json
- [x] T008 [P] Create packages/core/tsconfig.json extending root config at packages/core/tsconfig.json
- [x] T009 Create packages/cli/package.json with CLI dependencies (commander) at packages/cli/package.json
- [x] T010 [P] Create packages/cli/tsconfig.json extending root config at packages/cli/tsconfig.json
- [x] T011 Create packages/web/package.json with web dependencies (hono, react, mantine, zustand) at packages/web/package.json
- [x] T012 [P] Create packages/web/tsconfig.json extending root config at packages/web/tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Types

- [x] T013 Define shared types (ProjectConfig, Channel, ChannelConfig, Configuration, ValidationError) in packages/core/src/types/index.ts
- [x] T014 [P] Define plan types (Plan, ChannelPlan, ConfigPlan, FieldDiff, PlanSummary) in packages/core/src/plan/types.ts
- [x] T015 [P] Define apply types (ApplyResult, ConfigApplyResult, ApplySummary) in packages/core/src/types/index.ts

### Project Configuration Loading

- [x] T016 Implement project config loader (load ncoctl.config.yaml, validate required fields) in packages/core/src/config/project.ts
- [x] T017 [P] Implement environment variable loading (.env file parsing) in packages/core/src/secrets/env.ts

### Channel Discovery

- [x] T018 Implement channel discovery (find directories with .yaml files, exclude ., _, node_modules) in packages/core/src/config/discovery.ts

### YAML Loading

- [x] T019 Implement YAML file loader (parse YAML, preserve $schema and id fields) in packages/core/src/config/loader.ts

### Configuration Inheritance & Merge

- [x] T020 Implement deep merge algorithm (field-level merge, array replacement, null removal) in packages/core/src/merge/deep-merge.ts
- [x] T021 Implement hierarchy resolver (determine merge order, check $schema match, require id for inheritance) in packages/core/src/merge/hierarchy.ts

### Core Public API

- [x] T022 Create core package exports (re-export all public APIs) in packages/core/src/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Validate Local Configurations (Priority: P1) 🎯 MVP

**Goal**: Users can validate local YAML configurations against JSON schemas before deployment

**Independent Test**: Run `ncoctl validate` with local YAML files and cached schemas. Verify valid configs return exit code 0, invalid configs return exit code 1 with clear error messages.

### Schema Validation Infrastructure

- [x] T023 [US1] Implement schema fetcher (fetch JSON schema from URL) in packages/core/src/schema/fetcher.ts
- [x] T024 [US1] Implement schema cache (store schemas locally with TTL, default 24h, respect cacheTtl from ProjectConfig) in packages/core/src/schema/cache.ts
- [x] T025 [US1] Implement Ajv validator (validate config against schema, format errors with file/field paths) in packages/core/src/schema/validator.ts

### Validation Orchestration

- [x] T026 [US1] Implement validation service (orchestrate load→merge→validate for all channels) in packages/core/src/validate/service.ts

### CLI Validate Command

- [x] T027 [US1] Create CLI entry point with Commander.js setup in packages/cli/bin/ncoctl.ts
- [x] T028 [US1] Implement console output formatter (colors, symbols, diff formatting) in packages/cli/src/output/console.ts
- [x] T029 [US1] Implement JSON output formatter in packages/cli/src/output/json.ts
- [x] T030 [US1] Implement validate command (--channel, --json flags, exit codes 0/1/2) in packages/cli/src/commands/validate.ts
- [x] T031 [US1] Create CLI package exports in packages/cli/src/index.ts

**Checkpoint**: User Story 1 complete - `ncoctl validate` works independently

---

## Phase 4: User Story 2 - Preview Configuration Changes (Priority: P2)

**Goal**: Users can see field-level diffs between local configs and remote API state before applying

**Independent Test**: Run `ncoctl plan` to see creates/updates/unchanged. Verify secrets are substituted from .env, diffs show +/-/~ for field changes.

### Secret Substitution

- [x] T032 [US2] Implement secret substitution (replace ${VAR} placeholders from .env) in packages/core/src/secrets/substitute.ts

### Configuration API Client

- [x] T033 [US2] Define API client types (request/response types for Configuration API) in packages/core/src/api/types.ts
- [x] T034 [US2] Implement Configuration API client (list channels, list/get/put configs) in packages/core/src/api/client.ts

### Diffing

- [x] T035 [US2] Implement config differ (compare two config objects, return FieldDiff array) in packages/core/src/diff/differ.ts
- [x] T036 [US2] Implement diff formatter (format diffs as text with colors) in packages/core/src/diff/formatter.ts

### Plan Orchestration

- [x] T037 [US2] Implement plan service (validate→substitute→fetch remote→diff→generate plan) in packages/core/src/plan/service.ts

### CLI Plan Command

- [x] T038 [US2] Implement plan command (--channel, --verbose, --json flags, exit codes) in packages/cli/src/commands/plan.ts

**Checkpoint**: User Story 2 complete - `ncoctl plan` works independently

---

## Phase 5: User Story 3 - Apply Configuration Changes (Priority: P3)

**Goal**: Users can safely deploy local configurations to remote API with confirmation

**Independent Test**: Run `ncoctl apply` to push changes. Verify confirmation prompt (unless --yes), success/failure reported per config.

### Apply Service

- [x] T039 [US3] Implement apply service (run plan, iterate configs, PUT to API, collect results) in packages/core/src/apply/service.ts

### CLI Apply Command

- [x] T040 [US3] Implement confirmation prompt helper in packages/cli/src/output/prompt.ts
- [x] T041 [US3] Implement apply command (--channel, --yes, --json flags, exit codes) in packages/cli/src/commands/apply.ts

**Checkpoint**: User Story 3 complete - `ncoctl apply` works independently

---

## Phase 6: User Story 4 - Initialize New Project (Priority: P4)

**Goal**: New users can quickly scaffold a new nco-control project

**Independent Test**: Run `ncoctl init` in empty directory. Verify ncoctl.config.yaml, .env.example, .gitignore created.

### Init Service

- [x] T042 [US4] Implement init service (generate config template, .env.example, gitignore entries) in packages/core/src/init/service.ts
- [x] T043 [US4] Define default config templates (ncoctl.config.yaml content, .env.example content) in packages/core/src/init/templates.ts

### CLI Init Command

- [x] T044 [US4] Implement init command (--force flag, exit codes) in packages/cli/src/commands/init.ts

**Checkpoint**: User Story 4 complete - `ncoctl init` works independently

---

## Phase 7: User Story 5 - Compare Two Channels (Priority: P5)

**Goal**: Users can compare two channels side-by-side to identify differences

**Independent Test**: Use web UI to select two channels and view side-by-side diff.

### Compare Service

- [x] T045 [US5] Implement compare service (load two channels, diff all matching configs) in packages/core/src/compare/service.ts
- [x] T046 [US5] Define compare types (CompareResult, ConfigComparison) in packages/core/src/compare/types.ts

**Checkpoint**: User Story 5 compare logic complete - ready for web integration

---

## Phase 8: User Story 6 - Web Interface Overview (Priority: P6)

**Goal**: Users can browse and manage configurations through a visual web interface

**Independent Test**: Run `ncoctl serve` and open http://localhost:6274. Verify channel list, config view, plan view, compare view work.

### Web Server (Hono)

- [x] T047 [US6] Create Hono server entry point in packages/web/server/index.ts
- [x] T048 [P] [US6] Implement error handling middleware in packages/web/server/middleware/error.ts
- [x] T049 [US6] Implement GET /api/channels route (list channels) in packages/web/server/routes/channels.ts
- [x] T050 [US6] Implement GET /api/channels/:channel route (get channel detail) in packages/web/server/routes/channels.ts
- [x] T051 [P] [US6] Implement GET /api/validate route (run validation) in packages/web/server/routes/validate.ts
- [x] T052 [P] [US6] Implement GET /api/plan route (generate plan) in packages/web/server/routes/plan.ts
- [x] T053 [P] [US6] Implement POST /api/apply route (apply changes) in packages/web/server/routes/apply.ts
- [x] T054 [P] [US6] Implement GET /api/compare route (compare channels) in packages/web/server/routes/compare.ts

### Web Client Setup

- [x] T055 [US6] Create Vite config for React client in packages/web/client/vite.config.ts
- [x] T056 [US6] Create index.html entry point in packages/web/client/index.html
- [x] T057 [US6] Create React app entry (main.tsx, App.tsx with Mantine provider) in packages/web/client/src/main.tsx and packages/web/client/src/App.tsx
- [x] T058 [US6] Implement Zustand store for app state in packages/web/client/src/stores/app.ts

### Web Client Components

- [x] T059 [US6] Implement Layout component (sidebar + main content area) in packages/web/client/src/components/Layout.tsx
- [x] T060 [US6] Implement Sidebar component (navigation) in packages/web/client/src/components/Sidebar.tsx
- [x] T061 [US6] Implement ChannelList component (show all channels with status) in packages/web/client/src/components/ChannelList.tsx
- [x] T062 [US6] Implement ConfigView component (show merged config values) in packages/web/client/src/components/ConfigView.tsx
- [x] T063 [US6] Implement DiffView component (show field-level diffs, include filter toggle for "differences only" vs "all fields") in packages/web/client/src/components/DiffView.tsx
- [x] T064 [US6] Implement PlanView component (show plan, trigger apply) in packages/web/client/src/components/PlanView.tsx

### Web Client Hooks

- [x] T065 [US6] Implement useChannels hook (fetch channels from API) in packages/web/client/src/hooks/useChannels.ts
- [x] T066 [US6] Implement usePlan hook (fetch plan from API) in packages/web/client/src/hooks/usePlan.ts

### CLI Serve Command

- [x] T067 [US6] Implement serve command (--port, --no-open flags) in packages/cli/src/commands/serve.ts

**Checkpoint**: User Story 6 complete - web interface fully functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T068 Add npm scripts to root package.json (build, dev, test, lint, format)
- [x] T069 [P] Verify NO_COLOR and FORCE_COLOR environment variable handling in CLI output
- [x] T070 [P] Ensure secrets are never logged (audit all console.log/console.error calls)
- [x] T071 Run quickstart.md validation (test init→validate→plan→apply workflow end-to-end)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): No story dependencies
  - User Story 2 (Phase 4): Depends on US1 (validation must work)
  - User Story 3 (Phase 5): Depends on US2 (plan must work)
  - User Story 4 (Phase 6): No story dependencies (can run parallel with US1)
  - User Story 5 (Phase 7): Depends on US1 (validation/loading must work)
  - User Story 6 (Phase 8): Depends on US1-5 (all core features needed)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS ALL)
    ↓
    ├── Phase 3: US1 - Validate (P1) 🎯 MVP
    │       ↓
    │   Phase 4: US2 - Plan (P2)
    │       ↓
    │   Phase 5: US3 - Apply (P3)
    │
    └── Phase 6: US4 - Init (P4) [can run parallel with US1]
    │
    └── Phase 7: US5 - Compare (P5) [depends on US1]
            ↓
        Phase 8: US6 - Web Interface (P6) [depends on US1-5]
            ↓
        Phase 9: Polish
```

### Within Each User Story

- Models/types before services
- Services before CLI commands
- CLI commands before integration
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - US1 and US4 can start in parallel (different features)
  - US5 can start after US1
  - US2 starts after US1
  - US3 starts after US2
- Within user stories:
  - All tasks marked [P] can run in parallel
  - Web server routes marked [P] can run in parallel
  - Web client components can be developed in parallel with server routes

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T013 (types) completes, launch in parallel:
Task: "Define plan types in packages/core/src/plan/types.ts"
Task: "Define apply types in packages/core/src/types/index.ts"

# After T016 (project config) completes, launch in parallel:
Task: "Implement environment variable loading in packages/core/src/secrets/env.ts"
```

---

## Parallel Example: Phase 8 (Web Interface)

```bash
# After T049 (channels route) completes, launch server routes in parallel:
Task: "Implement GET /api/validate route in packages/web/server/routes/validate.ts"
Task: "Implement GET /api/plan route in packages/web/server/routes/plan.ts"
Task: "Implement POST /api/apply route in packages/web/server/routes/apply.ts"
Task: "Implement GET /api/compare route in packages/web/server/routes/compare.ts"

# Client components can be developed in parallel with server:
Task: "Implement Layout component in packages/web/client/src/components/Layout.tsx"
Task: "Implement Sidebar component in packages/web/client/src/components/Sidebar.tsx"
Task: "Implement ChannelList component in packages/web/client/src/components/ChannelList.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Validate)
4. **STOP and VALIDATE**: Test `ncoctl validate` independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test `ncoctl validate` → Deploy/Demo (MVP!)
3. Add User Story 2 → Test `ncoctl plan` → Deploy/Demo
4. Add User Story 3 → Test `ncoctl apply` → Deploy/Demo
5. Add User Story 4 → Test `ncoctl init` → Deploy/Demo
6. Add User Story 5 → Test compare service → Deploy/Demo
7. Add User Story 6 → Test web interface → Deploy/Demo (Full Feature!)
8. Each story adds value without breaking previous stories

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1: Validate)**

This delivers immediate value by catching configuration errors before deployment, even without remote API access. Users can validate their YAML files against schemas locally.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
