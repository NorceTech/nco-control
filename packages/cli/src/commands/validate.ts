import {
  loadProjectConfig,
  findProjectRoot,
  validateProject,
  ProjectConfigError,
  YamlLoadError,
} from '@nco-control/core';
import {
  printError,
  formatChannelResult,
  formatValidationError,
  printSummary,
} from '../output/console.js';
import { formatValidationJson, printJson } from '../output/json.js';

/**
 * Exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_VALIDATION_ERROR = 1;
const EXIT_FATAL_ERROR = 2;

/**
 * Run validate command
 */
export async function runValidate(options: { channel?: string; json?: boolean }): Promise<void> {
  try {
    // Find project root
    const projectRoot = findProjectRoot(process.cwd());
    if (!projectRoot) {
      printError("Not in an nco-control project. Run 'ncoctl init' first.");
      process.exit(EXIT_FATAL_ERROR);
    }

    // Load project config
    const config = await loadProjectConfig(projectRoot);

    // Run validation
    if (!options.json) {
      console.log('Validating configurations...\n');
    }

    const result = await validateProject(projectRoot, config, {
      channel: options.channel,
    });

    // Output results
    if (options.json) {
      printJson(formatValidationJson(result));
    } else {
      // Print per-channel results
      for (const channel of result.channels) {
        console.log(
          formatChannelResult(
            channel.name,
            channel.valid,
            channel.configCount,
            channel.errors.length
          )
        );

        // Print errors for invalid channels
        if (!channel.valid) {
          for (const error of channel.errors) {
            console.log(
              formatValidationError(error.filePath, error.fieldPath, error.message)
            );
          }
        }
      }

      // Print summary
      const validCount = result.channels.filter((ch) => ch.valid).length;
      const invalidCount = result.channels.filter((ch) => !ch.valid).length;
      printSummary(validCount, invalidCount);
    }

    // Exit with appropriate code
    process.exit(result.valid ? EXIT_SUCCESS : EXIT_VALIDATION_ERROR);
  } catch (error) {
    // Handle known error types
    if (error instanceof ProjectConfigError) {
      if (options.json) {
        printJson({ error: 'config_error', message: error.message });
      } else {
        printError(error.message);
      }
      process.exit(EXIT_FATAL_ERROR);
    }

    if (error instanceof YamlLoadError) {
      const message = error.line
        ? `${error.filePath}:${error.line}: ${error.message}`
        : `${error.filePath}: ${error.message}`;

      if (options.json) {
        printJson({ error: 'yaml_error', message });
      } else {
        printError(message);
      }
      process.exit(EXIT_FATAL_ERROR);
    }

    // Unknown error
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      printJson({ error: 'internal_error', message });
    } else {
      printError(`Unexpected error: ${message}`);
    }
    process.exit(EXIT_FATAL_ERROR);
  }
}
