# Architecture

This document describes the technical architecture of nco-control.

## High-Level Overview

```
┌────────────────────────────────────────────────────────────┐
│                        nco-control                         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   @nco-control/core                  │  │
│  │                                                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │  │
│  │  │   api   │ │  config │ │  diff   │ │  schema   │  │  │
│  │  │ client  │ │  loader │ │ engine  │ │ validator │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └───────────┘  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                │  │
│  │  │  merge  │ │ secrets │ │  plan   │                │  │
│  │  │ engine  │ │ handler │ │ service │                │  │
│  │  └─────────┘ └─────────┘ └─────────┘                │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                              │
│              ┌──────────────┼──────────────┐               │
│              │              │              │               │
│              ▼              ▼              ▼               │
│  ┌───────────────┐   ┌───────────────────────────┐         │
│  │ @nco-control/ │   │    @nco-control/web       │         │
│  │      cli      │   │  ┌───────┐ ┌───────────┐  │         │
│  │               │   │  │server │ │  client   │  │         │
│  │  - validate   │   │  │(Hono) │ │  (React)  │  │         │
│  │  - plan       │   │  └───────┘ └───────────┘  │         │
│  │  - apply      │   │                           │         │
│  │  - serve      │   └───────────────────────────┘         │
│  └───────────────┘                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │   Configuration API     │
                │ (checkout-configuration)│
                └─────────────────────────┘
```

## Package Structure

```
nco-control/
├── package.json                    # Root package (workspaces config)
├── packages/
│   ├── core/                       # @nco-control/core
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts            # Public API exports
│   │   │   ├── api/
│   │   │   │   ├── client.ts       # Configuration API client
│   │   │   │   └── types.ts        # API types
│   │   │   ├── config/
│   │   │   │   ├── loader.ts       # Load YAML files from disk
│   │   │   │   ├── project.ts      # Project config (ncoctl.config.yaml)
│   │   │   │   └── discovery.ts    # Find config files in project
│   │   │   ├── merge/
│   │   │   │   ├── hierarchy.ts    # Build merge order
│   │   │   │   └── deep-merge.ts   # Deep merge algorithm
│   │   │   ├── diff/
│   │   │   │   ├── differ.ts       # Compare configs
│   │   │   │   └── formatter.ts    # Format diffs for display
│   │   │   ├── schema/
│   │   │   │   ├── fetcher.ts      # Fetch schemas from URLs
│   │   │   │   ├── cache.ts        # Schema caching
│   │   │   │   └── validator.ts    # Validate with Ajv
│   │   │   ├── secrets/
│   │   │   │   ├── env.ts          # Load .env files
│   │   │   │   └── substitute.ts   # Replace ${VAR} placeholders
│   │   │   ├── plan/
│   │   │   │   ├── service.ts      # Orchestrate plan generation
│   │   │   │   └── types.ts        # Plan result types
│   │   │   └── types/
│   │   │       └── index.ts        # Shared types
│   │   └── tests/
│   │
│   ├── cli/                        # @nco-control/cli
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts            # CLI entry point
│   │   │   ├── commands/
│   │   │   │   ├── validate.ts
│   │   │   │   ├── plan.ts
│   │   │   │   ├── apply.ts
│   │   │   │   └── serve.ts
│   │   │   └── output/
│   │   │       ├── console.ts      # Terminal formatting
│   │   │       └── json.ts         # JSON output mode
│   │   └── bin/
│   │       └── ncoctl.ts           # Executable entry
│   │
│   └── web/                        # @nco-control/web
│       ├── package.json
│       ├── server/
│       │   ├── index.ts            # Hono server entry
│       │   ├── routes/
│       │   │   ├── channels.ts     # /api/channels
│       │   │   ├── configs.ts      # /api/configs
│       │   │   ├── plan.ts         # /api/plan
│       │   │   └── apply.ts        # /api/apply
│       │   └── middleware/
│       │       └── error.ts        # Error handling
│       ├── client/
│       │   ├── index.html
│       │   ├── src/
│       │   │   ├── App.tsx
│       │   │   ├── main.tsx
│       │   │   ├── components/
│       │   │   │   ├── Layout.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   ├── ChannelList.tsx
│       │   │   │   ├── ConfigView.tsx
│       │   │   │   ├── DiffView.tsx
│       │   │   │   └── PlanView.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── useChannels.ts
│       │   │   │   └── usePlan.ts
│       │   │   └── stores/
│       │   │       └── app.ts      # Zustand store
│       │   └── vite.config.ts
│       └── bin/
│           └── start.ts            # Server + client launcher
│
└── specification/                  # This documentation
```

## Core Package (`@nco-control/core`)

The core package contains all business logic and is framework-agnostic. Both CLI and web use it.

### API Client (`api/client.ts`)

```typescript
interface ConfigurationApiClient {
  listChannels(merchant: string): Promise<string[]>;
  getConfigurations(merchant: string, channel: string): Promise<Configuration[]>;
  getConfiguration(merchant: string, channel: string, configName: string): Promise<Configuration>;
  putConfiguration(merchant: string, channel: string, configName: string, config: Configuration): Promise<void>;
}
```

### Config Loader (`config/loader.ts`)

```typescript
interface ConfigLoader {
  loadProject(projectPath: string): Promise<ProjectConfig>;
  loadChannel(channelPath: string): Promise<ChannelConfigs>;
  loadBase(basePath: string): Promise<BaseConfigs>;
}
```

### Merge Engine (`merge/`)

```typescript
interface MergeEngine {
  // Build merged config from base + channel
  merge(base: Configuration | undefined, channel: Configuration): Configuration;

  // Get merge order for a channel
  getMergeOrder(channel: string): string[];
}
```

#### Merge Order

For MVP (single environment):
```
1. Root:    ./{adapter}.yaml           # Shared base config
2. Channel: ./{channel}/{adapter}.yaml # Channel-specific overrides
```

Later values win. Channel overrides root.

#### Deep Merge Algorithm

```typescript
function deepMerge(target, source) {
  // 1. null = explicit removal
  if (source === null) return null;

  // 2. undefined = keep target
  if (source === undefined) return target;

  // 3. Both objects (not arrays) = merge recursively
  if (isObject(target) && isObject(source)) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const merged = deepMerge(target[key], source[key]);
      if (merged === null) {
        delete result[key];  // null removes the key
      } else if (isEmptyObject(merged)) {
        delete result[key];  // empty object also removed
      } else {
        result[key] = merged;
      }
    }
    return result;
  }

  // 4. Otherwise = source wins (arrays replaced, not merged)
  return source;
}
```

#### Edge Cases

| Scenario | Root | Channel | Result |
|----------|------|---------|--------|
| Add field | `{}` | `{a: 1}` | `{a: 1}` |
| Override field | `{a: 1}` | `{a: 2}` | `{a: 2}` |
| **Remove field** | `{a: 1}` | `{a: null}` | `{}` |
| Keep field (implicit) | `{a: 1}` | `{}` | `{a: 1}` |
| Nested merge | `{a: {b: 1}}` | `{a: {c: 2}}` | `{a: {b: 1, c: 2}}` |
| Nested override | `{a: {b: 1}}` | `{a: {b: 2}}` | `{a: {b: 2}}` |
| Nested remove | `{a: {b: 1, c: 2}}` | `{a: {b: null}}` | `{a: {c: 2}}` |
| **Replace array** | `{a: [1,2]}` | `{a: [3]}` | `{a: [3]}` |
| Empty array | `{a: [1,2]}` | `{a: []}` | `{a: []}` |
| Remove array | `{a: [1,2]}` | `{a: null}` | `{}` |

**Key behaviors:**
- `null` explicitly removes a field (useful for removing inherited values)
- Arrays are **replaced**, not concatenated (channel array overwrites root array)
- Empty objects resulting from all-null children are also removed

#### Schema-Aware Merge

To prevent mixing incompatible properties from different adapter versions:

1. Extract `$schema` from channel config (if present)
2. Extract `$schema` from root config (if present)
3. If both exist and differ → **skip inheritance** (use channel config only)
4. If same or only one exists → merge normally

This prevents accidental inheritance when a channel uses a different schema version than the root config.

**Example:**
```yaml
# Root: klarna_checkout_adapter.yaml
$schema: https://.../v1/schemas/klarna_checkout_adapter.json
options:
  oldField: true  # v1-only field

# Channel: se-klarna/klarna_checkout_adapter.yaml
$schema: https://.../v2/schemas/klarna_checkout_adapter.json
id: klarna_checkout_adapter
options:
  newField: true  # v2-only field
```

Result: Channel config used as-is (no merge), because schemas differ.

### Diff Engine (`diff/`)

```typescript
interface DiffResult {
  path: string;           // JSON path, e.g., "/api/timeout"
  type: 'add' | 'remove' | 'change';
  oldValue?: unknown;
  newValue?: unknown;
}

interface ConfigDiff {
  configName: string;
  status: 'create' | 'update' | 'delete' | 'unchanged';
  diffs: DiffResult[];
}
```

### Plan Service (`plan/service.ts`)

```typescript
interface PlanResult {
  merchant: string;
  channels: ChannelPlan[];
  summary: {
    creates: number;
    updates: number;
    unchanged: number;
  };
}

interface ChannelPlan {
  channel: string;
  configs: ConfigDiff[];
}
```

## CLI Package (`@nco-control/cli`)

Thin wrapper around core, adding:
- Command parsing (Commander.js)
- Terminal output formatting (colors, tables)
- Interactive prompts (confirmation)
- JSON output mode for scripting

### Commands

```bash
ncoctl validate              # Validate local configs
ncoctl validate --channel x  # Validate specific channel

ncoctl plan                  # Show all pending changes
ncoctl plan --channel x      # Plan for specific channel
ncoctl plan --verbose        # Include unchanged configs and unmanaged list
ncoctl plan --json           # Output as JSON

ncoctl apply                 # Apply changes (with confirmation)
ncoctl apply --yes           # Skip confirmation
ncoctl apply --channel x     # Apply specific channel

ncoctl serve                 # Start web interface
ncoctl serve --port 8080     # Custom port
```

### CLI Output Format

#### Plan Output (default)

```
Planning changes...

3 configs unchanged

se-klarna/klarna_checkout_adapter:
  + options.newField: "value"
  - options.oldField: "removed"
  ~ apiSettings.timeout: 30 → 60

se-walley/walley_checkout_adapter:
  + (new configuration)

Plan: 1 to create, 1 to update, 3 unchanged, 10 unmanaged
```

#### Plan Output (verbose: `--verbose`)

Shows all configs including unchanged, plus full unmanaged list:

```
Planning changes...

se-klarna/norce_adapter:
  (no changes)

se-klarna/klarna_checkout_adapter:
  + options.newField: "value"
  ...

⚠ Unmanaged configurations (10):
  - feature-test-1/norce_adapter
  - feature-test-2/norce_adapter
  - ...

Plan: 1 to create, 1 to update, 3 unchanged, 10 unmanaged
```

#### Diff Symbols

| Symbol | Color | Meaning |
|--------|-------|---------|
| `+` | Green | Added field |
| `-` | Red | Removed field |
| `~` | Yellow | Changed field |
| `✔` | Green | Success message |
| `✗` | Red | Error message |
| `⚠` | Yellow | Warning message |

#### Value Display

| Type | Format | Color |
|------|--------|-------|
| String | `"value"` | Cyan |
| Number | `123` | Yellow |
| Boolean | `true` | Yellow |
| Object/Array | `{"a":1}` (truncated at 100 chars) | Dim |
| null | `null` | Dim |

#### Color Control

- `NO_COLOR` env var disables colors
- `FORCE_COLOR` env var forces colors
- Otherwise auto-detect based on TTY

## Web Package (`@nco-control/web`)

### Server (Hono)

Exposes core functionality via HTTP:

```
GET  /api/channels           # List channels
GET  /api/channels/:channel  # Get channel configs
GET  /api/plan               # Get plan (local vs remote)
POST /api/apply              # Apply changes
GET  /api/compare?a=X&b=Y    # Compare two channels
```

### Client (React + Mantine)

Single-page application with views:
- **Overview** - Channel list with status
- **Channel** - View/edit channel configs
- **Compare** - Side-by-side channel comparison
- **Plan** - View and apply pending changes

### UX Principles

**Full-width content** - Maximize screen real estate for diffs and comparisons.

**Progressive disclosure** - Show relevant information at each stage:
- Overview → list of channels with validation status
- Channel → configurations grouped by type
- Config → full detail with schema info

**Resizable panels** - Allow users to adjust panel sizes, especially in Compare View:
```
+---------------------------+---------------------------+
| Channel A (50%)           | Channel B (50%)           |
|                           |                           |
| <─────── resize ────────> |                           |
+---------------------------+---------------------------+
```

**Status indicators** - Consistent visual language:

| Status | Indicator | Example |
|--------|-----------|---------|
| Valid | Green | Channel passes validation |
| Invalid | Red | Validation errors |
| Changed | Yellow | Local differs from remote |
| Unchanged | Gray | No pending changes |

### Server-Client Communication

```
Browser                    Hono Server                 Core
   │                           │                         │
   │  GET /api/channels        │                         │
   │──────────────────────────▶│                         │
   │                           │  loadProject()          │
   │                           │────────────────────────▶│
   │                           │◀────────────────────────│
   │  JSON response            │                         │
   │◀──────────────────────────│                         │
```

## Project Configuration

### `ncoctl.config.yaml`

```yaml
# Project settings
merchant: acme-partner

# API settings
api:
  # URL structure: {slug}.{lb}.{env}.norce.tech/checkout/configuration
  baseUrl: https://acme-partner.api-se.stage.norce.tech/checkout/configuration

# Optional: exclude certain configs from management
exclude:
  - admin_meta
```

### Directory Structure (User's Project)

```
my-checkout-configs/
├── ncoctl.config.yaml
├── .env                            # Secrets (gitignored)
├── .gitignore
├── norce_adapter.yaml              # Shared - all channels inherit
├── klarna_checkout_adapter.yaml    # Shared - Klarna channels inherit
├── se-klarna/
│   ├── klarna_checkout_adapter.yaml  # Inherits, adds overrides
│   └── norce_adapter.yaml            # Inherits, adds logistics
├── se-klarna-ingrid/
│   ├── klarna_checkout_adapter.yaml  # Inherits, overrides shipping
│   ├── ingrid_adapter.yaml           # Channel-specific
│   └── norce_adapter.yaml            # Inherits only
└── se-walley/
    ├── walley_checkout_adapter.yaml  # No shared walley config
    └── norce_adapter.yaml            # Inherits only
```

### Configuration Inheritance

Root-level config files serve as **inheritance bases** for channels. A channel inherits from a root config only when:

1. The channel has a file with the **same name** (e.g., `klarna_checkout_adapter.yaml`)
2. The channel file contains at least the **`id` field** (e.g., `id: klarna_checkout_adapter`)

**Inheritance rule**: If a channel has `{adapter}.yaml` with an `id` field, it inherits from root `{adapter}.yaml` and can override specific fields. If the channel doesn't have that file, the root config is ignored for that channel.

**Example: Minimal channel override**

```yaml
# se-klarna-ingrid/klarna_checkout_adapter.yaml
# Inherits everything from root, only overrides shipping
id: klarna_checkout_adapter

providesShipping: false
shippingOptions: []
```

**Example: Channel with additional options**

```yaml
# se-klarna-recurring/klarna_checkout_adapter.yaml
id: klarna_checkout_adapter

options:
  useRecurringPayment: true
```

**Merge behavior**:
- Deep merge: channel values override root values at the field level
- Arrays are replaced, not merged (e.g., `shippingOptions: []` replaces the root array)
- Null values remove fields: `shippingOptions: null` removes the field entirely

This pattern allows:
- **DRY configs**: Common settings defined once at root
- **Explicit opt-in**: Channels only inherit what they declare
- **Clear diffs**: Channel files show only what's different from the default

## Data Flow

### Validate Command

```
1. Load project config
2. Discover all channel directories
3. For each channel:
   a. Load base configs
   b. Load channel configs
   c. Merge configs
   d. For each merged config:
      - Fetch schema from $schema URL (cached)
      - Validate with Ajv
      - Collect errors
4. Report validation results
```

### Plan Command

```
1. Load and validate local configs (as above)
2. Substitute ${VAR} placeholders from .env
3. For each channel:
   a. Fetch remote configs from API
   b. Compare local (merged) vs remote
   c. Generate diffs
4. Return plan result with all diffs
```

### Apply Command

```
1. Generate plan (as above)
2. Show plan to user
3. Prompt for confirmation (unless --yes)
4. For each changed config:
   a. PUT to Configuration API
   b. Report success/failure
5. Return overall result
```

## Error Handling

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation errors or apply failures |
| 2 | Configuration/fatal errors |

### Error Types

```typescript
class NcoControlError extends Error {
  code: string;
}

class ValidationError extends NcoControlError {
  configPath: string;
  schemaErrors: SchemaError[];
}

class ApiError extends NcoControlError {
  statusCode: number;
  response?: unknown;
}

class ConfigLoadError extends NcoControlError {
  filePath: string;
}
```

## Security Considerations

### Secrets

- Never log or display secret values
- Substitute `${VAR}` only at plan/apply time
- Web UI shows `"${VAR}"` placeholder, not actual value
- `.env` must be in `.gitignore`

### API Access

- Bearer token authentication for API access
- Never store tokens in config files
- Use environment variables for sensitive credentials

## Future Extensibility

### Adding a New Command

1. Create `cli/src/commands/newcmd.ts`
2. Add core logic to `core/src/` if needed
3. Register command in `cli/src/index.ts`

### Adding Web UI Features

1. Add API route in `web/server/routes/`
2. Add React component in `web/client/src/components/`
3. Wire up in App.tsx
