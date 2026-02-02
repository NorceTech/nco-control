import pc from 'picocolors';

/**
 * Check if colors are enabled based on environment
 */
export function colorsEnabled(): boolean {
  // NO_COLOR takes precedence
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  // FORCE_COLOR enables colors
  if (process.env.FORCE_COLOR !== undefined) {
    return true;
  }
  // Default: colors enabled if stdout is a TTY
  return process.stdout.isTTY ?? false;
}

/**
 * Symbols for output
 */
export const symbols = {
  success: colorsEnabled() ? pc.green('✔') : '[OK]',
  error: colorsEnabled() ? pc.red('✗') : '[ERROR]',
  warning: colorsEnabled() ? pc.yellow('⚠') : '[WARN]',
  info: colorsEnabled() ? pc.blue('ℹ') : '[INFO]',
  add: colorsEnabled() ? pc.green('+') : '+',
  remove: colorsEnabled() ? pc.red('-') : '-',
  change: colorsEnabled() ? pc.yellow('~') : '~',
};

/**
 * Format text with color if enabled
 */
export const fmt = {
  success: (text: string) => (colorsEnabled() ? pc.green(text) : text),
  error: (text: string) => (colorsEnabled() ? pc.red(text) : text),
  warning: (text: string) => (colorsEnabled() ? pc.yellow(text) : text),
  info: (text: string) => (colorsEnabled() ? pc.blue(text) : text),
  dim: (text: string) => (colorsEnabled() ? pc.dim(text) : text),
  bold: (text: string) => (colorsEnabled() ? pc.bold(text) : text),
  cyan: (text: string) => (colorsEnabled() ? pc.cyan(text) : text),
};

/**
 * Print a success message
 */
export function printSuccess(message: string): void {
  console.log(`${symbols.success} ${message}`);
}

/**
 * Print an error message
 */
export function printError(message: string): void {
  console.error(`${symbols.error} ${message}`);
}

/**
 * Print a warning message
 */
export function printWarning(message: string): void {
  console.log(`${symbols.warning} ${message}`);
}

/**
 * Print an info message
 */
export function printInfo(message: string): void {
  console.log(`${symbols.info} ${message}`);
}

/**
 * Format a validation result line for a channel
 */
export function formatChannelResult(
  name: string,
  valid: boolean,
  configCount: number,
  errorCount: number
): string {
  const symbol = valid ? symbols.success : symbols.error;
  const countText = `${configCount} config${configCount !== 1 ? 's' : ''}`;

  if (valid) {
    return `${symbol} ${name} (${countText})`;
  } else {
    return `${symbol} ${name} (${fmt.error(`${errorCount} error${errorCount !== 1 ? 's' : ''}`)})`;
  }
}

/**
 * Format a validation error for display
 */
export function formatValidationError(
  filePath: string,
  fieldPath: string,
  message: string
): string {
  const relativePath = filePath.split('/').slice(-2).join('/');
  return `  ${relativePath}:\n    ${fmt.dim(fieldPath)}: ${message}`;
}

/**
 * Print a summary line
 */
export function printSummary(validCount: number, invalidCount: number): void {
  const parts: string[] = [];

  if (validCount > 0) {
    parts.push(fmt.success(`${validCount} channel${validCount !== 1 ? 's' : ''} valid`));
  }

  if (invalidCount > 0) {
    parts.push(fmt.error(`${invalidCount} channel${invalidCount !== 1 ? 's' : ''} invalid`));
  }

  console.log(`\nValidation: ${parts.join(', ')}`);
}
