# Quickstart: nco-control

This guide walks through using nco-control to manage Norce Checkout configurations.

## Prerequisites

- Node.js >= 20
- Access to a Norce Checkout environment (playground, stage, or production)
- API bearer token with configuration management permissions

## Installation

```bash
# Clone and install
git clone https://github.com/NorceTech/nco-control.git
cd nco-control
npm install
npm run build

# Link CLI globally
npm link
```

## Initialize a Project

Create a new directory for your checkout configurations:

```bash
mkdir my-checkout-configs
cd my-checkout-configs
ncoctl init
```

This creates:
- `ncoctl.config.yaml` - Project configuration
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules

## Configure the Project

Edit `ncoctl.config.yaml`:

```yaml
merchant: your-merchant-name

api:
  baseUrl: https://your-merchant.api-se.stage.norce.tech/checkout/configuration
```

Copy `.env.example` to `.env` and add your API token:

```bash
cp .env.example .env
```

Edit `.env`:
```
NCOCTL_API_TOKEN=your-bearer-token-here
```

## Create Your First Configuration

Create a shared base configuration at the root:

```yaml
# norce_adapter.yaml
$schema: https://example.norce.tech/schemas/norce_adapter.json
id: norce_adapter

active: true
api:
  baseUrl: https://api.norce.io
  timeout: 30
  identityClientId: "${NORCE_CLIENT_ID}"
  identityClientSecret: "${NORCE_CLIENT_SECRET}"
```

Create a channel directory with overrides:

```bash
mkdir se-klarna
```

```yaml
# se-klarna/norce_adapter.yaml
id: norce_adapter

api:
  timeout: 60  # Override timeout for this channel
```

## Validate Configurations

Check that your configurations are valid:

```bash
ncoctl validate
```

Expected output:
```
Validating configurations...

✔ se-klarna (1 config)

Validation: 1 channel valid
```

## Preview Changes

See what would change on the remote API:

```bash
ncoctl plan
```

Expected output:
```
Planning changes...

se-klarna/norce_adapter:
  + (new configuration)

Plan: 1 to create, 0 to update, 0 unchanged
```

## Apply Changes

Deploy your configurations:

```bash
ncoctl apply
```

You'll be prompted to confirm:
```
se-klarna/norce_adapter:
  + (new configuration)

Apply these changes? [y/N] y

Applying changes...
✔ se-klarna/norce_adapter created

Apply complete: 1 succeeded, 0 failed
```

## Start the Web Interface

For visual configuration management:

```bash
ncoctl serve
```

Open http://localhost:6274 in your browser.

## Common Workflows

### Add a New Channel

1. Create a directory: `mkdir se-walley`
2. Add config files with `id` field (to inherit from root)
3. Run `ncoctl validate` to check
4. Run `ncoctl plan` to preview
5. Run `ncoctl apply` to deploy

### Update an Existing Configuration

1. Edit the YAML file
2. Run `ncoctl plan` to see the diff
3. Run `ncoctl apply` to deploy

### Compare Two Channels

Use the web interface:
1. Run `ncoctl serve`
2. Navigate to Compare view
3. Select two channels
4. Review differences

### Remove an Inherited Field

Set the field to `null` in the channel override:

```yaml
# se-klarna/norce_adapter.yaml
id: norce_adapter

api:
  optionalField: null  # Removes this field from merged config
```

## Project Structure

```
my-checkout-configs/
├── ncoctl.config.yaml      # Project settings
├── .env                    # Secrets (gitignored)
├── .gitignore
├── norce_adapter.yaml      # Shared base config
├── se-klarna/
│   └── norce_adapter.yaml  # Inherits and overrides
├── se-walley/
│   ├── norce_adapter.yaml  # Inherits and overrides
│   └── walley_adapter.yaml # Channel-specific
└── se-adyen/
    ├── norce_adapter.yaml
    └── adyen_adapter.yaml
```

## Key Concepts

### Inheritance

- Channel files inherit from root files with the **same name**
- Channel file must have `id` field to opt into inheritance
- Channel values override root values (deep merge)
- Arrays are **replaced**, not concatenated
- Set field to `null` to explicitly remove it

### Secrets

- Store secrets in `.env` file (gitignored)
- Reference in YAML: `"${VAR_NAME}"`
- Substituted at plan/apply time
- Never displayed or logged

### Unmanaged Configurations

- Configs on remote but not in local files are "unmanaged"
- They're counted but not modified or deleted
- Use API directly to delete if needed

## Troubleshooting

### "Schema fetch failed"

Check network connectivity and `$schema` URL validity.

### "Missing environment variable"

Ensure all `${VAR}` references have corresponding entries in `.env`.

### "API error: 401 Unauthorized"

Check that `NCOCTL_API_TOKEN` is set and valid.

### "Validation failed"

Check error messages for field path and expected format. Validate your YAML syntax.

## Next Steps

- Read the full [CLI Reference](./contracts/cli-interface.md)
- Explore the [Web API](./contracts/web-api.yaml)
- Review the [Data Model](./data-model.md)
