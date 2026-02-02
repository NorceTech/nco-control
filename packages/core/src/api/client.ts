import type {
  ApiClientOptions,
  RemoteChannel,
  RemoteConfig,
  ApiErrorResponse,
} from './types.js';

/**
 * Error thrown when API call fails
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Configuration API client
 */
export class ConfigurationApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly merchant: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = options.token;
    this.merchant = options.merchant;
  }

  /**
   * List all channels for the merchant
   */
  async listChannels(): Promise<RemoteChannel[]> {
    const url = `${this.baseUrl}/api/v1/configuration/merchants/${this.merchant}/channels`;
    const response = await this.request<string[] | { channels: RemoteChannel[] }>(url);

    // API returns a simple array of channel names
    if (Array.isArray(response)) {
      return response.map((name) => ({ name }));
    }

    // Fallback for wrapped response format
    return response.channels ?? [];
  }

  /**
   * List all configurations for a channel
   */
  async listConfigs(channel: string): Promise<RemoteConfig[]> {
    const url = `${this.baseUrl}/api/v1/configuration/merchants/${this.merchant}/channels/${channel}/configurations`;
    const response = await this.request<RemoteConfig[] | { configurations: RemoteConfig[] }>(url);

    // API returns a simple array of config objects
    if (Array.isArray(response)) {
      return response;
    }

    // Fallback for wrapped response format
    return response.configurations ?? [];
  }

  /**
   * Get a specific configuration
   */
  async getConfig(channel: string, configName: string): Promise<RemoteConfig | null> {
    const url = `${this.baseUrl}/api/v1/configuration/merchants/${this.merchant}/channels/${channel}/configurations/${configName}`;
    try {
      return await this.request<RemoteConfig>(url);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a configuration
   */
  async putConfig(
    channel: string,
    configName: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const url = `${this.baseUrl}/api/v1/configuration/merchants/${this.merchant}/channels/${channel}/configurations/${configName}`;
    await this.request(url, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      let details: Record<string, unknown> | undefined;

      try {
        const errorBody = (await response.json()) as ApiErrorResponse;

        // Build error message from available fields
        if (errorBody.title) {
          errorMessage = errorBody.title;
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        }

        // Include validation errors in the message
        if (errorBody.errors) {
          const errorDetails = Object.entries(errorBody.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage = `${errorMessage} - ${errorDetails}`;
          details = { errors: errorBody.errors };
        } else if (errorBody.details) {
          details = errorBody.details;
        }
      } catch {
        // Ignore JSON parse errors
      }

      throw new ApiError(errorMessage, response.status, details);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }
}
