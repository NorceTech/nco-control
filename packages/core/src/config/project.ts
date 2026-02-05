import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { ProjectConfig } from '../types/index.js';

const CONFIG_FILENAME = 'ncoctl.config.yaml';
const DEFAULT_SCHEMA_CACHE_DIR = '.ncoctl/schemas';
const DEFAULT_SCHEMA_CACHE_TTL = 86400; // 24 hours

/**
 * Error thrown when project configuration is invalid
 */
export class ProjectConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectConfigError';
  }
}

/**
 * Load project configuration from ncoctl.config.yaml
 *
 * @param projectDir - Directory containing ncoctl.config.yaml
 * @returns Validated ProjectConfig
 * @throws ProjectConfigError if config is missing or invalid
 */
export async function loadProjectConfig(projectDir: string): Promise<ProjectConfig> {
  const configPath = path.join(projectDir, CONFIG_FILENAME);

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    throw new ProjectConfigError(
      `Configuration file not found: ${configPath}\nRun 'ncoctl init' to create one.`
    );
  }

  // Read and parse YAML
  let rawConfig: unknown;
  try {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    rawConfig = yaml.load(content);
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      throw new ProjectConfigError(`Invalid YAML in ${configPath}: ${error.message}`);
    }
    throw error;
  }

  // Validate structure
  const config = validateProjectConfig(rawConfig, configPath);

  // Apply defaults
  return applyDefaults(config, projectDir);
}

/**
 * Validate raw config object against expected structure
 */
function validateProjectConfig(raw: unknown, configPath: string): ProjectConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new ProjectConfigError(`Invalid configuration in ${configPath}: expected object`);
  }

  const obj = raw as Record<string, unknown>;

  // Validate merchant
  if (typeof obj.merchant !== 'string' || obj.merchant.trim() === '') {
    throw new ProjectConfigError(
      `Invalid configuration in ${configPath}: 'merchant' is required and must be a non-empty string`
    );
  }

  // Validate api section
  if (typeof obj.api !== 'object' || obj.api === null) {
    throw new ProjectConfigError(
      `Invalid configuration in ${configPath}: 'api' section is required`
    );
  }

  const api = obj.api as Record<string, unknown>;

  if (typeof api.baseUrl !== 'string' || api.baseUrl.trim() === '') {
    throw new ProjectConfigError(
      `Invalid configuration in ${configPath}: 'api.baseUrl' is required and must be a non-empty string`
    );
  }

  // Validate URL format
  try {
    new URL(api.baseUrl);
  } catch {
    throw new ProjectConfigError(
      `Invalid configuration in ${configPath}: 'api.baseUrl' must be a valid URL`
    );
  }

  // Validate optional schema section (null is treated as not specified)
  if (obj.schema !== undefined && obj.schema !== null) {
    if (typeof obj.schema !== 'object') {
      throw new ProjectConfigError(
        `Invalid configuration in ${configPath}: 'schema' must be an object`
      );
    }

    const schema = obj.schema as Record<string, unknown>;

    if (schema.cacheTtl !== undefined) {
      if (typeof schema.cacheTtl !== 'number' || schema.cacheTtl <= 0) {
        throw new ProjectConfigError(
          `Invalid configuration in ${configPath}: 'schema.cacheTtl' must be a positive number`
        );
      }
    }
  }

  // Validate optional output section (null is treated as not specified)
  if (obj.output !== undefined && obj.output !== null) {
    if (typeof obj.output !== 'object') {
      throw new ProjectConfigError(
        `Invalid configuration in ${configPath}: 'output' must be an object`
      );
    }

    const output = obj.output as Record<string, unknown>;

    if (output.format !== undefined && output.format !== 'text' && output.format !== 'json') {
      throw new ProjectConfigError(
        `Invalid configuration in ${configPath}: 'output.format' must be 'text' or 'json'`
      );
    }
  }

  return obj as unknown as ProjectConfig;
}

/**
 * Apply default values to config
 */
function applyDefaults(config: ProjectConfig, projectDir: string): ProjectConfig {
  return {
    ...config,
    api: {
      ...config.api,
      // Token from env var takes precedence
      token: process.env.NCO_API_TOKEN ?? config.api.token,
    },
    schema: {
      cacheDir: config.schema?.cacheDir ?? path.join(projectDir, DEFAULT_SCHEMA_CACHE_DIR),
      cacheTtl: config.schema?.cacheTtl ?? DEFAULT_SCHEMA_CACHE_TTL,
      skip: config.schema?.skip ?? false,
    },
    output: {
      format: config.output?.format ?? 'text',
      verbose: config.output?.verbose ?? false,
    },
  };
}

/**
 * Find project root by searching for ncoctl.config.yaml
 *
 * @param startDir - Directory to start searching from
 * @returns Absolute path to project root, or null if not found
 */
export function findProjectRoot(startDir: string): string | null {
  let currentDir = path.resolve(startDir);

  while (true) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      return null;
    }
    currentDir = parentDir;
  }
}
