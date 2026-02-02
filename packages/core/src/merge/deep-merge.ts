/**
 * Deep merge two configuration objects
 *
 * Rules:
 * - Objects are merged recursively (field by field)
 * - Arrays are replaced entirely (channel array overwrites root)
 * - null values remove the field from the result
 * - Primitive values from overlay override base
 *
 * @param base - Base configuration (e.g., root config)
 * @param overlay - Overlay configuration (e.g., channel config)
 * @returns Merged configuration
 */
export function deepMerge(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Start with all keys from base
  for (const key of Object.keys(base)) {
    const baseValue = base[key];
    const overlayValue = overlay[key];

    // If overlay explicitly sets to null, skip this key (remove from result)
    if (overlayValue === null) {
      continue;
    }

    // If overlay doesn't have this key, use base value
    if (!(key in overlay)) {
      result[key] = cloneValue(baseValue);
      continue;
    }

    // Both have the key - merge based on type
    result[key] = mergeValues(baseValue, overlayValue);
  }

  // Add keys that only exist in overlay
  for (const key of Object.keys(overlay)) {
    if (key in result) continue;
    if (overlay[key] === null) continue;

    result[key] = cloneValue(overlay[key]);
  }

  return result;
}

/**
 * Merge two values based on their types
 */
function mergeValues(base: unknown, overlay: unknown): unknown {
  // If types differ, overlay wins
  if (typeof base !== typeof overlay) {
    return cloneValue(overlay);
  }

  // Arrays: overlay replaces base entirely
  if (Array.isArray(base) || Array.isArray(overlay)) {
    return cloneValue(overlay);
  }

  // Objects: recursive merge
  if (
    typeof base === 'object' &&
    base !== null &&
    typeof overlay === 'object' &&
    overlay !== null
  ) {
    return deepMerge(
      base as Record<string, unknown>,
      overlay as Record<string, unknown>
    );
  }

  // Primitives: overlay wins
  return overlay;
}

/**
 * Clone a value to avoid reference issues
 */
function cloneValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = cloneValue(val);
    }
    return result;
  }

  // Primitives are already immutable
  return value;
}
