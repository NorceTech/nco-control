import { initProject, isNcoControlProject } from '@nco-control/core';
import { printError, printSuccess } from '../output/console.js';
import { printJson } from '../output/json.js';
import { confirm } from '../output/prompt.js';

/**
 * Exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_FATAL_ERROR = 2;

/**
 * Run init command
 */
export async function runInit(
  directory: string,
  options: { merchant: string; apiUrl?: string; force?: boolean; json?: boolean }
): Promise<void> {
  try {
    const projectDir = directory === '.' ? process.cwd() : directory;

    // Check if already initialized
    if (isNcoControlProject(projectDir) && !options.force) {
      if (!options.json) {
        const shouldOverwrite = await confirm(
          'This directory is already an nco-control project. Overwrite existing files?',
          false
        );
        if (!shouldOverwrite) {
          console.log('\nInit cancelled.');
          process.exit(EXIT_SUCCESS);
        }
        options.force = true;
      }
    }

    // Initialize project
    if (!options.json) {
      console.log(`Initializing nco-control project for merchant: ${options.merchant}\n`);
    }

    const result = await initProject(projectDir, {
      merchant: options.merchant,
      apiUrl: options.apiUrl,
      force: options.force,
    });

    // Output results
    if (options.json) {
      printJson(result);
    } else {
      if (result.success) {
        if (result.filesCreated.length > 0) {
          console.log('Created:');
          for (const file of result.filesCreated) {
            console.log(`  - ${file}`);
          }
        }

        if (result.filesSkipped.length > 0) {
          console.log('\nSkipped (already exist):');
          for (const file of result.filesSkipped) {
            console.log(`  - ${file}`);
          }
        }

        console.log('');
        printSuccess('Project initialized successfully!');
        console.log('\nNext steps:');
        console.log('  1. Update ncoctl.config.yaml with your API base URL');
        console.log('  2. Copy .env.example to .env and add your API token');
        console.log('  3. Create channel directories with .yaml configuration files');
        console.log('  4. Run `ncoctl validate` to check your configurations');
      } else {
        printError(`Failed to initialize project: ${result.error}`);
      }
    }

    // Exit with appropriate code
    process.exit(result.success ? EXIT_SUCCESS : EXIT_FATAL_ERROR);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      printJson({ error: 'internal_error', message });
    } else {
      printError(`Unexpected error: ${message}`);
    }
    process.exit(EXIT_FATAL_ERROR);
  }
}

