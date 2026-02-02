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

#### `ncoctl init`
Initialize a new nco-control project.
- Generate `ncoctl.config.yaml` with sensible defaults
- Create `.env.example` for secret placeholders
- Create `.gitignore` with appropriate entries
- Show default excludes so users know what's auto-excluded

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

### Project Configuration (`ncoctl.config.yaml`)

```yaml
# Required fields
merchant: norcecheckouttest

api:
  baseUrl: https://configuration.checkout.test.internal.norce.tech
  # token: "${NCOCTL_API_TOKEN}"  # Optional, can use env var instead

# Optional fields (with defaults)
schema:
  cacheDir: .ncoctl/schemas    # Where to cache JSON schemas
  cacheTtl: 86400              # Cache TTL in seconds (24 hours)
  skip: false                  # Skip schema validation

output:
  format: text                 # "text" or "json"
  verbose: false               # Verbose output by default
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `merchant` | Yes | - | Merchant identifier for API calls |
| `api.baseUrl` | Yes | - | Configuration API base URL |
| `api.token` | No | - | Bearer token (env var `NCOCTL_API_TOKEN` takes precedence) |
| `schema.cacheDir` | No | `.ncoctl/schemas` | Schema cache directory |
| `schema.cacheTtl` | No | `86400` | Schema cache TTL (seconds) |
| `schema.skip` | No | `false` | Skip schema validation |
| `output.format` | No | `text` | Default output format |
| `output.verbose` | No | `false` | Verbose output by default |

### Channel Discovery

Channels are auto-discovered based on directory structure:

```
project/
├── ncoctl.config.yaml          # Project config (not a channel)
├── .env                        # Secrets (not a channel)
├── .git/                       # Ignored (starts with .)
├── .ncoctl/                    # Ignored (starts with .)
├── node_modules/               # Ignored (explicit)
├── norce_adapter.yaml          # Root shared config
├── klarna_checkout_adapter.yaml
├── se-klarna/                  # ✅ Channel (has .yaml files)
│   ├── norce_adapter.yaml
│   └── klarna_checkout_adapter.yaml
├── se-klarna-ingrid/           # ✅ Channel
│   └── ...
└── docs/                       # Ignored (no .yaml files)
    └── README.md
```

**Discovery rules:**
1. List all directories in project root
2. Exclude: directories starting with `.` or `_`, and `node_modules`
3. A directory is a channel if it contains at least one `.yaml` file
4. The directory name IS the channel name (sent to API as-is)

**Root shared configs:**
- `.yaml` files in project root (not in a subdirectory) are shared configs
- Channels inherit from root configs via the inheritance mechanism (see Architecture)

### Configuration Structure

Each repository manages **one merchant**. Channels can share base configurations with per-channel overrides.

```
project/
├── ncoctl.config.yaml       # Project settings
├── .env                     # Secrets (gitignored)
├── norce_adapter.yaml       # Shared - all channels inherit
├── klarna_checkout_adapter.yaml  # Shared - Klarna channels inherit
├── se-klarna/
│   ├── klarna_checkout_adapter.yaml  # Overrides (must have `id` field)
│   └── norce_adapter.yaml            # Overrides
├── se-walley/
│   ├── walley_checkout_adapter.yaml
│   └── norce_adapter.yaml
└── ...
```

**Inheritance rule:** A channel inherits from a root config only when:
1. The channel has a file with the **same name**
2. The channel file contains at least the **`id` field**

This ensures explicit opt-in - channels without the file don't inherit.

**Merge behavior:**
- Objects are deep-merged (channel values override root values)
- Arrays are **replaced**, not concatenated
- `null` explicitly **removes** a field: `fieldName: null` removes the inherited value
- If `$schema` differs between root and channel, inheritance is skipped (prevents cross-version mixing)

See [Architecture](./architecture.md#merge-engine-merge) for detailed examples.

### Unmanaged Configurations

Configurations that exist remotely but not locally are **unmanaged**:
- `plan` ignores them (no diff shown)
- `apply` does not delete them
- They remain on the remote API untouched

This is intentional - ncoctl only manages what's in the repo. To delete a configuration, use the API directly or a future `ncoctl delete` command.

### Secret Management

- Secrets stored in `.env` file (gitignored)
- Referenced in YAML: `identityClientSecret: "${NORCE_IDENTITY_SECRET}"`
- Substituted at plan/apply time
- Web UI shows placeholder, not actual value

### Default Excludes

Some configurations are auto-generated by admin/checkout and typically don't need manual management. The tool excludes these by default:

- `admin_meta` - Auto-generated list of which adapters exist on the channel
- `checkout_application` - Auto-generated checkout settings
- `checkout_layout_*` - Auto-generated layout configurations
- `checkout_meta_*` - Auto-generated meta/styling configurations

**Behavior:**
- These are excluded from `plan` and `apply` by default
- `ncoctl init` generates config showing these defaults explicitly
- Users can override by adding configs to an `include` list if needed

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
- **Configuration variants** - Named variants to reduce duplication when multiple channels share the same config variant. See [variants.md](./variants.md).
- Channel groupings (intermediate inheritance levels)
- Configuration templates/presets
- Audit log of changes
- CI/CD pipeline integration examples

### Phase 4: Polish
- Improved web UI (search, filter, bulk operations)
- Keyboard shortcuts
- Export/import functionality
- Diff against specific git commits

### Nice-to-Have (Unscheduled)
- `ncoctl delete` command for removing remote configurations
- Nested channel directories (e.g., `se/klarna/` → channel name `se-klarna`)
- Warnings for directories without .yaml files (potential misconfiguration)
- Channel groupings/intermediate inheritance levels
- Channel exclusion patterns in config (e.g., `exclude.channels: ["demo-*", "test-*"]`)

## Success Criteria for MVP

1. Channels can be represented in local YAML files
2. `ncoctl plan` correctly shows differences from remote
3. `ncoctl apply` successfully updates configurations
4. Web interface allows comparing any two channels
5. Changes are version-controlled in git with meaningful diffs
