import type { ProjectConfig, Channel, ChannelConfig } from '../types/index.js';
import type { Plan, ChannelPlan, ConfigPlan, PlanSummary } from './types.js';
import { validateProject } from '../validate/service.js';
import { discoverChannels } from '../config/discovery.js';
import { loadAllChannelConfigs } from '../config/loader.js';
import { getEnvironment } from '../secrets/env.js';
import { substituteSecrets, MissingEnvVarError } from '../secrets/substitute.js';
import { ConfigurationApiClient, ApiError } from '../api/client.js';
import { diffConfigs } from '../diff/differ.js';

/**
 * Options for plan generation
 */
export interface PlanOptions {
  /** Only plan specific channel */
  channel?: string;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Error thrown when plan validation fails
 */
export class PlanValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ channel: string; message: string }>
  ) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

/**
 * Generate a plan comparing local configurations to remote state
 *
 * @param projectDir - Project root directory
 * @param config - Project configuration
 * @param options - Plan options
 * @returns Plan with all changes
 */
export async function generatePlan(
  projectDir: string,
  config: ProjectConfig,
  options: PlanOptions = {}
): Promise<Plan> {
  // Step 1: Validate first
  const validationResult = await validateProject(projectDir, config, {
    channel: options.channel,
  });

  if (!validationResult.valid) {
    const errors = validationResult.channels
      .filter((ch) => !ch.valid)
      .flatMap((ch) =>
        ch.errors.map((e) => ({
          channel: ch.name,
          message: `${e.filePath}: ${e.message}`,
        }))
      );
    throw new PlanValidationError('Validation failed. Fix errors before planning.', errors);
  }

  // Step 2: Discover and load channels
  let channels = await discoverChannels(projectDir);

  if (options.channel) {
    channels = channels.filter((ch) => ch.name === options.channel);
    if (channels.length === 0) {
      throw new Error(`Channel '${options.channel}' not found`);
    }
  }

  channels = await loadAllChannelConfigs(channels, projectDir);

  // Step 3: Load environment and substitute secrets
  const env = await getEnvironment(projectDir);
  const channelsWithSecrets = substituteSecretsInChannels(channels, env);

  // Step 4: Get API token
  const token = env['NCOCTL_API_TOKEN'] ?? config.api.token;
  if (!token) {
    throw new Error(
      'API token required. Set NCOCTL_API_TOKEN environment variable or api.token in config.'
    );
  }

  // Step 5: Create API client and fetch remote state
  const client = new ConfigurationApiClient({
    baseUrl: config.api.baseUrl,
    token,
    merchant: config.merchant,
  });

  // Step 6: Generate plan for each channel
  const channelPlans: ChannelPlan[] = [];
  let remoteChannels: Set<string>;

  try {
    const remoteChannelList = await client.listChannels();
    remoteChannels = new Set(remoteChannelList.map((ch) => ch.name));
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(`Failed to list remote channels: ${error.message}`);
    }
    throw error;
  }

  for (const channel of channelsWithSecrets) {
    const channelPlan = await generateChannelPlan(
      channel,
      remoteChannels.has(channel.name),
      client
    );
    channelPlans.push(channelPlan);
  }

  // Step 7: Calculate summary
  const summary = calculateSummary(channelPlans, remoteChannels, channelsWithSecrets);

  return {
    merchant: config.merchant,
    timestamp: new Date().toISOString(),
    channels: channelPlans,
    summary,
  };
}

/**
 * Substitute secrets in all channel configs
 */
function substituteSecretsInChannels(
  channels: Channel[],
  env: Record<string, string>
): Channel[] {
  return channels.map((channel) => ({
    ...channel,
    configs: channel.configs.map((config) => {
      try {
        const substituted = substituteSecrets(config.merged, env);
        return {
          ...config,
          merged: substituted,
        };
      } catch (error) {
        if (error instanceof MissingEnvVarError) {
          throw new Error(
            `Missing environment variables in ${config.path}: ${error.missingVars.join(', ')}`
          );
        }
        throw error;
      }
    }),
  }));
}

/**
 * Generate plan for a single channel
 */
async function generateChannelPlan(
  channel: Channel,
  existsRemotely: boolean,
  client: ConfigurationApiClient
): Promise<ChannelPlan> {
  const configPlans: ConfigPlan[] = [];

  // Get remote configs if channel exists
  let remoteConfigs: Map<string, Record<string, unknown>> = new Map();
  if (existsRemotely) {
    try {
      const configs = await client.listConfigs(channel.name);
      for (const config of configs) {
        remoteConfigs.set(config.id, config);
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode !== 404) {
        throw new Error(
          `Failed to list configs for channel '${channel.name}': ${(error as Error).message}`
        );
      }
    }
  }

  // Compare each local config
  for (const localConfig of channel.configs) {
    const configPlan = generateConfigPlan(localConfig, remoteConfigs);
    configPlans.push(configPlan);
  }

  return {
    channel: channel.name,
    existsRemotely,
    configs: configPlans,
  };
}

/**
 * Generate plan for a single configuration
 */
function generateConfigPlan(
  localConfig: ChannelConfig,
  remoteConfigs: Map<string, Record<string, unknown>>
): ConfigPlan {
  const configId = localConfig.id ?? localConfig.name;
  const remoteConfig = remoteConfigs.get(configId);

  if (!remoteConfig) {
    // New configuration
    return {
      name: localConfig.name,
      status: 'create',
      diffs: diffConfigs(localConfig.merged, {}),
    };
  }

  // Compare existing
  const diffs = diffConfigs(localConfig.merged, remoteConfig);

  if (diffs.length === 0) {
    return {
      name: localConfig.name,
      status: 'unchanged',
      diffs: [],
    };
  }

  return {
    name: localConfig.name,
    status: 'update',
    diffs,
  };
}

/**
 * Calculate plan summary
 */
function calculateSummary(
  channelPlans: ChannelPlan[],
  remoteChannels: Set<string>,
  localChannels: Channel[]
): PlanSummary {
  let creates = 0;
  let updates = 0;
  let unchanged = 0;

  for (const channelPlan of channelPlans) {
    for (const configPlan of channelPlan.configs) {
      switch (configPlan.status) {
        case 'create':
          creates++;
          break;
        case 'update':
          updates++;
          break;
        case 'unchanged':
          unchanged++;
          break;
      }
    }
  }

  // Count unmanaged remote channels
  const localChannelNames = new Set(localChannels.map((ch) => ch.name));
  const unmanaged = [...remoteChannels].filter((name) => !localChannelNames.has(name)).length;

  return {
    creates,
    updates,
    unchanged,
    unmanaged,
  };
}

/**
 * Check if plan has changes to apply
 */
export function planHasChanges(plan: Plan): boolean {
  return plan.summary.creates > 0 || plan.summary.updates > 0;
}

/**
 * Get configs that need to be applied from a plan
 */
export function getConfigsToApply(plan: Plan): Array<{
  channel: string;
  configName: string;
  status: 'create' | 'update';
}> {
  const result: Array<{
    channel: string;
    configName: string;
    status: 'create' | 'update';
  }> = [];

  for (const channelPlan of plan.channels) {
    for (const configPlan of channelPlan.configs) {
      if (configPlan.status === 'create' || configPlan.status === 'update') {
        result.push({
          channel: channelPlan.channel,
          configName: configPlan.name,
          status: configPlan.status,
        });
      }
    }
  }

  return result;
}
