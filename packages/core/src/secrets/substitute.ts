/**
 * Pattern for matching ${VAR} placeholders
 */
const PLACEHOLDER_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Error thrown when required environment variables are missing
 */
export class MissingEnvVarError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[]
  ) {
    super(message);
    this.name = 'MissingEnvVarError';
  }
}

/**
 * Find all ${VAR} placeholders in a value
 */
export function findPlaceholders(value: unknown): string[] {
  const placeholders: string[] = [];

  function traverse(val: unknown): void {
    if (typeof val === 'string') {
      const matches = val.matchAll(PLACEHOLDER_PATTERN);
      for (const match of matches) {
        const varName = match[1];
        if (varName && !placeholders.includes(varName)) {
          placeholders.push(varName);
        }
      }
    } else if (Array.isArray(val)) {
      for (const item of val) {
        traverse(item);
      }
    } else if (typeof val === 'object' && val !== null) {
      for (const key of Object.keys(val)) {
        traverse((val as Record<string, unknown>)[key]);
      }
    }
  }

  traverse(value);
  return placeholders;
}

/**
 * Substitute ${VAR} placeholders with values from environment
 *
 * @param config - Configuration object with placeholders
 * @param env - Environment variables
 * @returns Configuration with placeholders substituted
 * @throws MissingEnvVarError if required variables are missing
 */
export function substituteSecrets(
  config: Record<string, unknown>,
  env: Record<string, string>
): Record<string, unknown> {
  // Find all placeholders
  const placeholders = findPlaceholders(config);

  // Check for missing variables
  const missingVars = placeholders.filter((name) => !(name in env));
  if (missingVars.length > 0) {
    throw new MissingEnvVarError(
      `Missing environment variables: ${missingVars.join(', ')}`,
      missingVars
    );
  }

  // Substitute
  return substituteValue(config, env) as Record<string, unknown>;
}

/**
 * Substitute placeholders in a single value
 */
function substituteValue(value: unknown, env: Record<string, string>): unknown {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER_PATTERN, (_, varName: string) => {
      return env[varName] ?? '';
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => substituteValue(item, env));
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = substituteValue(val, env);
    }
    return result;
  }

  return value;
}

/**
 * Check for missing environment variables without throwing
 *
 * @param config - Configuration object with placeholders
 * @param env - Environment variables
 * @returns Array of missing variable names
 */
export function checkMissingEnvVars(
  config: Record<string, unknown>,
  env: Record<string, string>
): string[] {
  const placeholders = findPlaceholders(config);
  return placeholders.filter((name) => !(name in env));
}
