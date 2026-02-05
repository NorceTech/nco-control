# CLI Interface Contract: ncoctl

**Version**: 1.0.0

## Commands

### ncoctl init

Initialize a new nco-control project.

```bash
ncoctl init [options]
```

**Options**:
| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing files |

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Project already exists (without --force) |
| 2 | Fatal error |

**Created Files**:
- `ncoctl.config.yaml` - Project configuration
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules (if not exists)

---

### ncoctl validate

Validate local configuration files against their JSON schemas.

```bash
ncoctl validate [options]
```

**Options**:
| Flag | Description |
|------|-------------|
| `--channel <name>` | Validate specific channel only |
| `--json` | Output as JSON |

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | All configurations valid |
| 1 | Validation errors found |
| 2 | Fatal error (config load failed, schema fetch failed) |

**Output (text)**:
```
Validating configurations...

✔ se-klarna (3 configs)
✔ se-walley (2 configs)
✗ se-adyen (1 error)
  norce_adapter.yaml:
    /api/timeout: must be number, got string

Validation: 2 channels valid, 1 channel invalid
```

**Output (JSON)**:
```json
{
  "valid": false,
  "channels": [
    { "name": "se-klarna", "valid": true, "configCount": 3, "errors": [] },
    { "name": "se-walley", "valid": true, "configCount": 2, "errors": [] },
    {
      "name": "se-adyen",
      "valid": false,
      "configCount": 1,
      "errors": [
        {
          "filePath": "se-adyen/norce_adapter.yaml",
          "fieldPath": "/api/timeout",
          "message": "must be number, got string"
        }
      ]
    }
  ]
}
```

---

### ncoctl plan

Preview changes that would be made to remote configurations.

```bash
ncoctl plan [options]
```

**Options**:
| Flag | Description |
|------|-------------|
| `--channel <name>` | Plan specific channel only |
| `--verbose` | Show unchanged configs and unmanaged list |
| `--json` | Output as JSON |

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | Plan generated (may have changes or no changes) |
| 1 | Validation errors (plan not generated) |
| 2 | Fatal error (API unreachable, auth failed) |

**Output (text, default)**:
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

**Output (text, verbose)**:
```
Planning changes...

se-klarna/norce_adapter:
  (no changes)

se-klarna/klarna_checkout_adapter:
  + options.newField: "value"
  - options.oldField: "removed"
  ~ apiSettings.timeout: 30 → 60

se-walley/norce_adapter:
  (no changes)

se-walley/walley_checkout_adapter:
  + (new configuration)

⚠ Unmanaged configurations (10):
  - feature-test-1/norce_adapter
  - feature-test-2/norce_adapter
  - demo-channel/norce_adapter
  ... and 7 more

Plan: 1 to create, 1 to update, 3 unchanged, 10 unmanaged
```

**Output (JSON)**:
```json
{
  "merchant": "acme-partner",
  "timestamp": "2026-01-30T12:00:00Z",
  "channels": [
    {
      "channel": "se-klarna",
      "existsRemotely": true,
      "configs": [
        {
          "name": "klarna_checkout_adapter",
          "status": "update",
          "diffs": [
            { "path": "/options/newField", "type": "add", "newValue": "value" },
            { "path": "/options/oldField", "type": "remove", "oldValue": "removed" },
            { "path": "/apiSettings/timeout", "type": "change", "oldValue": 30, "newValue": 60 }
          ]
        }
      ]
    }
  ],
  "summary": {
    "creates": 1,
    "updates": 1,
    "unchanged": 3,
    "unmanaged": 10
  }
}
```

---

### ncoctl apply

Apply local configurations to the remote API.

```bash
ncoctl apply [options]
```

**Options**:
| Flag | Description |
|------|-------------|
| `--channel <name>` | Apply specific channel only |
| `--yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | All changes applied successfully |
| 1 | Some changes failed (partial apply) |
| 2 | Fatal error (validation failed, no changes made) |

**Output (text)**:
```
Planning changes...

se-klarna/klarna_checkout_adapter:
  ~ apiSettings.timeout: 30 → 60

Plan: 0 to create, 1 to update, 4 unchanged

Apply these changes? [y/N] y

Applying changes...
✔ se-klarna/klarna_checkout_adapter updated

Apply complete: 1 succeeded, 0 failed
```

**Output (text, with failure)**:
```
Applying changes...
✔ se-klarna/klarna_checkout_adapter updated
✗ se-walley/walley_checkout_adapter failed: 403 Forbidden

Apply complete: 1 succeeded, 1 failed
```

**Output (JSON)**:
```json
{
  "success": false,
  "results": [
    { "channel": "se-klarna", "config": "klarna_checkout_adapter", "success": true },
    { "channel": "se-walley", "config": "walley_checkout_adapter", "success": false, "error": "403 Forbidden" }
  ],
  "summary": {
    "succeeded": 1,
    "failed": 1,
    "skipped": 0
  }
}
```

---

### ncoctl serve

Start the web interface.

```bash
ncoctl serve [options]
```

**Options**:
| Flag | Description |
|------|-------------|
| `--port <number>` | Port number (default: 6274) |
| `--no-open` | Don't open browser automatically |

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | Server stopped gracefully (Ctrl+C) |
| 2 | Fatal error (port in use, config load failed) |

**Output**:
```
Starting nco-control web interface...

  Local:   http://localhost:6274

Press Ctrl+C to stop
```

---

## Global Options

These options apply to all commands:

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show help |
| `--version`, `-V` | Show version |

---

## Environment Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `NCO_API_TOKEN` | Bearer token for Configuration API | plan, apply |
| `NO_COLOR` | Disable colored output | all |
| `FORCE_COLOR` | Force colored output | all |

---

## Diff Symbols

| Symbol | Color | Meaning |
|--------|-------|---------|
| `+` | Green | Added field |
| `-` | Red | Removed field |
| `~` | Yellow | Changed field |
| `✔` | Green | Success |
| `✗` | Red | Failure |
| `⚠` | Yellow | Warning |

---

## Value Display

| Type | Format | Color |
|------|--------|-------|
| String | `"value"` | Cyan |
| Number | `123` | Yellow |
| Boolean | `true` | Yellow |
| Object/Array | `{"a":1}` (truncated at 100 chars) | Dim |
| null | `null` | Dim |
| Secret | `"${VAR}"` | Dim (never shows actual value) |
