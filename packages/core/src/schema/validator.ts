import AjvModule, { type ValidateFunction, type ErrorObject } from 'ajv';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import type { ValidationError } from '../types/index.js';
import { SchemaCache } from './cache.js';

// Handle ESM default exports
const Ajv = AjvModule.default ?? AjvModule;
const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const addFormats = addFormatsModule.default ?? addFormatsModule;

/**
 * Add custom formats used by Norce Checkout schemas
 * These are pass-through validators (always valid) to suppress warnings
 */
function addCustomFormats(ajv: InstanceType<typeof Ajv>): void {
  // Custom formats used in adapter schemas
  ajv.addFormat('decimal', true);
  ajv.addFormat('json', true);
}

/**
 * Schema validator using Ajv
 * Supports both JSON Schema draft-07 and draft-2020-12
 */
export class SchemaValidator {
  private readonly ajv07: InstanceType<typeof Ajv>;
  private readonly ajv2020: InstanceType<typeof Ajv2020>;
  private readonly cache: SchemaCache;
  private readonly compiledSchemas: Map<string, ValidateFunction> = new Map();

  /**
   * Create a schema validator
   *
   * @param cache - Schema cache for fetching schemas
   */
  constructor(cache: SchemaCache) {
    this.cache = cache;

    // Ajv instance for draft-07 and earlier
    this.ajv07 = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Allow unknown keywords for compatibility
    });
    addFormats(this.ajv07);
    addCustomFormats(this.ajv07);

    // Ajv instance for draft-2020-12
    this.ajv2020 = new Ajv2020({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    addFormats(this.ajv2020);
    addCustomFormats(this.ajv2020);
  }

  /**
   * Validate a configuration against its schema
   *
   * @param config - Configuration object to validate
   * @param schemaUrl - URL of the JSON schema
   * @param filePath - Path to the config file (for error reporting)
   * @returns Array of validation errors (empty if valid)
   */
  async validate(
    config: Record<string, unknown>,
    schemaUrl: string,
    filePath: string
  ): Promise<ValidationError[]> {
    // Get or compile schema
    let validate = this.compiledSchemas.get(schemaUrl);

    if (!validate) {
      const schema = await this.cache.get(schemaUrl) as Record<string, unknown>;

      // Determine which Ajv instance to use based on $schema
      const schemaVersion = schema.$schema as string | undefined;
      const ajv = this.selectAjv(schemaVersion);

      // Get the schema's $id if it differs from the URL (to check for duplicates)
      const schemaId = schema.$id as string | undefined;
      const existingByUrl = ajv.getSchema(schemaUrl);
      const existingById = schemaId ? ajv.getSchema(schemaId) : undefined;

      if (existingByUrl) {
        validate = existingByUrl;
      } else if (existingById) {
        validate = existingById;
      } else {
        try {
          validate = ajv.compile(schema);
        } catch (error) {
          // If schema already exists error, try to get it
          const message = (error as Error).message;
          if (message.includes('already exists')) {
            const idMatch = message.match(/schema with key or id "([^"]+)"/);
            if (idMatch?.[1]) {
              validate = ajv.getSchema(idMatch[1]);
            }
          }
          if (!validate) {
            throw error;
          }
        }
      }

      this.compiledSchemas.set(schemaUrl, validate);
    }

    // Validate
    const valid = validate(config);

    if (valid) {
      return [];
    }

    // Convert Ajv errors to ValidationError format
    return (validate.errors ?? []).map((error: ErrorObject) => ({
      filePath,
      fieldPath: error.instancePath || '/',
      message: formatAjvError(error),
      expected: error.params ? JSON.stringify(error.params) : undefined,
      actual: error.data !== undefined ? String(error.data) : undefined,
    }));
  }

  /**
   * Select the appropriate Ajv instance based on schema version
   */
  private selectAjv(schemaVersion: string | undefined): InstanceType<typeof Ajv> {
    if (schemaVersion?.includes('2020-12') || schemaVersion?.includes('2019-09')) {
      return this.ajv2020;
    }
    return this.ajv07;
  }
}

/**
 * Format an Ajv error into a human-readable message
 */
function formatAjvError(error: ErrorObject): string {
  const path = error.instancePath || 'root';
  const params = error.params as Record<string, unknown>;

  switch (error.keyword) {
    case 'required':
      return `${path}: missing required property '${params?.missingProperty}'`;

    case 'type':
      return `${path}: must be ${params?.type}, got ${typeof error.data}`;

    case 'enum':
      return `${path}: must be one of: ${(params?.allowedValues as string[])?.join(', ')}`;

    case 'pattern':
      return `${path}: must match pattern ${params?.pattern}`;

    case 'minLength':
      return `${path}: must be at least ${params?.limit} characters`;

    case 'maxLength':
      return `${path}: must be at most ${params?.limit} characters`;

    case 'minimum':
      return `${path}: must be >= ${params?.limit}`;

    case 'maximum':
      return `${path}: must be <= ${params?.limit}`;

    case 'additionalProperties':
      return `${path}: has unknown property '${params?.additionalProperty}'`;

    case 'format':
      return `${path}: must be a valid ${params?.format}`;

    default:
      return `${path}: ${error.message ?? 'validation failed'}`;
  }
}
