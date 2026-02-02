import type { FieldDiff } from '../plan/types.js';

/**
 * Result of comparing two channels
 */
export interface CompareResult {
  /** First channel name */
  channelA: string;

  /** Second channel name */
  channelB: string;

  /** Timestamp of comparison */
  timestamp: string;

  /** Per-configuration comparisons */
  configs: ConfigComparison[];

  /** Summary */
  summary: CompareSummary;
}

/**
 * Comparison of a single configuration between two channels
 */
export interface ConfigComparison {
  /** Configuration name */
  name: string;

  /** Comparison status */
  status: 'identical' | 'different' | 'only_in_a' | 'only_in_b';

  /** Field-level differences (empty if identical or only_in_one) */
  diffs: FieldDiff[];

  /** Configuration from channel A (null if only in B) */
  configA?: Record<string, unknown>;

  /** Configuration from channel B (null if only in A) */
  configB?: Record<string, unknown>;
}

/**
 * Summary of comparison
 */
export interface CompareSummary {
  /** Number of identical configurations */
  identical: number;

  /** Number of different configurations */
  different: number;

  /** Number of configs only in channel A */
  onlyInA: number;

  /** Number of configs only in channel B */
  onlyInB: number;
}
