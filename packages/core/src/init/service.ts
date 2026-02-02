import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getConfigTemplate,
  ENV_EXAMPLE_TEMPLATE,
  GITIGNORE_ENTRIES,
} from './templates.js';

/**
 * Options for init operation
 */
export interface InitOptions {
  /** Merchant identifier */
  merchant: string;
  /** API base URL */
  apiUrl?: string;
  /** Force overwrite existing files */
  force?: boolean;
}

/**
 * Result of init operation
 */
export interface InitResult {
  /** Whether init succeeded */
  success: boolean;
  /** Files created */
  filesCreated: string[];
  /** Files skipped (already exist) */
  filesSkipped: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Initialize a new nco-control project
 *
 * @param projectDir - Directory to initialize
 * @param options - Init options
 * @returns Init result
 */
export async function initProject(
  projectDir: string,
  options: InitOptions
): Promise<InitResult> {
  const filesCreated: string[] = [];
  const filesSkipped: string[] = [];

  try {
    // Ensure project directory exists
    if (!fs.existsSync(projectDir)) {
      await fs.promises.mkdir(projectDir, { recursive: true });
    }

    // Create ncoctl.config.yaml
    const configPath = path.join(projectDir, 'ncoctl.config.yaml');
    const configResult = await createFile(
      configPath,
      getConfigTemplate(options.merchant),
      options.force
    );
    if (configResult === 'created') {
      filesCreated.push('ncoctl.config.yaml');
    } else {
      filesSkipped.push('ncoctl.config.yaml');
    }

    // Create .env.example
    const envExamplePath = path.join(projectDir, '.env.example');
    const envResult = await createFile(
      envExamplePath,
      ENV_EXAMPLE_TEMPLATE,
      options.force
    );
    if (envResult === 'created') {
      filesCreated.push('.env.example');
    } else {
      filesSkipped.push('.env.example');
    }

    // Update .gitignore
    const gitignorePath = path.join(projectDir, '.gitignore');
    const gitignoreResult = await appendToGitignore(gitignorePath);
    if (gitignoreResult === 'created') {
      filesCreated.push('.gitignore');
    } else if (gitignoreResult === 'updated') {
      filesCreated.push('.gitignore (updated)');
    }

    return {
      success: true,
      filesCreated,
      filesSkipped,
    };
  } catch (error) {
    return {
      success: false,
      filesCreated,
      filesSkipped,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a file if it doesn't exist (or force)
 */
async function createFile(
  filePath: string,
  content: string,
  force?: boolean
): Promise<'created' | 'skipped'> {
  if (fs.existsSync(filePath) && !force) {
    return 'skipped';
  }

  await fs.promises.writeFile(filePath, content, 'utf-8');
  return 'created';
}

/**
 * Append nco-control entries to .gitignore
 */
async function appendToGitignore(
  filePath: string
): Promise<'created' | 'updated' | 'unchanged'> {
  const marker = '# nco-control';

  if (fs.existsSync(filePath)) {
    const existing = await fs.promises.readFile(filePath, 'utf-8');

    // Check if already has our entries
    if (existing.includes(marker)) {
      return 'unchanged';
    }

    // Append our entries
    const newContent = existing.trimEnd() + '\n' + GITIGNORE_ENTRIES;
    await fs.promises.writeFile(filePath, newContent, 'utf-8');
    return 'updated';
  }

  // Create new .gitignore
  await fs.promises.writeFile(filePath, GITIGNORE_ENTRIES.trim() + '\n', 'utf-8');
  return 'created';
}

/**
 * Check if a directory is already an nco-control project
 */
export function isNcoControlProject(projectDir: string): boolean {
  const configPath = path.join(projectDir, 'ncoctl.config.yaml');
  return fs.existsSync(configPath);
}
