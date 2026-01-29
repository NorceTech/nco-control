# Motivation

This document describes the use cases that nco-control addresses.

## Use Cases

### 1. Configuration as Code

Store Norce Checkout configurations in version control alongside application code.

**Benefits:**
- Review configuration changes in pull requests
- Track history of what changed and when
- Roll back to previous configurations if needed
- Consistent workflow across team members

### 2. Multi-Channel Management

Manage multiple checkout channels efficiently when they share common settings.

**Example:** A merchant has 10 channels for different markets. All share the same Norce Adapter API credentials, but each has a different `applicationId` and `country`. With nco-control:
- Define shared settings in a base configuration
- Override only the values that differ per channel
- Change a shared value once, apply to all channels

### 3. Preview Before Deploy

See exactly what will change before applying configurations to the live system.

**Workflow:**
1. Edit local YAML files
2. Run `ncoctl plan` to see a diff of pending changes
3. Review the changes
4. Run `ncoctl apply` to deploy (with confirmation)

This prevents accidental deployments and gives visibility into changes.

### 4. Channel Comparison

Compare two channels to identify configuration differences.

**Example:** A feature works on `channel-a` but not `channel-b`. Use the comparison view to quickly identify which settings differ, rather than manually inspecting each configuration.

### 5. Environment Promotion

Promote configurations from staging to production with confidence.

**Workflow:**
1. Configure and test in staging environment
2. Compare staging vs production configurations
3. Apply staging configuration to production (with credential overrides)
4. Verify production matches staging (except for environment-specific values)

### 6. Standardization

Identify and eliminate unnecessary differences between channels.

When channels are created manually over time, they can drift apart in ways that aren't intentional. nco-control helps:
- Visualize what's actually different between channels
- Distinguish intentional differences from accidental ones
- Standardize configurations across the fleet

## Design Philosophy

### Explicit Over Automatic

Users define their configuration structure manually rather than having it auto-generated. This ensures:
- Users understand their configuration hierarchy
- Predictable, trustworthy behavior
- No "magic" that might produce unexpected results

### Single Merchant, Multiple Channels

Each repository manages configurations for **one merchant**. Multi-merchant setups use separate repositories - this keeps things simple and avoids complex cross-merchant logic.

Within a merchant, channels can share common settings with per-channel overrides. The exact folder structure is still being explored, but the concept is:

- **Shared configurations** that apply to all channels (or groups of channels)
- **Channel-specific configurations** that override or extend the shared ones

The hierarchy can evolve as needs grow - for example, grouping channels that share certain characteristics (like shipping provider).

### Validation First

Configurations are validated against their JSON schemas before any remote changes are made. This catches errors early, before they affect live systems.
