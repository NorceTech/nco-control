import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { Channel, ChannelConfig } from '../types/index.js';
import { findRootConfigs } from './discovery.js';
import { mergeConfigs, shouldInherit } from '../merge/hierarchy.js';

/**
 * Error thrown when YAML loading fails
 */
export class YamlLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly line?: number
  ) {
    super(message);
    this.name = 'YamlLoadError';
  }
}

/**
 * Load a single YAML file and parse its content
 *
 * @param filePath - Absolute path to YAML file
 * @returns Parsed YAML content as object
 */
export async function loadYamlFile(filePath: string): Promise<Record<string, unknown>> {
  let content: string;
  try {
    content = await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new YamlLoadError(
      `Failed to read file: ${(error as Error).message}`,
      filePath
    );
  }

  try {
    const parsed = yaml.load(content);

    // Handle empty files
    if (parsed === undefined || parsed === null) {
      return {};
    }

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new YamlLoadError(
        'YAML file must contain an object at the root level',
        filePath
      );
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new YamlLoadError(
        `YAML syntax error: ${error.message}`,
        filePath,
        error.mark?.line
      );
    }
    throw error;
  }
}

/**
 * Load all configurations for a channel
 *
 * @param channel - Channel to load configs for
 * @param projectDir - Project root directory (for finding root configs)
 * @returns Channel with populated configs array
 */
export async function loadChannelConfigs(
  channel: Channel,
  projectDir: string
): Promise<Channel> {
  const rootConfigs = await findRootConfigs(projectDir);
  const entries = await fs.promises.readdir(channel.path, { withFileTypes: true });
  const configs: ChannelConfig[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml')) continue;

    const configName = entry.name.replace(/\.(yaml|yml)$/, '');
    const configPath = path.join(channel.path, entry.name);

    // Load channel config
    const raw = await loadYamlFile(configPath);

    // Check for root config with same name
    const rootConfigPath = rootConfigs.get(configName);
    let merged = raw;
    let inheritsFromRoot = false;

    if (rootConfigPath && shouldInherit(raw)) {
      const rootConfig = await loadYamlFile(rootConfigPath);

      // Check if $schema matches (or one is missing)
      const rootSchema = rootConfig.$schema as string | undefined;
      const channelSchema = raw.$schema as string | undefined;

      if (!rootSchema || !channelSchema || rootSchema === channelSchema) {
        merged = mergeConfigs(rootConfig, raw);
        inheritsFromRoot = true;
      }
    }

    configs.push({
      name: configName,
      path: configPath,
      raw,
      merged,
      schemaUrl: merged.$schema as string | undefined,
      id: merged.id as string | undefined,
      inheritsFromRoot,
    });
  }

  // Sort configs alphabetically
  configs.sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...channel,
    configs,
  };
}

/**
 * Load all channel configurations for a project
 *
 * @param channels - Discovered channels
 * @param projectDir - Project root directory
 * @returns Channels with populated configs
 */
export async function loadAllChannelConfigs(
  channels: Channel[],
  projectDir: string
): Promise<Channel[]> {
  const loadedChannels: Channel[] = [];

  for (const channel of channels) {
    const loaded = await loadChannelConfigs(channel, projectDir);
    loadedChannels.push(loaded);
  }

  return loadedChannels;
}
