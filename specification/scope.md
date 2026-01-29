# Scope

This document defines the MVP scope and feature roadmap for nco-control.

## MVP Goal

Enable teams to manage Norce Checkout configurations as code, with the ability to:
- Define configurations in version-controlled YAML files
- Preview changes before applying them
- Compare channels to understand differences
- Apply changes safely with confirmation

## MVP Features

### CLI (`ncoctl`)

#### `ncoctl validate`
Validate local configuration files against their JSON schemas.
- Fetch schemas from `$schema` URLs (with local caching)
- Report validation errors with clear messages
- Exit code indicates success/failure for CI integration

#### `ncoctl plan`
Preview what changes would be made to remote configurations.
- Compare local YAML files against remote API state
- Show field-level diffs (added, removed, changed)
- Substitute `${VAR}` placeholders from `.env` before comparison
- Report unmanaged configurations (exist remotely but not locally)

#### `ncoctl apply`
Apply local configurations to the remote API.
- Run validation and plan first
- Require explicit confirmation (or `--yes` flag)
- Apply changes via PUT to Configuration API
- Report success/failure for each configuration

#### `ncoctl serve`
Start a local web interface.
- Serve web UI on localhost (e.g., `http://localhost:6274`)
- Provide API endpoints for the web UI to use
- Open browser automatically

### Web Interface

#### Overview
- List all channels in the local project
- Show which configurations each channel has
- Indicate validation status (valid/invalid/unknown)

#### Channel View
- Show all configurations for a selected channel
- Display merged/resolved values (after inheritance)
- Syntax-highlighted YAML/JSON view

#### Compare View
- Select two channels to compare
- Show side-by-side diff of all configurations
- Highlight differences at field level
- Filter to show only differences or show all

#### Plan View
- Trigger `plan` operation
- Display pending changes (local vs remote)
- Allow triggering `apply` with confirmation

### Configuration Structure

Each repository manages **one merchant**. Channels can share base configurations with per-channel overrides.

**Conceptual example** (exact structure TBD):

```
project/
├── ncoctl.config.yaml       # Project settings (merchant, API URL, etc.)
├── .env                     # Secrets (gitignored)
├── norce_adapter.yaml       # Shared configuration (applies to all channels)
├── store-se-klarna/
│   ├── klarna_checkout_adapter.yaml
│   └── norce_adapter.yaml   # Channel-specific overrides
├── store-se-walley/
│   ├── walley_checkout_adapter.yaml
│   └── norce_adapter.yaml   # Channel-specific overrides
└── ...
```

The folder structure and inheritance mechanism will be refined during implementation. Key requirements:
- Shared configs that apply across channels
- Per-channel overrides
- No collision between folder names and channel names

### Secret Management

- Secrets stored in `.env` file (gitignored)
- Referenced in YAML: `identityClientSecret: "${NORCE_IDENTITY_SECRET}"`
- Substituted at plan/apply time
- Web UI shows placeholder, not actual value

## Out of Scope for MVP

### Pull Command
Fetching existing configurations from API to bootstrap local files. Users will:
- Manually create YAML files based on API responses
- Use provided sample configurations as templates

**Rationale:** Pull with auto-optimization adds significant complexity. Starting without it keeps MVP simpler.

### Multi-Environment Support
Supporting stage/production environments with inheritance.

**Rationale:** Can be added after core workflow is proven.

### Channel Groupings
Intermediate inheritance levels for grouping channels (e.g., by shipping provider).

**Rationale:** Start with base + channel; add groupings when real use cases emerge.

## Post-MVP Roadmap

### Phase 2: Production Ready
- Bearer token authentication support
- Multi-environment support (stage/prod)
- `ncoctl pull` command (simple, no auto-optimization)
- Improved documentation

### Phase 3: Advanced Features
- Channel groupings (intermediate inheritance levels)
- Configuration templates/presets
- Audit log of changes
- CI/CD pipeline integration examples

### Phase 4: Polish
- Improved web UI (search, filter, bulk operations)
- Keyboard shortcuts
- Export/import functionality
- Diff against specific git commits

## Success Criteria for MVP

1. Channels can be represented in local YAML files
2. `ncoctl plan` correctly shows differences from remote
3. `ncoctl apply` successfully updates configurations
4. Web interface allows comparing any two channels
5. Changes are version-controlled in git with meaningful diffs
