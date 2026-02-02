# Feature Specification: Norce Checkout Control MVP

**Feature Branch**: `001-nco-control-mvp`
**Created**: 2026-01-30
**Status**: Draft
**Input**: Build Norce Checkout Control MVP - CLI and web interface for managing Norce Checkout configurations as code

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validate Local Configurations (Priority: P1)

As a checkout configuration owner, I want to validate my local YAML configuration files against their JSON schemas so that I catch errors before attempting to deploy changes to the live system.

**Why this priority**: Validation is the foundation of safe configuration management. Without validation, users cannot trust that their configurations are correct, making all other operations risky. This provides immediate value even without remote API access.

**Independent Test**: Can be fully tested with local YAML files and cached JSON schemas. Delivers value by catching configuration errors immediately during development.

**Acceptance Scenarios**:

1. **Given** a project with valid YAML configuration files, **When** user runs `ncoctl validate`, **Then** the system reports success with exit code 0.

2. **Given** a project with a YAML file that violates its JSON schema, **When** user runs `ncoctl validate`, **Then** the system reports clear validation errors including file path, field name, and expected format, with exit code 1.

3. **Given** a project with YAML files referencing `$schema` URLs, **When** user runs `ncoctl validate` for the first time, **Then** schemas are fetched from the URLs and cached locally for future use.

4. **Given** a channel configuration that inherits from a root configuration, **When** user runs `ncoctl validate`, **Then** the merged configuration is validated (not just the channel override file).

---

### User Story 2 - Preview Configuration Changes (Priority: P2)

As a checkout configuration owner, I want to see exactly what changes would be made before applying them so that I can review the impact and avoid accidental deployments.

**Why this priority**: Preview capability is essential for safe deployment workflows. It builds user confidence and enables code review of configuration changes. Depends on validation working first.

**Independent Test**: Can be tested by comparing local YAML against a mock or real remote API. Delivers value by showing field-level differences between local and remote states.

**Acceptance Scenarios**:

1. **Given** a local configuration that differs from the remote API state, **When** user runs `ncoctl plan`, **Then** the system shows a field-level diff with added fields (green/+), removed fields (red/-), and changed fields (yellow/~).

2. **Given** a local configuration with `${VAR}` placeholders, **When** user runs `ncoctl plan`, **Then** placeholders are substituted from the `.env` file before comparison.

3. **Given** a new channel that doesn't exist remotely, **When** user runs `ncoctl plan`, **Then** the system shows the channel as "to create" with all its configurations.

4. **Given** configurations that exist remotely but not locally (unmanaged), **When** user runs `ncoctl plan`, **Then** unmanaged configurations are counted but not shown in detail (no diff, no planned deletion).

5. **Given** local configurations that match remote state exactly, **When** user runs `ncoctl plan`, **Then** the system reports "no changes" with summary counts.

---

### User Story 3 - Apply Configuration Changes (Priority: P3)

As a checkout configuration owner, I want to apply my local configurations to the remote system with confirmation so that I can deploy changes safely and confidently.

**Why this priority**: This completes the core plan/apply workflow. Depends on both validation and plan working first. This is when changes actually affect the live system.

**Independent Test**: Can be tested by applying configurations to a test/staging environment. Delivers value by enabling safe deployment of configuration changes.

**Acceptance Scenarios**:

1. **Given** pending changes shown by `ncoctl plan`, **When** user runs `ncoctl apply` and confirms at the prompt, **Then** configurations are updated via the Configuration API and success/failure is reported for each.

2. **Given** pending changes, **When** user runs `ncoctl apply --yes`, **Then** confirmation is skipped and changes are applied immediately.

3. **Given** a validation error in local configurations, **When** user runs `ncoctl apply`, **Then** the apply is blocked and validation errors are shown (no remote changes made).

4. **Given** an API error during apply (e.g., network failure), **When** apply fails, **Then** the system reports which configurations succeeded and which failed, with error details.

---

### User Story 4 - Initialize New Project (Priority: P4)

As a new user, I want to initialize a new nco-control project with sensible defaults so that I can quickly start managing my checkout configurations.

**Why this priority**: Improves onboarding experience but users could manually create the config files. Provides convenience, not core functionality.

**Independent Test**: Can be tested by running `ncoctl init` in an empty directory and verifying the created files.

**Acceptance Scenarios**:

1. **Given** an empty directory, **When** user runs `ncoctl init`, **Then** the system creates `ncoctl.config.yaml` with documented defaults, `.env.example` with placeholder variables, and `.gitignore` with appropriate entries.

2. **Given** an existing `ncoctl.config.yaml`, **When** user runs `ncoctl init`, **Then** the system warns that project already exists and does not overwrite (unless `--force` flag used).

---

### User Story 5 - Compare Two Channels (Priority: P5)

As a checkout configuration owner, I want to compare two channels side-by-side so that I can identify differences and ensure consistency or understand why a feature works on one channel but not another.

**Why this priority**: Valuable for debugging and standardization, but not essential for the core plan/apply workflow. Enhances productivity once basic operations work.

**Independent Test**: Can be tested with two local channel configurations. Delivers value by quickly showing what differs between channels.

**Acceptance Scenarios**:

1. **Given** two channels with different configurations, **When** user selects both channels in the comparison view, **Then** the system shows a side-by-side diff highlighting all differences at the field level.

2. **Given** two channels, **When** user views comparison, **Then** they can filter to show only differences or show all fields.

---

### User Story 6 - Web Interface Overview (Priority: P6)

As a checkout configuration owner, I want a visual interface for browsing configurations so that I can more easily understand and navigate complex configuration structures.

**Why this priority**: Provides better UX than CLI for exploration and comparison tasks, but all functionality is also available via CLI. This is a "nice to have" that improves productivity.

**Independent Test**: Can be tested by starting `ncoctl serve` and navigating the web UI. Delivers value through visual browsing of channels and configurations.

**Acceptance Scenarios**:

1. **Given** a configured project, **When** user runs `ncoctl serve`, **Then** a web interface opens in the browser showing all channels and their configurations.

2. **Given** the web interface is running, **When** user selects a channel, **Then** they see all configurations for that channel with merged/resolved values and validation status.

3. **Given** the web interface, **When** user navigates to the Plan view, **Then** they see pending changes and can trigger apply (with confirmation).

---

### Edge Cases

- What happens when a YAML file has syntax errors (not schema errors)? System reports YAML parse errors with line numbers.
- What happens when a schema URL is unreachable? System reports network error and suggests checking connectivity or schema URL.
- What happens when `.env` file references an undefined variable? System reports which variables are missing before plan/apply.
- What happens when a channel directory contains no `.yaml` files? Directory is ignored (not treated as a channel).
- What happens when root and channel configs have different `$schema` versions? Inheritance is skipped; channel config used as-is.
- What happens when merging configurations with array fields? Arrays are replaced, not concatenated (channel array overwrites root).
- What happens when a channel config sets a field to `null`? The field is explicitly removed from the merged result.

## Requirements *(mandatory)*

### Functional Requirements

#### Project Configuration
- **FR-001**: System MUST read project configuration from `ncoctl.config.yaml` including merchant identifier and API base URL.
- **FR-002**: System MUST support reading API tokens from environment variables (precedence: env var > config file).
- **FR-003**: System MUST auto-discover channels by finding directories containing `.yaml` files (excluding directories starting with `.` or `_`, and `node_modules`).

#### Configuration Loading
- **FR-004**: System MUST parse YAML configuration files preserving all fields including `$schema` and `id`.
- **FR-005**: System MUST support configuration inheritance where channel files inherit from root files with the same name.
- **FR-006**: System MUST require explicit opt-in for inheritance (channel file must contain `id` field to inherit).
- **FR-007**: System MUST perform deep merge with channel values overriding root values at field level.
- **FR-008**: System MUST replace arrays entirely (not concatenate) during merge.
- **FR-009**: System MUST remove fields when channel sets them to `null`.
- **FR-010**: System MUST skip inheritance when `$schema` differs between root and channel (prevent cross-version mixing).

#### Schema Validation
- **FR-011**: System MUST fetch JSON schemas from `$schema` URLs in configuration files.
- **FR-012**: System MUST cache fetched schemas locally with configurable TTL (default 24 hours).
- **FR-013**: System MUST validate merged configurations against their JSON schemas.
- **FR-014**: System MUST report validation errors with file path, field path, and human-readable description.

#### Secret Management
- **FR-015**: System MUST substitute `${VAR}` placeholders from `.env` file at plan/apply time.
- **FR-016**: System MUST report missing environment variables before attempting API operations.
- **FR-017**: System MUST NOT log, display in output, or persist actual secret values.

#### Plan Operations
- **FR-018**: System MUST compare local merged configurations against remote API state.
- **FR-019**: System MUST generate field-level diffs showing added, removed, and changed values.
- **FR-020**: System MUST support `--verbose` flag to show unchanged configs and full unmanaged list.
- **FR-021**: System MUST support `--json` flag for machine-readable output.
- **FR-022**: System MUST count unmanaged configurations (exist remotely, not locally) without showing diffs or planning deletions.

#### Apply Operations
- **FR-023**: System MUST run validation and plan before apply.
- **FR-024**: System MUST prompt for confirmation before making remote changes (unless `--yes` flag).
- **FR-025**: System MUST apply changes via PUT to Configuration API.
- **FR-026**: System MUST report success/failure for each configuration with error details.

#### CLI Interface
- **FR-027**: System MUST provide `ncoctl validate` command for local validation.
- **FR-028**: System MUST provide `ncoctl plan` command for previewing changes.
- **FR-029**: System MUST provide `ncoctl apply` command for deploying changes.
- **FR-030**: System MUST provide `ncoctl serve` command for starting web interface.
- **FR-031**: System MUST provide `ncoctl init` command for project initialization.
- **FR-032**: System MUST use exit codes: 0 (success), 1 (validation/apply errors), 2 (fatal errors).
- **FR-033**: System MUST support `--channel` flag to target specific channels.

#### Web Interface
- **FR-034**: System MUST serve a web interface on localhost (default port 6274).
- **FR-035**: System MUST display channel list with validation status indicators.
- **FR-036**: System MUST display merged configuration values for selected channels.
- **FR-037**: System MUST provide side-by-side channel comparison view.
- **FR-038**: System MUST provide plan view showing pending changes with apply capability.
- **FR-039**: System MUST display `"${VAR}"` placeholder in UI instead of actual secret values.

### Key Entities

- **Project**: A directory containing `ncoctl.config.yaml` and channel configurations. Represents one merchant's checkout setup. Key attributes: merchant identifier, API base URL, schema cache settings.

- **Channel**: A directory containing one or more YAML configuration files. Represents a specific checkout channel (e.g., "se-klarna", "fi-adyen"). Key attributes: name (directory name), configurations, validation status.

- **Configuration**: A YAML file defining adapter settings. Has a schema URL, identifier, and adapter-specific fields. Can inherit from root-level configurations. Key attributes: `$schema`, `id`, adapter-specific settings.

- **Plan**: The result of comparing local state to remote state. Contains list of channels with their configuration diffs. Key attributes: channel plans, summary counts (creates, updates, unchanged, unmanaged).

- **ConfigDiff**: The difference between local and remote for a single configuration. Key attributes: config name, status (create/update/delete/unchanged), field-level changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can validate a project with 10 channels and 50 configuration files in under 10 seconds (excluding initial schema fetch).

- **SC-002**: Users can preview changes for a typical project (10 channels) in under 30 seconds.

- **SC-003**: 100% of configuration errors are caught by validation before reaching the remote API.

- **SC-004**: Users can complete the full plan/apply workflow (edit YAML, plan, review, apply) in under 5 minutes for typical changes.

- **SC-005**: Channel comparison correctly identifies all field-level differences between two channels.

- **SC-006**: Secret values are never exposed in CLI output, web UI display, or log files.

- **SC-007**: Users can initialize a new project and make their first successful apply within 15 minutes of starting.

- **SC-008**: The web interface loads and displays channel overview within 3 seconds for projects with up to 20 channels.

- **SC-009**: Configuration inheritance correctly merges 3+ levels of nesting without data loss or unexpected overwrites.

- **SC-010**: System correctly handles all edge cases (YAML errors, network failures, missing variables) with clear error messages that guide users to resolution.

## Assumptions

The following assumptions were made based on the existing specification documents:

1. **Single merchant per repository**: Each nco-control project manages configurations for one merchant only. Multi-merchant setups use separate repositories.

2. **Bearer token authentication**: API authentication uses Bearer tokens. Token management and refresh are outside the tool's scope.

3. **Configuration API availability**: The Configuration API endpoints documented in `api.md` are stable and available for all supported environments.

4. **JSON Schema availability**: Adapter schemas are served at the URLs specified in `$schema` fields and follow JSON Schema Draft-07 or Draft-2020-12.

5. **Standard web conventions**: Web interface follows standard accessibility guidelines and works in modern browsers (Chrome, Firefox, Safari, Edge).

6. **Local development focus**: The tool runs locally on developer machines. CI/CD integration is documented but not built-in.
