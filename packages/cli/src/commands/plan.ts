import {
  loadProjectConfig,
  findProjectRoot,
  generatePlan,
  formatPlan,
  PlanValidationError,
  ProjectConfigError,
  YamlLoadError,
  ApiError,
} from '@nco-control/core';
import { printError } from '../output/console.js';
import { printJson } from '../output/json.js';

/**
 * Exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_FATAL_ERROR = 2;

/**
 * Run plan command
 */
export async function runPlan(options: { channel?: string; verbose?: boolean; json?: boolean }): Promise<void> {
  try {
    // Find project root
    const projectRoot = findProjectRoot(process.cwd());
    if (!projectRoot) {
      printError("Not in an nco-control project. Run 'ncoctl init' first.");
      process.exit(EXIT_FATAL_ERROR);
    }

    // Load project config
    const config = await loadProjectConfig(projectRoot);

    // Generate plan
    if (!options.json) {
      console.log('Generating plan...\n');
    }

    const plan = await generatePlan(projectRoot, config, {
      channel: options.channel,
      verbose: options.verbose,
    });

    // Output results
    if (options.json) {
      printJson(plan);
    } else {
      const useColors = !process.env['NO_COLOR'] && process.env['FORCE_COLOR'] !== '0';
      const formatted = formatPlan(plan, {
        colors: useColors,
        verbose: options.verbose,
      });
      console.log(formatted);
    }

    // Exit with appropriate code
    process.exit(EXIT_SUCCESS);
  } catch (error) {
    // Handle validation errors
    if (error instanceof PlanValidationError) {
      if (options.json) {
        printJson({
          error: 'validation_error',
          message: error.message,
          details: error.errors,
        });
      } else {
        printError('Validation failed. Fix the following errors before planning:\n');
        for (const e of error.errors) {
          console.log(`  ${e.channel}: ${e.message}`);
        }
      }
      process.exit(EXIT_FATAL_ERROR);
    }

    // Handle API errors
    if (error instanceof ApiError) {
      if (options.json) {
        printJson({
          error: 'api_error',
          message: error.message,
          statusCode: error.statusCode,
        });
      } else {
        printError(`API error (${error.statusCode}): ${error.message}`);
      }
      process.exit(EXIT_FATAL_ERROR);
    }

    // Handle config errors
    if (error instanceof ProjectConfigError) {
      if (options.json) {
        printJson({ error: 'config_error', message: error.message });
      } else {
        printError(error.message);
      }
      process.exit(EXIT_FATAL_ERROR);
    }

    // Handle YAML errors
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
