/**
 * Project-level configuration loaded from ncoctl.config.yaml
 */
export interface ProjectConfig {
  /** Merchant identifier for API calls */
  merchant: string;

  /** API configuration */
  api: {
    /** Configuration API base URL */
    baseUrl: string;
    /** Optional bearer token (env var NCOCTL_API_TOKEN takes precedence) */
    token?: string;
  };

  /** Schema caching settings */
  schema?: {
    /** Cache directory (default: .ncoctl/schemas) */
    cacheDir?: string;
    /** Cache TTL in seconds (default: 86400 = 24 hours) */
    cacheTtl?: number;
    /** Skip schema validation (default: false) */
    skip?: boolean;
  };

  /** Output settings */
  output?: {
    /** Default format: "text" or "json" (default: text) */
    format?: 'text' | 'json';
    /** Verbose output (default: false) */
    verbose?: boolean;
  };
}

/**
 * A discovered channel directory containing configuration files
 */
export interface Channel {
  /** Channel name (directory name) */
  name: string;

  /** Absolute path to channel directory */
  path: string;

  /** Configuration files in this channel */
  configs: ChannelConfig[];

  /** Validation status */
  validationStatus: 'valid' | 'invalid' | 'pending';

  /** Validation errors if invalid */
  validationErrors?: ValidationError[];
}

/**
 * A configuration file within a channel
 */
export interface ChannelConfig {
  /** Configuration name (filename without .yaml) */
  name: string;

  /** Absolute path to file */
  path: string;

  /** Raw parsed YAML content */
  raw: Record<string, unknown>;

  /** Merged content (after inheritance) */
  merged: Record<string, unknown>;

  /** Schema URL from $schema field */
  schemaUrl?: string;

  /** Configuration ID from id field */
  id?: string;

  /** Whether this config inherits from root */
  inheritsFromRoot: boolean;
}

/**
 * A fully-resolved configuration ready for API operations
 */
export interface Configuration {
  /** JSON Schema URL */
  $schema: string;

  /** Configuration identifier */
  id: string;

  /** All other configuration fields */
  [key: string]: unknown;
}

/**
 * Schema validation error
 */
export interface ValidationError {
  /** File path where error occurred */
  filePath: string;

  /** JSON path to invalid field */
  fieldPath: string;

  /** Human-readable error message */
  message: string;

  /** Expected value/type */
  expected?: string;

  /** Actual value/type */
  actual?: string;
}

/**
 * Result of validation for a single channel
 */
export interface ChannelValidationResult {
  /** Channel name */
  name: string;

  /** Whether all configs are valid */
  valid: boolean;

  /** Number of configs validated */
  configCount: number;

  /** Validation errors (empty if valid) */
  errors: ValidationError[];
}

/**
 * Result of validating all channels
 */
export interface ValidationResult {
  /** Overall validity */
  valid: boolean;

  /** Results per channel */
  channels: ChannelValidationResult[];
}

/**
 * Result of applying changes
 */
export interface ApplyResult {
  /** Overall success */
  success: boolean;

  /** Per-configuration results */
  results: ConfigApplyResult[];

  /** Summary */
  summary: ApplySummary;
}

/**
 * Result of applying a single configuration
 */
export interface ConfigApplyResult {
  /** Channel name */
  channel: string;

  /** Configuration name */
  config: string;

  /** Whether apply succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Summary of apply operation
 */
export interface ApplySummary {
  /** Successful applies */
  succeeded: number;

  /** Failed applies */
  failed: number;

  /** Skipped (no changes) */
  skipped: number;
}
