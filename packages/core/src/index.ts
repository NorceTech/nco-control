// Types
export type {
  ProjectConfig,
  Channel,
  ChannelConfig,
  Configuration,
  ValidationError,
  ChannelValidationResult,
  ValidationResult,
  ApplyResult,
  ConfigApplyResult,
  ApplySummary,
} from './types/index.js';

export type {
  Plan,
  ChannelPlan,
  ConfigPlan,
  FieldDiff,
  PlanSummary,
} from './plan/types.js';

// Config loading
export {
  loadProjectConfig,
  findProjectRoot,
  ProjectConfigError,
} from './config/project.js';

export {
  discoverChannels,
  findRootConfigs,
} from './config/discovery.js';

export {
  loadYamlFile,
  loadChannelConfigs,
  loadAllChannelConfigs,
  YamlLoadError,
} from './config/loader.js';

// Merge
export { deepMerge } from './merge/deep-merge.js';
export { shouldInherit, schemasCompatible, mergeConfigs } from './merge/hierarchy.js';

// Secrets
export { loadEnvFile, parseEnvContent, getEnvironment } from './secrets/env.js';

// Schema
export { fetchSchema, SchemaFetchError } from './schema/fetcher.js';
export { SchemaCache } from './schema/cache.js';
export { SchemaValidator } from './schema/validator.js';

// Validation
export { validateProject, type ValidateOptions } from './validate/service.js';

// Diff
export { diffConfigs, configsEqual } from './diff/differ.js';
export {
  formatFieldDiff,
  formatFieldDiffs,
  formatConfigPlan,
  formatChannelPlan,
  formatPlan,
  formatPlanSummary,
  type FormatOptions,
} from './diff/formatter.js';

// Plan
export {
  generatePlan,
  planHasChanges,
  getConfigsToApply,
  PlanValidationError,
  type PlanOptions,
} from './plan/service.js';

// API Client
export { ConfigurationApiClient, ApiError } from './api/client.js';
export type { ApiClientOptions, RemoteChannel, RemoteConfig } from './api/types.js';

// Secrets
export { substituteSecrets, checkMissingEnvVars, MissingEnvVarError } from './secrets/substitute.js';

// Apply
export {
  applyConfigs,
  formatApplyResult,
  type ApplyOptions,
} from './apply/service.js';

// Init
export {
  initProject,
  isNcoControlProject,
  type InitOptions,
  type InitResult,
} from './init/service.js';
export {
  getConfigTemplate,
  ENV_EXAMPLE_TEMPLATE,
  GITIGNORE_ENTRIES,
  getExampleChannelConfig,
} from './init/templates.js';

// Compare
export {
  compareChannels,
  formatCompareResult,
  type CompareOptions,
} from './compare/service.js';
export type {
  CompareResult,
  ConfigComparison,
  CompareSummary,
} from './compare/types.js';
