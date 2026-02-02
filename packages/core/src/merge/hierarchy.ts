import { deepMerge } from './deep-merge.js';

/**
 * Check if a channel config should inherit from root config
 *
 * Inheritance requires:
 * - Channel config must have an 'id' field (explicit opt-in)
 *
 * @param channelConfig - The channel configuration object
 * @returns true if config should inherit from root
 */
export function shouldInherit(channelConfig: Record<string, unknown>): boolean {
  // Explicit opt-in: channel file must contain 'id' field to inherit
  return 'id' in channelConfig && channelConfig.id !== undefined;
}

/**
 * Check if two configs have compatible schemas for inheritance
 *
 * Rules:
 * - If neither has $schema, they're compatible
 * - If only one has $schema, they're compatible (inherit schema from root)
 * - If both have $schema, they must match exactly
 *
 * @param rootConfig - Root configuration
 * @param channelConfig - Channel configuration
 * @returns true if schemas are compatible for inheritance
 */
export function schemasCompatible(
  rootConfig: Record<string, unknown>,
  channelConfig: Record<string, unknown>
): boolean {
  const rootSchema = rootConfig.$schema as string | undefined;
  const channelSchema = channelConfig.$schema as string | undefined;

  // If either is missing, compatible
  if (!rootSchema || !channelSchema) {
    return true;
  }

  // Both present - must match exactly
  return rootSchema === channelSchema;
}

/**
 * Merge root and channel configurations
 *
 * @param rootConfig - Root configuration (base)
 * @param channelConfig - Channel configuration (overlay)
 * @returns Merged configuration with channel values taking precedence
 */
export function mergeConfigs(
  rootConfig: Record<string, unknown>,
  channelConfig: Record<string, unknown>
): Record<string, unknown> {
  return deepMerge(rootConfig, channelConfig);
}
