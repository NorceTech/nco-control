import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Channel } from '../types/index.js';

/**
 * Directories to exclude from channel discovery
 */
const EXCLUDED_PREFIXES = ['.', '_'];
const EXCLUDED_NAMES = ['node_modules', 'dist', 'build', 'packages'];

/**
 * Discover all channels in the project directory
 *
 * A channel is a directory containing at least one .yaml file.
 * Excludes directories starting with . or _, and node_modules.
 *
 * @param projectDir - Project root directory
 * @returns Array of discovered channels with pending validation status
 */
export async function discoverChannels(projectDir: string): Promise<Channel[]> {
  const entries = await fs.promises.readdir(projectDir, { withFileTypes: true });
  const channels: Channel[] = [];

  for (const entry of entries) {
    // Skip non-directories
    if (!entry.isDirectory()) {
      continue;
    }

    // Skip excluded directories
    if (shouldExcludeDirectory(entry.name)) {
      continue;
    }

    const channelPath = path.join(projectDir, entry.name);

    // Check if directory contains .yaml files
    const yamlFiles = await findYamlFiles(channelPath);
    if (yamlFiles.length === 0) {
      continue;
    }

    channels.push({
      name: entry.name,
      path: channelPath,
      configs: [], // Will be populated by config loader
      validationStatus: 'pending',
    });
  }

  // Sort channels alphabetically for consistent ordering
  channels.sort((a, b) => a.name.localeCompare(b.name));

  return channels;
}

/**
 * Check if a directory should be excluded from discovery
 */
function shouldExcludeDirectory(name: string): boolean {
  // Check excluded prefixes
  for (const prefix of EXCLUDED_PREFIXES) {
    if (name.startsWith(prefix)) {
      return true;
    }
  }

  // Check excluded names
  if (EXCLUDED_NAMES.includes(name)) {
    return true;
  }

  return false;
}

/**
 * Find all .yaml files in a directory (non-recursive)
 */
async function findYamlFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const yamlFiles: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      yamlFiles.push(path.join(dirPath, entry.name));
    }
  }

  return yamlFiles;
}

/**
 * Find root-level configuration files
 * These are .yaml files in the project root that can be inherited by channels
 *
 * @param projectDir - Project root directory
 * @returns Map of config name to file path
 */
export async function findRootConfigs(projectDir: string): Promise<Map<string, string>> {
  const rootConfigs = new Map<string, string>();
  const entries = await fs.promises.readdir(projectDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      // Skip the project config file
      if (entry.name === 'ncoctl.config.yaml') {
        continue;
      }

      // Use filename without extension as config name
      const configName = entry.name.replace(/\.(yaml|yml)$/, '');
      rootConfigs.set(configName, path.join(projectDir, entry.name));
    }
  }

  return rootConfigs;
}
