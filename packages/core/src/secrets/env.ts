import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Load environment variables from .env file
 *
 * @param projectDir - Directory containing .env file
 * @returns Record of environment variables from .env file
 */
export async function loadEnvFile(projectDir: string): Promise<Record<string, string>> {
  const envPath = path.join(projectDir, '.env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = await fs.promises.readFile(envPath, 'utf-8');
  return parseEnvContent(content);
}

/**
 * Parse .env file content into key-value pairs
 *
 * Supports:
 * - KEY=value
 * - KEY="quoted value"
 * - KEY='single quoted value'
 * - # comments
 * - Empty lines
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    // Find the first = sign
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Handle quoted values
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Handle escape sequences in double-quoted strings
    if (trimmed.slice(eqIndex + 1).trim().startsWith('"')) {
      value = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get all environment variables from both .env file and process.env
 * Process.env values take precedence over .env file values
 *
 * @param projectDir - Directory containing .env file
 * @returns Merged environment variables
 */
export async function getEnvironment(projectDir: string): Promise<Record<string, string>> {
  const envFileVars = await loadEnvFile(projectDir);

  // Process.env values take precedence
  const processEnvVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      processEnvVars[key] = value;
    }
  }

  return {
    ...envFileVars,
    ...processEnvVars,
  };
}
