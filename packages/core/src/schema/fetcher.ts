/**
 * Error thrown when schema fetching fails
 */
export class SchemaFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'SchemaFetchError';
  }
}

/**
 * Fetch a JSON schema from a URL
 *
 * @param url - URL to fetch schema from
 * @returns Parsed JSON schema object
 * @throws SchemaFetchError if fetch fails
 */
export async function fetchSchema(url: string): Promise<Record<string, unknown>> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json, application/schema+json',
      },
    });
  } catch (error) {
    throw new SchemaFetchError(
      `Failed to fetch schema: ${(error as Error).message}. Check network connectivity and schema URL.`,
      url
    );
  }

  if (!response.ok) {
    throw new SchemaFetchError(
      `Failed to fetch schema: HTTP ${response.status} ${response.statusText}`,
      url,
      response.status
    );
  }

  let schema: unknown;
  try {
    schema = await response.json();
  } catch {
    throw new SchemaFetchError(
      'Failed to parse schema: Invalid JSON response',
      url
    );
  }

  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    throw new SchemaFetchError(
      'Invalid schema: Expected JSON object',
      url
    );
  }

  return schema as Record<string, unknown>;
}
