/**
 * Result of comparing local state to remote state
 */
export interface Plan {
  /** Merchant being planned */
  merchant: string;

  /** Timestamp of plan generation (ISO 8601) */
  timestamp: string;

  /** Per-channel plans */
  channels: ChannelPlan[];

  /** Summary counts */
  summary: PlanSummary;
}

/**
 * Plan for a single channel
 */
export interface ChannelPlan {
  /** Channel name */
  channel: string;

  /** Whether channel exists remotely */
  existsRemotely: boolean;

  /** Per-configuration plans */
  configs: ConfigPlan[];
}

/**
 * Plan for a single configuration
 */
export interface ConfigPlan {
  /** Configuration name */
  name: string;

  /** Change status */
  status: 'create' | 'update' | 'unchanged';

  /** Field-level differences */
  diffs: FieldDiff[];
}

/**
 * A single field-level difference
 */
export interface FieldDiff {
  /** JSON path to field (e.g., "/api/timeout") */
  path: string;

  /** Type of change */
  type: 'add' | 'remove' | 'change';

  /** Previous value (undefined for add) */
  oldValue?: unknown;

  /** New value (undefined for remove) */
  newValue?: unknown;
}

/**
 * Summary counts for a plan
 */
export interface PlanSummary {
  /** New configurations to create */
  creates: number;

  /** Existing configurations to update */
  updates: number;

  /** Configurations with no changes */
  unchanged: number;

  /** Configurations on remote not in local */
  unmanaged: number;
}
