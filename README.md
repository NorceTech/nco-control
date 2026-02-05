# Norce Checkout Control

Manage Norce Checkout configurations as code. Define configurations in YAML files, preview changes before deploying, and keep configurations in version control.

## When to Use nco-control

The Norce Checkout admin UI works well for managing individual channels. As your setup grows, you may find that:

- **Multiple channels share settings** - Changing API credentials or shared options means updating each channel manually
- **Changes are hard to review** - No easy way to see what changed, when, or why
- **Mistakes are easy to make** - A typo in one channel goes unnoticed until something breaks
- **Collaboration is tricky** - Multiple team members making changes without coordination

nco-control addresses these by treating configurations as code:

- **Shared base configurations** - Define common settings once, override per-channel
- **Review before deploy** - See exactly what will change with `ncoctl plan`
- **Version control** - Track changes in Git, review in pull requests

## Quick Start

### 1. Install

```bash
# Clone the repository
git clone https://github.com/NorceTech/nco-control.git
cd nco-control

# Install and build
npm install
npm run build

# Link CLI globally (makes 'ncoctl' available)
npm link -w packages/cli
```

Verify the installation:

```bash
ncoctl --version
```

### 2. Create a Project

Create a directory for your merchant's configurations:

```bash
mkdir acme-store-checkout
cd acme-store-checkout
```

Create `ncoctl.config.yaml`:

```yaml
merchant: acme-store

api:
  baseUrl: https://acme-store.api-se.stage.norce.tech/checkout/configuration
```

Create `.env` with your API token:

```bash
NCOCTL_API_TOKEN=your-api-token-here
```

> **Getting an API token:** Contact Norce support or generate one through the partner portal.

### 3. Add Configuration Files

Create adapter configurations as YAML files. For example, `klarna_checkout_adapter.yaml`:

```yaml
$schema: https://checkout.norce.tech/api/v1/schemas/klarna_checkout_adapter
id: klarna_checkout_adapter

apiCredentials:
  username: "${KLARNA_API_USERNAME}"
  password: "${KLARNA_API_PASSWORD}"

options:
  colorButton: "#333333"
```

Create channel directories with overrides. For example, `sweden/klarna_checkout_adapter.yaml`:

```yaml
id: klarna_checkout_adapter

# Override options for Sweden
options:
  purchaseCountry: SE
  locale: sv-SE
```

### 4. Preview and Apply

```bash
# Validate configurations against schemas
ncoctl validate

# See what would change (local vs remote)
ncoctl plan

# Apply changes (with confirmation)
ncoctl apply
```

Example `ncoctl plan` output:

```
Planning changes for acme-store...

sweden/klarna_checkout_adapter
  ~ options.colorButton: "#000000" → "#333333"
  + options.locale: "sv-SE"

norway/klarna_checkout_adapter
  (no changes)

Plan: 0 to create, 1 to update, 1 unchanged
```

## Project Structure

A typical configuration project:

```
acme-store-checkout/
├── ncoctl.config.yaml              # Project settings
├── .env                            # Secrets (gitignored)
├── klarna_checkout_adapter.yaml    # Shared base config
├── ingrid_adapter.yaml
├── sweden/                         # Channel: sweden
│   ├── klarna_checkout_adapter.yaml
│   ├── ingrid_adapter.yaml
│   └── norce_adapter.yaml
├── norway/                         # Channel: norway
│   ├── klarna_checkout_adapter.yaml
│   └── norce_adapter.yaml
└── finland/                        # Channel: finland
    └── norce_adapter.yaml
```

### Configuration Inheritance

Root-level files are base configurations. Channels inherit from them when they have a matching file with an `id` field:

```yaml
# sweden/klarna_checkout_adapter.yaml
id: klarna_checkout_adapter

# Only specify what differs from root
options:
  purchaseCountry: SE
```

The channel config is deep-merged with the root config. Arrays are replaced, not merged. Use `null` to explicitly remove an inherited field.

## Configuration Reference

### ncoctl.config.yaml

```yaml
merchant: acme-store

api:
  # Partner API URL pattern:
  # https://{slug}.api-se.{env}.norce.tech/checkout/configuration
  baseUrl: https://acme-store.api-se.stage.norce.tech/checkout/configuration

# Optional settings
schema:
  # cacheDir: .ncoctl/schemas   # Schema cache location
  # cacheTtl: 86400             # Cache TTL in seconds (24h default)
  # skip: false                 # Skip schema validation

output:
  # format: text                # Output format: text or json
  # verbose: false              # Show unchanged configs
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NCOCTL_API_TOKEN` | Bearer token for Configuration API |

Set via environment variable or `.env` file in project root.

### .env File

```bash
# Required for plan/apply
NCOCTL_API_TOKEN=your-api-token-here

# Adapter secrets - referenced as ${VAR_NAME} in YAML
KLARNA_API_USERNAME=your-username
KLARNA_API_PASSWORD=your-password
NORCE_IDENTITY_SECRET=your-secret
```

## CLI Commands

```bash
ncoctl validate                  # Validate all configs
ncoctl validate --channel sweden # Validate specific channel

ncoctl plan                      # Preview all changes
ncoctl plan --channel sweden     # Preview specific channel
ncoctl plan --json               # Output as JSON

ncoctl apply                     # Apply changes (prompts for confirmation)
ncoctl apply --yes               # Apply without confirmation
ncoctl apply --channel sweden    # Apply specific channel
```

## Status

- **CLI (`ncoctl`)** - Implemented and in use
- **Web interface** - Planned

## Documentation

- [Motivation](./specification/motivation.md) - Use cases and design philosophy
- [Architecture](./specification/architecture.md) - Technical design
- [Tech Stack](./specification/tech-stack.md) - Technology choices
- [API](./specification/api.md) - Configuration API reference

## Development

```bash
npm install          # Install dependencies
npm run build        # Build all packages
npm run dev          # Watch mode
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format with Prettier
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.x |
| Runtime | Node.js >= 20 |
| CLI | Commander.js |
| Schema Validation | Ajv |
| YAML | js-yaml |
| Testing | Vitest |

## License

Proprietary - Norce
