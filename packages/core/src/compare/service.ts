import type { ProjectConfig } from '../types/index.js';
import type { CompareResult, ConfigComparison, CompareSummary } from './types.js';
import { discoverChannels } from '../config/discovery.js';
import { loadAllChannelConfigs } from '../config/loader.js';
import { diffConfigs } from '../diff/differ.js';

/**
 * Options for comparison
 */
export interface CompareOptions {
  /** Show only differences (exclude identical configs) */
  differencesOnly?: boolean;
}

/**
 * Compare two channels side-by-side
 *
 * @param projectDir - Project root directory
 * @param config - Project configuration
 * @param channelA - First channel name
 * @param channelB - Second channel name
 * @param options - Comparison options
 * @returns Comparison result
 */
export async function compareChannels(
  projectDir: string,
  _config: ProjectConfig,
  channelA: string,
  channelB: string,
  options: CompareOptions = {}
): Promise<CompareResult> {
  // Discover and load channels
  const channels = await discoverChannels(projectDir);
  const loadedChannels = await loadAllChannelConfigs(channels, projectDir);

  // Find the two channels
  const chA = loadedChannels.find((ch) => ch.name === channelA);
  const chB = loadedChannels.find((ch) => ch.name === channelB);

  if (!chA) {
    throw new Error(`Channel '${channelA}' not found`);
  }

  if (!chB) {
    throw new Error(`Channel '${channelB}' not found`);
  }

  // Build config maps
  const configsA = new Map(chA.configs.map((c) => [c.name, c.merged]));
  const configsB = new Map(chB.configs.map((c) => [c.name, c.merged]));

  // Get all config names
  const allConfigNames = new Set([...configsA.keys(), ...configsB.keys()]);

  // Compare each config
  const comparisons: ConfigComparison[] = [];

  for (const name of allConfigNames) {
    const configA = configsA.get(name);
    const configB = configsB.get(name);

    const comparison = compareConfig(name, configA, configB);

    // Skip identical if differencesOnly
    if (options.differencesOnly && comparison.status === 'identical') {
      continue;
    }

    comparisons.push(comparison);
  }

  // Calculate summary
  const summary = calculateSummary(comparisons, configsA.size, configsB.size, allConfigNames.size);

  return {
    channelA,
    channelB,
    timestamp: new Date().toISOString(),
    configs: comparisons,
    summary,
  };
}

/**
 * Compare a single configuration between two channels
 */
function compareConfig(
  name: string,
  configA?: Record<string, unknown>,
  configB?: Record<string, unknown>
): ConfigComparison {
  // Only in A
  if (configA && !configB) {
    return {
      name,
      status: 'only_in_a',
      diffs: [],
      configA,
    };
  }

  // Only in B
  if (!configA && configB) {
    return {
      name,
      status: 'only_in_b',
      diffs: [],
      configB,
    };
  }

  // Both exist - compare
  const diffs = diffConfigs(configA!, configB!);

  if (diffs.length === 0) {
    return {
      name,
      status: 'identical',
      diffs: [],
      configA,
      configB,
    };
  }

  return {
    name,
    status: 'different',
    diffs,
    configA,
    configB,
  };
}

/**
 * Calculate comparison summary
 */
function calculateSummary(
  comparisons: ConfigComparison[],
  _totalA: number,
  _totalB: number,
  totalUnique: number
): CompareSummary {
  let identical = 0;
  let different = 0;
  let onlyInA = 0;
  let onlyInB = 0;

  for (const comparison of comparisons) {
    switch (comparison.status) {
      case 'identical':
        identical++;
        break;
      case 'different':
        different++;
        break;
      case 'only_in_a':
        onlyInA++;
        break;
      case 'only_in_b':
        onlyInB++;
        break;
    }
  }

  // If differencesOnly was used, we need to recalculate identical count
  // from the totals since identical configs weren't included
  if (comparisons.length < totalUnique) {
    identical = totalUnique - comparisons.length;
  }

  return {
    identical,
    different,
    onlyInA,
    onlyInB,
  };
}

/**
 * Format comparison result as text
 */
export function formatCompareResult(result: CompareResult, colors: boolean = true): string {
  const c = colors
    ? {
        reset: '\x1b[0m',
        bold: '\x1b[1m',
        dim: '\x1b[2m',
        green: '\x1b[32m',
        red: '\x1b[31m',
        yellow: '\x1b[33m',
        cyan: '\x1b[36m',
      }
    : { reset: '', bold: '', dim: '', green: '', red: '', yellow: '', cyan: '' };

  const lines: string[] = [];

  // Header
  lines.push(
    `${c.bold}Comparing: ${c.cyan}${result.channelA}${c.reset}${c.bold} vs ${c.cyan}${result.channelB}${c.reset}`
  );
  lines.push(`Generated at: ${result.timestamp}`);
  lines.push('');

  // Configs
  for (const comparison of result.configs) {
    switch (comparison.status) {
      case 'identical':
        lines.push(`${c.dim}  ${comparison.name} (identical)${c.reset}`);
        break;
      case 'different':
        lines.push(`${c.yellow}~ ${comparison.name} (${comparison.diffs.length} differences)${c.reset}`);
        for (const diff of comparison.diffs) {
          const diffLine = formatDiffLine(diff, c);
          lines.push(`    ${diffLine}`);
        }
        break;
      case 'only_in_a':
        lines.push(`${c.red}- ${comparison.name} (only in ${result.channelA})${c.reset}`);
        break;
      case 'only_in_b':
        lines.push(`${c.green}+ ${comparison.name} (only in ${result.channelB})${c.reset}`);
        break;
    }
  }

  // Summary
  lines.push('');
  lines.push(`${c.bold}Summary:${c.reset}`);
  if (result.summary.identical > 0) {
    lines.push(`  ${c.dim}  ${result.summary.identical} identical${c.reset}`);
  }
  if (result.summary.different > 0) {
    lines.push(`  ${c.yellow}~ ${result.summary.different} different${c.reset}`);
  }
  if (result.summary.onlyInA > 0) {
    lines.push(`  ${c.red}- ${result.summary.onlyInA} only in ${result.channelA}${c.reset}`);
  }
  if (result.summary.onlyInB > 0) {
    lines.push(`  ${c.green}+ ${result.summary.onlyInB} only in ${result.channelB}${c.reset}`);
  }

  return lines.join('\n');
}

/**
 * Format a single diff line
 */
function formatDiffLine(
  diff: { path: string; type: string; oldValue?: unknown; newValue?: unknown },
  c: { green: string; red: string; yellow: string; reset: string }
): string {
  const formatValue = (v: unknown) => (typeof v === 'object' ? JSON.stringify(v) : String(v));

  switch (diff.type) {
    case 'add':
      return `${c.green}+${c.reset} ${diff.path}: ${formatValue(diff.newValue)}`;
    case 'remove':
      return `${c.red}-${c.reset} ${diff.path}: ${formatValue(diff.oldValue)}`;
    case 'change':
      return `${c.yellow}~${c.reset} ${diff.path}: ${formatValue(diff.oldValue)} → ${formatValue(diff.newValue)}`;
    default:
      return `  ${diff.path}`;
  }
}
