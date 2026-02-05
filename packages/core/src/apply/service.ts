import type { ProjectConfig, ApplyResult, ConfigApplyResult, Channel } from '../types/index.js';
import type { Plan } from '../plan/types.js';
import { generatePlan, getConfigsToApply } from '../plan/service.js';
import { ConfigurationApiClient, ApiError } from '../api/client.js';
import { getEnvironment } from '../secrets/env.js';
import { discoverChannels } from '../config/discovery.js';
import { loadAllChannelConfigs } from '../config/loader.js';
import { substituteSecrets, MissingEnvVarError } from '../secrets/substitute.js';

/**
 * Options for apply operation
 */
export interface ApplyOptions {
  /** Only apply to specific channel */
  channel?: string;
  /** Skip confirmation (equivalent to --yes) */
  skipConfirmation?: boolean;
}

/**
 * Apply local configurations to remote API
 *
 * @param projectDir - Project root directory
 * @param config - Project configuration
 * @param plan - Pre-generated plan (optional - will generate if not provided)
 * @param options - Apply options
 * @returns Apply result with per-config status
 */
export async function applyConfigs(
  projectDir: string,
  config: ProjectConfig,
  plan?: Plan,
  options: ApplyOptions = {}
): Promise<ApplyResult> {
  // Generate plan if not provided
  if (!plan) {
    plan = await generatePlan(projectDir, config, {
      channel: options.channel,
    });
  }

  // Get configs to apply
  const configsToApply = getConfigsToApply(plan);

  // If no changes, return early
  if (configsToApply.length === 0) {
    return {
      success: true,
      results: [],
      summary: {
        succeeded: 0,
        failed: 0,
        skipped: plan.summary.unchanged,
      },
    };
  }

  // Load environment and get token
  const env = await getEnvironment(projectDir);
  const token = env['NCO_API_TOKEN'] ?? config.api.token;
  if (!token) {
    throw new Error(
      'API token required. Set NCO_API_TOKEN environment variable or api.token in config.'
    );
  }

  // Create API client
  const client = new ConfigurationApiClient({
    baseUrl: config.api.baseUrl,
    token,
    merchant: config.merchant,
  });

  // Load channels with substituted secrets
  let channels = await discoverChannels(projectDir);
  if (options.channel) {
    channels = channels.filter((ch) => ch.name === options.channel);
  }
  channels = await loadAllChannelConfigs(channels, projectDir);
  const channelsWithSecrets = substituteSecretsInChannels(channels, env);

  // Build a map of config content by channel/name for quick lookup
  const configMap = buildConfigMap(channelsWithSecrets);

  // Apply each config
  const results: ConfigApplyResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const toApply of configsToApply) {
    const configKey = `${toApply.channel}/${toApply.configName}`;
    const configContent = configMap.get(configKey);

    if (!configContent) {
      results.push({
        channel: toApply.channel,
        config: toApply.configName,
        success: false,
        error: 'Configuration content not found',
      });
      failed++;
      continue;
    }

    try {
      await client.putConfig(toApply.channel, toApply.configName, configContent);
      results.push({
        channel: toApply.channel,
        config: toApply.configName,
        success: true,
      });
      succeeded++;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? `API error (${error.statusCode}): ${error.message}`
          : error instanceof Error
            ? error.message
            : String(error);

      results.push({
        channel: toApply.channel,
        config: toApply.configName,
        success: false,
        error: errorMessage,
      });
      failed++;
    }
  }

  return {
    success: failed === 0,
    results,
    summary: {
      succeeded,
      failed,
      skipped: plan.summary.unchanged,
    },
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
 * Build a map of config content by channel/name
 */
function buildConfigMap(channels: Channel[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();

  for (const channel of channels) {
    for (const config of channel.configs) {
      const key = `${channel.name}/${config.name}`;
      map.set(key, config.merged);
    }
  }

  return map;
}

/**
 * Format apply result as summary text
 */
export function formatApplyResult(result: ApplyResult, colors: boolean = true): string {
  const c = colors
    ? {
        reset: '\x1b[0m',
        green: '\x1b[32m',
        red: '\x1b[31m',
        yellow: '\x1b[33m',
        bold: '\x1b[1m',
      }
    : { reset: '', green: '', red: '', yellow: '', bold: '' };

  const lines: string[] = [];

  // Per-config results
  for (const r of result.results) {
    if (r.success) {
      lines.push(`${c.green}✓${c.reset} ${r.channel}/${r.config}`);
    } else {
      lines.push(`${c.red}✗${c.reset} ${r.channel}/${r.config}: ${r.error}`);
    }
  }

  // Summary
  lines.push('');
  lines.push(`${c.bold}Apply Summary:${c.reset}`);
  if (result.summary.succeeded > 0) {
    lines.push(`  ${c.green}✓ ${result.summary.succeeded} succeeded${c.reset}`);
  }
  if (result.summary.failed > 0) {
    lines.push(`  ${c.red}✗ ${result.summary.failed} failed${c.reset}`);
  }
  if (result.summary.skipped > 0) {
    lines.push(`  ${c.yellow}○ ${result.summary.skipped} skipped (no changes)${c.reset}`);
  }

  // Overall status
  lines.push('');
  if (result.success) {
    lines.push(`${c.green}${c.bold}Apply complete!${c.reset}`);
  } else {
    lines.push(`${c.red}${c.bold}Apply completed with errors.${c.reset}`);
  }

  return lines.join('\n');
}
