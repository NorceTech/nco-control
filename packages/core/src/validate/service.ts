import type {
  ProjectConfig,
  Channel,
  ChannelConfig,
  ValidationError,
  ChannelValidationResult,
  ValidationResult,
} from '../types/index.js';
import { discoverChannels } from '../config/discovery.js';
import { loadAllChannelConfigs } from '../config/loader.js';
import { SchemaCache } from '../schema/cache.js';
import { SchemaValidator } from '../schema/validator.js';
import { getEnvironment } from '../secrets/env.js';
import { substituteSecrets, checkMissingEnvVars } from '../secrets/substitute.js';

/**
 * Options for validation
 */
export interface ValidateOptions {
  /** Only validate specific channel */
  channel?: string;
}

/**
 * Validate all configurations in a project
 *
 * @param projectDir - Project root directory
 * @param config - Project configuration
 * @param options - Validation options
 * @returns Validation result with per-channel status
 */
export async function validateProject(
  projectDir: string,
  config: ProjectConfig,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  // Skip validation if configured
  if (config.schema?.skip) {
    return {
      valid: true,
      channels: [],
    };
  }

  // Discover and load channels
  let channels = await discoverChannels(projectDir);

  // Filter to specific channel if requested
  if (options.channel) {
    channels = channels.filter((ch) => ch.name === options.channel);
    if (channels.length === 0) {
      throw new Error(`Channel '${options.channel}' not found`);
    }
  }

  // Load all configs
  channels = await loadAllChannelConfigs(channels, projectDir);

  // Create cache and validator
  const cacheDir = config.schema?.cacheDir ?? `${projectDir}/.ncoctl/schemas`;
  const cacheTtl = config.schema?.cacheTtl ?? 86400;
  const cache = new SchemaCache(cacheDir, cacheTtl);
  const validator = new SchemaValidator(cache);

  // Load environment variables for secret substitution
  const env = await getEnvironment(projectDir);

  // Validate each channel
  const channelResults: ChannelValidationResult[] = [];
  let allValid = true;

  for (const channel of channels) {
    const result = await validateChannel(channel, validator, env);
    channelResults.push(result);

    if (!result.valid) {
      allValid = false;
    }
  }

  return {
    valid: allValid,
    channels: channelResults,
  };
}

/**
 * Validate all configurations in a channel
 */
async function validateChannel(
  channel: Channel,
  validator: SchemaValidator,
  env: Record<string, string>
): Promise<ChannelValidationResult> {
  const errors: ValidationError[] = [];

  for (const config of channel.configs) {
    // Skip configs without schema
    if (!config.schemaUrl) {
      continue;
    }

    // Substitute secrets before validation
    const configWithSecrets = substituteSecretsForValidation(config, env);

    try {
      const configErrors = await validator.validate(
        configWithSecrets.merged,
        configWithSecrets.schemaUrl!,
        config.path
      );
      errors.push(...configErrors);
    } catch (error) {
      // Schema fetch or validation setup error
      errors.push({
        filePath: config.path,
        fieldPath: '$schema',
        message: `Schema validation failed: ${(error as Error).message}`,
      });
    }
  }

  return {
    name: channel.name,
    valid: errors.length === 0,
    configCount: channel.configs.length,
    errors,
  };
}

/**
 * Substitute secrets in a config for validation
 * Reports missing env vars as validation warnings but doesn't fail
 */
function substituteSecretsForValidation(
  config: ChannelConfig,
  env: Record<string, string>
): ChannelConfig {
  // Check for missing env vars - we'll still validate but with placeholders
  const missingVars = checkMissingEnvVars(config.merged, env);

  if (missingVars.length === 0) {
    // All vars present, substitute them
    const substituted = substituteSecrets(config.merged, env);
    return {
      ...config,
      merged: substituted,
    };
  }

  // Some vars missing - create a partial substitution
  // Use placeholder values for missing vars to allow validation to proceed
  const envWithPlaceholders = { ...env };
  for (const varName of missingVars) {
    envWithPlaceholders[varName] = `\${${varName}}`;
  }

  const substituted = substituteSecrets(config.merged, envWithPlaceholders);
  return {
    ...config,
    merged: substituted,
  };
}
