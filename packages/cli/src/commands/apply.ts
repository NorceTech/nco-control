import {
  loadProjectConfig,
  findProjectRoot,
  generatePlan,
  formatPlan,
  planHasChanges,
  applyConfigs,
  formatApplyResult,
  PlanValidationError,
  ProjectConfigError,
  YamlLoadError,
  ApiError,
} from '@nco-control/core';
import { printError } from '../output/console.js';
import { printJson } from '../output/json.js';
import { confirm } from '../output/prompt.js';

/**
 * Exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_PARTIAL_FAILURE = 1;
const EXIT_FATAL_ERROR = 2;

/**
 * Run apply command
 */
export async function runApply(options: { channel?: string; yes?: boolean; json?: boolean }): Promise<void> {
  try {
    // Find project root
    const projectRoot = findProjectRoot(process.cwd());
    if (!projectRoot) {
      printError("Not in an nco-control project. Run 'ncoctl init' first.");
      process.exit(EXIT_FATAL_ERROR);
    }

    // Load project config
    const config = await loadProjectConfig(projectRoot);

    // Generate plan first
    if (!options.json) {
      console.log('Generating plan...\n');
    }

    const plan = await generatePlan(projectRoot, config, {
      channel: options.channel,
    });

    // Check if there are any changes
    if (!planHasChanges(plan)) {
      if (options.json) {
        printJson({
          success: true,
          message: 'No changes to apply',
          plan,
        });
      } else {
        console.log('No changes to apply. All configurations are up to date.');
      }
      process.exit(EXIT_SUCCESS);
    }

    // Show plan
    if (!options.json) {
      const useColors = !process.env['NO_COLOR'] && process.env['FORCE_COLOR'] !== '0';
      console.log(formatPlan(plan, { colors: useColors }));
      console.log('');
    }

    // Confirm unless --yes
    if (!options.yes && !options.json) {
      const totalChanges = plan.summary.creates + plan.summary.updates;
      const confirmed = await confirm(
        `Apply ${totalChanges} configuration change(s)?`,
        false
      );

      if (!confirmed) {
        console.log('\nApply cancelled.');
        process.exit(EXIT_SUCCESS);
      }
      console.log('');
    }

    // Apply changes
    if (!options.json) {
      console.log('Applying changes...\n');
    }

    const result = await applyConfigs(projectRoot, config, plan, {
      channel: options.channel,
    });

    // Output results
    if (options.json) {
      printJson({
        success: result.success,
        results: result.results,
        summary: result.summary,
      });
    } else {
      const useColors = !process.env['NO_COLOR'] && process.env['FORCE_COLOR'] !== '0';
      console.log(formatApplyResult(result, useColors));
    }

    // Exit with appropriate code
    process.exit(result.success ? EXIT_SUCCESS : EXIT_PARTIAL_FAILURE);
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
        printError('Validation failed. Fix the following errors before applying:\n');
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
