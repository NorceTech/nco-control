import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { fetchSchema } from './fetcher.js';

/**
 * Schema cache entry metadata
 */
interface CacheMetadata {
  url: string;
  fetchedAt: number; // Unix timestamp in milliseconds
  ttl: number; // TTL in seconds
}

/**
 * Schema cache for storing fetched schemas locally
 */
export class SchemaCache {
  private readonly cacheDir: string;
  private readonly ttl: number;

  /**
   * Create a schema cache
   *
   * @param cacheDir - Directory to store cached schemas
   * @param ttl - Time-to-live in seconds (default: 86400 = 24 hours)
   */
  constructor(cacheDir: string, ttl: number = 86400) {
    this.cacheDir = cacheDir;
    this.ttl = ttl;
  }

  /**
   * Get a schema, fetching from URL if not cached or expired
   *
   * @param url - Schema URL
   * @returns Parsed JSON schema
   */
  async get(url: string): Promise<Record<string, unknown>> {
    const cacheKey = this.getCacheKey(url);
    const schemaPath = path.join(this.cacheDir, `${cacheKey}.json`);
    const metaPath = path.join(this.cacheDir, `${cacheKey}.meta.json`);

    // Check if cached and not expired
    if (await this.isValidCache(metaPath)) {
      try {
        const content = await fs.promises.readFile(schemaPath, 'utf-8');
        return JSON.parse(content) as Record<string, unknown>;
      } catch {
        // Cache read failed, fetch fresh
      }
    }

    // Fetch and cache
    const schema = await fetchSchema(url);
    await this.store(url, schema);

    return schema;
  }

  /**
   * Store a schema in the cache
   */
  private async store(url: string, schema: Record<string, unknown>): Promise<void> {
    // Ensure cache directory exists
    await fs.promises.mkdir(this.cacheDir, { recursive: true });

    const cacheKey = this.getCacheKey(url);
    const schemaPath = path.join(this.cacheDir, `${cacheKey}.json`);
    const metaPath = path.join(this.cacheDir, `${cacheKey}.meta.json`);

    const metadata: CacheMetadata = {
      url,
      fetchedAt: Date.now(),
      ttl: this.ttl,
    };

    await Promise.all([
      fs.promises.writeFile(schemaPath, JSON.stringify(schema, null, 2)),
      fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2)),
    ]);
  }

  /**
   * Check if a cache entry is valid (exists and not expired)
   */
  private async isValidCache(metaPath: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(metaPath, 'utf-8');
      const metadata = JSON.parse(content) as CacheMetadata;

      const age = (Date.now() - metadata.fetchedAt) / 1000; // in seconds
      return age < metadata.ttl;
    } catch {
      return false;
    }
  }

  /**
   * Generate a cache key from URL
   */
  private getCacheKey(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
  }

  /**
   * Clear all cached schemas
   */
  async clear(): Promise<void> {
    try {
      const entries = await fs.promises.readdir(this.cacheDir);
      await Promise.all(
        entries.map((entry) =>
          fs.promises.unlink(path.join(this.cacheDir, entry))
        )
      );
    } catch {
      // Cache dir doesn't exist, nothing to clear
    }
  }
}
