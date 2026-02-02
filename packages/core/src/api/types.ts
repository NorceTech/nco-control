/**
 * Remote channel from Configuration API
 */
export interface RemoteChannel {
  /** Channel name */
  name: string;

  /** Channel display name (if different) */
  displayName?: string;
}

/**
 * Remote configuration from Configuration API
 */
export interface RemoteConfig {
  /** Configuration identifier */
  id: string;

  /** All configuration fields */
  [key: string]: unknown;
}

/**
 * List channels response
 */
export interface ListChannelsResponse {
  channels: RemoteChannel[];
}

/**
 * List configurations response
 */
export interface ListConfigsResponse {
  configurations: RemoteConfig[];
}

/**
 * API error response (RFC 7807 Problem Details format)
 */
export interface ApiErrorResponse {
  /** Error type URI */
  type?: string;
  /** Human-readable error title */
  title?: string;
  /** HTTP status code */
  status?: number;
  /** Validation errors by field */
  errors?: Record<string, string[]>;
  /** Trace ID for debugging */
  traceId?: string;
  /** Legacy format: error message */
  message?: string;
  /** Legacy format: error details */
  details?: Record<string, unknown>;
}

/**
 * Options for API client
 */
export interface ApiClientOptions {
  /** Base URL for Configuration API */
  baseUrl: string;

  /** Bearer token for authentication */
  token: string;

  /** Merchant identifier */
  merchant: string;
}
