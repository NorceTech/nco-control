import type { ValidationResult } from '@nco-control/core';

/**
 * JSON output format for validation results
 */
export interface ValidationJsonOutput {
  valid: boolean;
  channels: {
    name: string;
    valid: boolean;
    configCount: number;
    errors: {
      filePath: string;
      fieldPath: string;
      message: string;
      expected?: string;
      actual?: string;
    }[];
  }[];
}

/**
 * Format validation result as JSON
 */
export function formatValidationJson(result: ValidationResult): ValidationJsonOutput {
  return {
    valid: result.valid,
    channels: result.channels.map((channel) => ({
      name: channel.name,
      valid: channel.valid,
      configCount: channel.configCount,
      errors: channel.errors.map((error) => ({
        filePath: error.filePath,
        fieldPath: error.fieldPath,
        message: error.message,
        ...(error.expected && { expected: error.expected }),
        ...(error.actual && { actual: error.actual }),
      })),
    })),
  };
}

/**
 * Print JSON output to stdout
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
