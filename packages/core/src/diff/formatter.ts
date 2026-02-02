import type { FieldDiff } from '../plan/types.js';
import type { ConfigPlan, ChannelPlan, Plan } from '../plan/types.js';

/**
 * Format options for diff output
 */
export interface FormatOptions {
  /** Use ANSI colors (default: true unless NO_COLOR set) */
  colors?: boolean;
  /** Show verbose output with more detail */
  verbose?: boolean;
}

/**
 * ANSI color codes
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

/**
 * Get color code if colors are enabled
 */
function color(code: keyof typeof COLORS, enabled: boolean): string {
  return enabled ? COLORS[code] : '';
}

/**
 * Format a single field diff as text
 */
export function formatFieldDiff(diff: FieldDiff, options: FormatOptions = {}): string {
  const useColors = options.colors ?? !process.env['NO_COLOR'];
  const c = (code: keyof typeof COLORS) => color(code, useColors);

  const formatValue = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  switch (diff.type) {
    case 'add':
      return `${c('green')}+ ${diff.path}: ${formatValue(diff.newValue)}${c('reset')}`;

    case 'remove':
      return `${c('red')}- ${diff.path}: ${formatValue(diff.oldValue)}${c('reset')}`;

    case 'change':
      return [
        `${c('yellow')}~ ${diff.path}:${c('reset')}`,
        `  ${c('red')}- ${formatValue(diff.oldValue)}${c('reset')}`,
        `  ${c('green')}+ ${formatValue(diff.newValue)}${c('reset')}`,
      ].join('\n');

    default:
      return `  ${diff.path}: (unknown change)`;
  }
}

/**
 * Format field diffs as an array of lines
 */
export function formatFieldDiffs(diffs: FieldDiff[], options: FormatOptions = {}): string[] {
  return diffs.map((diff) => formatFieldDiff(diff, options));
}

/**
 * Format a config plan as text
 */
export function formatConfigPlan(config: ConfigPlan, options: FormatOptions = {}): string {
  const useColors = options.colors ?? !process.env['NO_COLOR'];
  const c = (code: keyof typeof COLORS) => color(code, useColors);

  const lines: string[] = [];

  // Status indicator and config name
  switch (config.status) {
    case 'create':
      lines.push(`${c('green')}+ ${config.name}${c('reset')} (create)`);
      break;
    case 'update':
      lines.push(`${c('yellow')}~ ${config.name}${c('reset')} (update)`);
      break;
    case 'unchanged':
      lines.push(`${c('dim')}  ${config.name}${c('reset')} (unchanged)`);
      break;
  }

  // Show diffs for create and update
  if (config.status !== 'unchanged' && config.diffs.length > 0) {
    for (const diff of config.diffs) {
      const formatted = formatFieldDiff(diff, options);
      // Indent each line
      lines.push(
        ...formatted.split('\n').map((line) => `    ${line}`)
      );
    }
  }

  return lines.join('\n');
}

/**
 * Format a channel plan as text
 */
export function formatChannelPlan(channelPlan: ChannelPlan, options: FormatOptions = {}): string {
  const useColors = options.colors ?? !process.env['NO_COLOR'];
  const c = (code: keyof typeof COLORS) => color(code, useColors);

  const lines: string[] = [];

  // Channel header
  const existsText = channelPlan.existsRemotely ? '' : ' (new)';
  lines.push(`${c('bold')}${c('cyan')}${channelPlan.channel}${c('reset')}${existsText}`);
  lines.push('');

  // Configs
  for (const config of channelPlan.configs) {
    lines.push(formatConfigPlan(config, options));
  }

  return lines.join('\n');
}

/**
 * Format a complete plan as text
 */
export function formatPlan(plan: Plan, options: FormatOptions = {}): string {
  const useColors = options.colors ?? !process.env['NO_COLOR'];
  const c = (code: keyof typeof COLORS) => color(code, useColors);

  const lines: string[] = [];

  // Header
  lines.push(`${c('bold')}Plan for merchant: ${plan.merchant}${c('reset')}`);
  lines.push(`Generated at: ${plan.timestamp}`);
  lines.push('');

  // Channels
  for (const channelPlan of plan.channels) {
    lines.push(formatChannelPlan(channelPlan, options));
    lines.push('');
  }

  // Summary
  lines.push(`${c('bold')}Summary:${c('reset')}`);
  if (plan.summary.creates > 0) {
    lines.push(`  ${c('green')}+ ${plan.summary.creates} to create${c('reset')}`);
  }
  if (plan.summary.updates > 0) {
    lines.push(`  ${c('yellow')}~ ${plan.summary.updates} to update${c('reset')}`);
  }
  if (plan.summary.unchanged > 0) {
    lines.push(`  ${c('dim')}  ${plan.summary.unchanged} unchanged${c('reset')}`);
  }
  if (plan.summary.unmanaged > 0) {
    lines.push(`  ${c('red')}! ${plan.summary.unmanaged} unmanaged (remote only)${c('reset')}`);
  }

  const totalChanges = plan.summary.creates + plan.summary.updates;
  if (totalChanges === 0) {
    lines.push('');
    lines.push('No changes to apply.');
  } else {
    lines.push('');
    lines.push(`${totalChanges} configuration(s) will be updated.`);
  }

  return lines.join('\n');
}

/**
 * Format plan summary as a short one-liner
 */
export function formatPlanSummary(plan: Plan, options: FormatOptions = {}): string {
  const useColors = options.colors ?? !process.env['NO_COLOR'];
  const c = (code: keyof typeof COLORS) => color(code, useColors);

  const parts: string[] = [];

  if (plan.summary.creates > 0) {
    parts.push(`${c('green')}+${plan.summary.creates}${c('reset')}`);
  }
  if (plan.summary.updates > 0) {
    parts.push(`${c('yellow')}~${plan.summary.updates}${c('reset')}`);
  }
  if (plan.summary.unchanged > 0) {
    parts.push(`${c('dim')}=${plan.summary.unchanged}${c('reset')}`);
  }

  if (parts.length === 0) {
    return 'No configurations found';
  }

  return parts.join(' ');
}
