# Data Model: Norce Checkout Control MVP

**Feature**: 001-nco-control-mvp
**Date**: 2026-01-30

## Entities

### ProjectConfig

Project-level configuration loaded from `ncoctl.config.yaml`.

```typescript
interface ProjectConfig {
  /** Merchant identifier for API calls */
  merchant: string;

  /** API configuration */
  api: {
    /** Configuration API base URL */
    baseUrl: string;
    /** Optional bearer token (env var takes precedence) */
    token?: string;
  };

  /** Schema caching settings */
  schema?: {
    /** Cache directory (default: .ncoctl/schemas) */
    cacheDir?: string;
    /** Cache TTL in seconds (default: 86400 = 24 hours) */
    cacheTtl?: number;
    /** Skip schema validation (default: false) */
    skip?: boolean;
  };

  /** Output settings */
  output?: {
    /** Default format: "text" or "json" (default: text) */
    format?: 'text' | 'json';
    /** Verbose output (default: false) */
    verbose?: boolean;
  };
}
```

**Validation Rules**:
- `merchant` is required, non-empty string
- `api.baseUrl` is required, must be valid URL
- `schema.cacheTtl` must be positive integer if provided
- `output.format` must be "text" or "json" if provided

**File Location**: `ncoctl.config.yaml` in project root

---

### Channel

A discovered channel directory containing configuration files.

```typescript
interface Channel {
  /** Channel name (directory name) */
  name: string;

  /** Absolute path to channel directory */
  path: string;

  /** Configuration files in this channel */
  configs: ChannelConfig[];

  /** Validation status */
  validationStatus: 'valid' | 'invalid' | 'pending';

  /** Validation errors if invalid */
  validationErrors?: ValidationError[];
}
```

**Discovery Rules**:
1. List all directories in project root
2. Exclude: directories starting with `.` or `_`, and `node_modules`
3. Directory is a channel if it contains at least one `.yaml` file
4. Directory name IS the channel name (sent to API as-is)

---

### ChannelConfig

A configuration file within a channel.

```typescript
interface ChannelConfig {
  /** Configuration name (filename without .yaml) */
  name: string;

  /** Absolute path to file */
  path: string;

  /** Raw parsed YAML content */
  raw: Record<string, unknown>;

  /** Merged content (after inheritance) */
  merged: Record<string, unknown>;

  /** Schema URL from $schema field */
  schemaUrl?: string;

  /** Configuration ID from id field */
  id?: string;

  /** Whether this config inherits from root */
  inheritsFromRoot: boolean;
}
```

**Inheritance Rules**:
1. Channel file inherits from root file with same name IF:
   - Root file exists
   - Channel file contains `id` field
   - `$schema` values match (or only one has `$schema`)
2. If no inheritance, `merged` equals `raw`

---

### Configuration

A fully-resolved configuration ready for API operations.

```typescript
interface Configuration {
  /** JSON Schema URL */
  $schema: string;

  /** Configuration identifier */
  id: string;

  /** All other configuration fields */
  [key: string]: unknown;
}
```

**Validation Rules**:
- `$schema` is required, must be valid URL
- `id` is required, non-empty string
- Must validate against JSON Schema from `$schema` URL

---

### Plan

Result of comparing local state to remote state.

```typescript
interface Plan {
  /** Merchant being planned */
  merchant: string;

  /** Timestamp of plan generation */
  timestamp: string;

  /** Per-channel plans */
  channels: ChannelPlan[];

  /** Summary counts */
  summary: PlanSummary;
}

interface PlanSummary {
  /** New configurations to create */
  creates: number;

  /** Existing configurations to update */
  updates: number;

  /** Configurations with no changes */
  unchanged: number;

  /** Configurations on remote not in local */
  unmanaged: number;
}
```

---

### ChannelPlan

Plan for a single channel.

```typescript
interface ChannelPlan {
  /** Channel name */
  channel: string;

  /** Whether channel exists remotely */
  existsRemotely: boolean;

  /** Per-configuration diffs */
  configs: ConfigPlan[];
}
```

---

### ConfigPlan

Plan for a single configuration.

```typescript
interface ConfigPlan {
  /** Configuration name */
  name: string;

  /** Change status */
  status: 'create' | 'update' | 'unchanged';

  /** Field-level differences */
  diffs: FieldDiff[];
}

interface FieldDiff {
  /** JSON path to field (e.g., "/api/timeout") */
  path: string;

  /** Type of change */
  type: 'add' | 'remove' | 'change';

  /** Previous value (undefined for add) */
  oldValue?: unknown;

  /** New value (undefined for remove) */
  newValue?: unknown;
}
```

---

### ValidationError

Schema validation error.

```typescript
interface ValidationError {
  /** File path where error occurred */
  filePath: string;

  /** JSON path to invalid field */
  fieldPath: string;

  /** Human-readable error message */
  message: string;

  /** Expected value/type */
  expected?: string;

  /** Actual value/type */
  actual?: string;
}
```

---

### ApplyResult

Result of applying changes.

```typescript
interface ApplyResult {
  /** Overall success */
  success: boolean;

  /** Per-configuration results */
  results: ConfigApplyResult[];

  /** Summary */
  summary: ApplySummary;
}

interface ConfigApplyResult {
  /** Channel name */
  channel: string;

  /** Configuration name */
  config: string;

  /** Whether apply succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

interface ApplySummary {
  /** Successful applies */
  succeeded: number;

  /** Failed applies */
  failed: number;

  /** Skipped (no changes) */
  skipped: number;
}
```

## State Transitions

### Configuration Lifecycle

```
                    ┌─────────────┐
                    │   Created   │
                    │  (local)    │
                    └──────┬──────┘
                           │ ncoctl validate
                           ▼
              ┌────────────────────────┐
              │                        │
              ▼                        ▼
     ┌─────────────┐          ┌─────────────┐
     │    Valid    │          │   Invalid   │
     └──────┬──────┘          └──────┬──────┘
            │ ncoctl plan             │ fix errors
            ▼                         │
     ┌─────────────┐                  │
     │   Planned   │◀─────────────────┘
     │ (has diff)  │
     └──────┬──────┘
            │ ncoctl apply --yes
            ▼
     ┌─────────────┐
     │   Applied   │
     │  (synced)   │
     └─────────────┘
```

### Channel Discovery States

```
Directory Found
      │
      ▼
Has .yaml files? ──No──► Ignored
      │
     Yes
      │
      ▼
  Discovered
      │
      ▼
Configs Loaded
      │
      ▼
Merged & Validated
```

## Relationships

```
ProjectConfig
    │
    └──► Channel[] (discovered from filesystem)
            │
            ├──► ChannelConfig[] (YAML files in channel dir)
            │       │
            │       └──► Configuration (merged result)
            │
            └──► ValidationError[] (if invalid)

Plan
    │
    └──► ChannelPlan[] (one per channel)
            │
            └──► ConfigPlan[] (one per config)
                    │
                    └──► FieldDiff[] (field-level changes)

ApplyResult
    │
    └──► ConfigApplyResult[] (one per config applied)
```

## Data Flow

### Validate Flow

```
1. Load ProjectConfig from ncoctl.config.yaml
2. Discover Channels (directories with .yaml files)
3. For each Channel:
   a. Load ChannelConfigs (parse YAML files)
   b. Load root configs (if exist)
   c. Merge (root + channel overlay)
   d. Fetch schemas from $schema URLs (cached)
   e. Validate merged configs against schemas
   f. Collect ValidationErrors
4. Return validation results
```

### Plan Flow

```
1. Run validate flow (must pass)
2. Substitute ${VAR} placeholders from .env
3. For each Channel:
   a. Fetch remote configs from API
   b. Compare local (merged) vs remote
   c. Generate FieldDiffs
   d. Create ConfigPlan entries
4. Calculate PlanSummary
5. Return Plan
```

### Apply Flow

```
1. Run plan flow
2. Show plan to user
3. If has changes:
   a. Prompt for confirmation (unless --yes)
   b. For each changed config:
      - PUT to API
      - Record ConfigApplyResult
   c. Calculate ApplySummary
4. Return ApplyResult
```
