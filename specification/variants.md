# Configuration Variants

This document describes the variants feature for reducing duplication when multiple channels share the same configuration variant.

## Problem Statement

Currently, when multiple channels need the same non-default configuration, each channel must duplicate the entire file:

```
# Current structure - duplication problem
checkout_layout_order.yaml                    # Base (hosted PSPs)
se-adyen/checkout_layout_order.yaml           # Full copy with customer forms (~37 lines)
se-adyen-ingrid-awardit/checkout_layout_order.yaml  # Same full copy
se-adyen-recurring/checkout_layout_order.yaml       # Same full copy
se-nonpsp/checkout_layout_order.yaml                # Same full copy
```

Each of these channel files contains identical content. When the customer forms layout needs to change, all four files must be updated manually.

## Proposed Solution

Introduce **named variants** - configuration files that extend the base and can be referenced by channels.

### File Naming Convention

Variants use the `@` separator in filenames:

```
{config-name}@{variant-name}.yaml
```

Example:
```
checkout_layout_order.yaml                    # Base configuration
checkout_layout_order@customer-forms.yaml     # Variant: adds customer forms
checkout_layout_order@minimal.yaml            # Variant: minimal layout
```

The `@` character is not valid in configuration IDs, so there's no collision risk.

### Referencing Variants

Channels reference a variant using the `$variant` directive:

```yaml
# se-adyen/checkout_layout_order.yaml
$variant: customer-forms
```

This single line replaces the entire duplicated configuration.

### Inheritance Chain

When a channel references a variant, the merge order is:

1. **Base** (`checkout_layout_order.yaml`)
2. **Variant** (`checkout_layout_order@customer-forms.yaml`)
3. **Channel overrides** (any additional fields in the channel file)

```
┌─────────────────────┐
│        Base         │  checkout_layout_order.yaml
│  (shared defaults)  │
└──────────┬──────────┘
           │ extends
           ▼
┌─────────────────────┐
│      Variant        │  checkout_layout_order@customer-forms.yaml
│  (customer forms)   │
└──────────┬──────────┘
           │ extends
           ▼
┌─────────────────────┐
│  Channel Overrides  │  se-adyen/checkout_layout_order.yaml
│   (if any needed)   │
└─────────────────────┘
```

### Channel Overrides on Top of Variants

A channel can reference a variant AND add its own overrides:

```yaml
# se-adyen-custom/checkout_layout_order.yaml
$variant: customer-forms
options:
  showGiftWrap: true    # Additional override on top of variant
```

The merge result would be: base + variant + channel overrides.

## Example Usage

### Before (Current)

```
project/
├── checkout_layout_order.yaml              # Base (20 lines)
├── se-klarna/
│   └── checkout_layout_order.yaml          # Just id (2 lines, inherits base)
├── se-adyen/
│   └── checkout_layout_order.yaml          # Full customer-forms layout (37 lines)
├── se-adyen-ingrid-awardit/
│   └── checkout_layout_order.yaml          # Same 37 lines duplicated
├── se-adyen-recurring/
│   └── checkout_layout_order.yaml          # Same 37 lines duplicated
└── se-nonpsp/
    └── checkout_layout_order.yaml          # Same 37 lines duplicated
```

**Total: 20 + 2 + 37×4 = 170 lines**

### After (With Variants)

```
project/
├── checkout_layout_order.yaml              # Base (20 lines)
├── checkout_layout_order@customer-forms.yaml  # Variant (37 lines)
├── se-klarna/
│   └── checkout_layout_order.yaml          # Just id (2 lines)
├── se-adyen/
│   └── checkout_layout_order.yaml          # $variant: customer-forms (1 line)
├── se-adyen-ingrid-awardit/
│   └── checkout_layout_order.yaml          # $variant: customer-forms (1 line)
├── se-adyen-recurring/
│   └── checkout_layout_order.yaml          # $variant: customer-forms (1 line)
└── se-nonpsp/
    └── checkout_layout_order.yaml          # $variant: customer-forms (1 line)
```

**Total: 20 + 37 + 2 + 1×4 = 63 lines** (63% reduction)

## Detailed Syntax

### Variant Files

Variant files are placed at the project root alongside base configs:

```yaml
# checkout_layout_order@customer-forms.yaml
# This variant extends the base checkout_layout_order.yaml

# Only specify fields that differ from base
elements:
  - type: header
  - id: grid
    type: container
    elements:
      - id: grid-column-1
        # ... inherited from base
      - id: grid-column-2
        type: container
        elements:
          - id: customer-form-wrapper
            type: container
            label: Customer
            elements:
              - id: billing-form
                type: form
                formConfigId: checkout_form_customer_billing
              - id: shipping-form
                type: form
                formConfigId: checkout_form_customer_shipping
          - type: payment
            rule:
              effect: SHOW
              condition:
                scope: "#/properties/customer/properties/billing/properties/email"
                schema:
                  type: string
```

### Channel Reference

```yaml
# se-adyen/checkout_layout_order.yaml
$variant: customer-forms
```

Or with additional overrides:

```yaml
# se-adyen-custom/checkout_layout_order.yaml
$variant: customer-forms
# Optional: additional channel-specific overrides
options:
  customField: value
```

### Validation Rules

1. `$variant` must reference an existing variant file
2. Variant name must match `{config-name}@{variant-name}.yaml` pattern
3. A channel file with `$variant` can optionally include other fields (overrides)
4. `$variant` and `id` can coexist - `id` is still required for the inheritance mechanism
5. Nested variants (variant of a variant) are NOT supported

## Implementation Notes

### File Discovery

When discovering root configs:

```typescript
// Current: finds checkout_layout_order.yaml
// New: also finds checkout_layout_order@customer-forms.yaml

const baseConfigs = new Map<string, string>();      // name -> path
const variants = new Map<string, Map<string, string>>(); // configName -> (variantName -> path)

for (const file of rootYamlFiles) {
  if (file.includes('@')) {
    const [configName, variantName] = file.replace('.yaml', '').split('@');
    if (!variants.has(configName)) {
      variants.set(configName, new Map());
    }
    variants.get(configName)!.set(variantName, path);
  } else {
    baseConfigs.set(file.replace('.yaml', ''), path);
  }
}
```

### Loading Channel Configs

When loading a channel config with `$variant`:

```typescript
async function loadChannelConfig(channelFile: string, projectDir: string) {
  const raw = await loadYaml(channelFile);

  if (raw.$variant) {
    const variantName = raw.$variant;
    const configName = getConfigName(channelFile);

    // Load base
    const base = await loadYaml(`${projectDir}/${configName}.yaml`);

    // Load variant
    const variant = await loadYaml(`${projectDir}/${configName}@${variantName}.yaml`);

    // Remove $variant from raw before merge
    const { $variant, ...channelOverrides } = raw;

    // Three-way merge: base -> variant -> channel
    return deepMerge(deepMerge(base, variant), channelOverrides);
  }

  // Normal inheritance (no variant)
  return normalInheritance(raw, projectDir);
}
```

### CLI Output

Plan output should indicate when a variant is used:

```
se-adyen/checkout_layout_order (via @customer-forms):
  ~ elements[1].elements[1].elements: [added customer-form-wrapper]
```

### Validation

New validation checks:

1. **Unknown variant**: `$variant: foo` but `config@foo.yaml` doesn't exist
2. **Orphan variant**: `config@bar.yaml` exists but no channel uses it (warning only)
3. **Variant with wrong base**: Variant file's `$schema` differs from base (skip merge, like current behavior)

## Open Questions

1. **Should variants auto-inherit from base, or be standalone?**
   - Proposed: Variants always extend base (three-way merge)
   - Alternative: Variants are standalone, replacing base entirely

2. **Should `$variant` be allowed with `id` only?**
   - Proposed: Yes, `$variant: foo` with just `id:` is valid
   - The `id` field is still needed for the standard inheritance trigger

3. **Error vs warning for orphan variants?**
   - Proposed: Warning only (variants might be used for documentation/templates)

4. **Web UI display?**
   - Show variant indicator in channel list
   - Show resolved values with variant attribution

## Future Considerations

- **Multiple variants**: `$variants: [customer-forms, dark-theme]` (not in initial implementation)
- **Variant-specific schemas**: Allow variants to have their own schema (unlikely needed)
- **Variant directories**: `variants/checkout_layout_order/customer-forms.yaml` (rejected - collides with channel names)
