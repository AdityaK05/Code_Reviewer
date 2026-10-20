import { app } from 'electron';
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface CacheEntry<T> {
  key: string;
  hash: string;
  model: string;
  data: T;
  timestamp: number;
}

export class AICache {
  private cacheDir: string;
  private cacheFile: string;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private loaded: boolean = false;
  private hits: number = 0;
  private misses: number = 0;

  constructor(customCacheDir?: string) {
    if (customCacheDir) {
      this.cacheDir = customCacheDir;
    } else {
      // Default cache dir
      try {
        if (app && typeof app.getPath === 'function') {
          this.cacheDir = join(app.getPath('userData'), 'cache');
        } else {
          this.cacheDir = join(process.cwd(), '.code_reviewer_cache');
        }
      } catch {
        this.cacheDir = join(process.cwd(), '.code_reviewer_cache');
      }
    }
    this.cacheFile = join(this.cacheDir, 'ai_findings_cache.json');
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private buildKey(content: string, model: string): { key: string; hash: string } {
    const hash = this.hashContent(content);
    return { key: `${model}:${hash}`, hash };
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      if (existsSync(this.cacheFile)) {
        const raw = await readFile(this.cacheFile, 'utf-8');
        const entries: Record<string, CacheEntry<any>> = JSON.parse(raw);
        for (const [k, v] of Object.entries(entries)) {
          this.memoryCache.set(k, v);
        }
      }
    } catch (err) {
      console.warn('[AICache] Failed to load cache from disk, starting empty:', err);
    } finally {
      this.loaded = true;
    }
  }

  async save(): Promise<void> {
    try {
      if (!existsSync(this.cacheDir)) {
        await mkdir(this.cacheDir, { recursive: true });
      }
      const serializable: Record<string, CacheEntry<any>> = {};
      for (const [k, v] of this.memoryCache.entries()) {
        serializable[k] = v;
      }
      await writeFile(this.cacheFile, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AICache] Failed to persist cache to disk:', err);
    }
  }

  async get<T>(content: string, model: string): Promise<T | null> {
    await this.load();
    const { key } = this.buildKey(content, model);
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.hits++;
      return entry.data as T;
    }
    this.misses++;
    return null;
  }

  async set<T>(content: string, model: string, data: T): Promise<void> {
    await this.load();
    const { key, hash } = this.buildKey(content, model);
    this.memoryCache.set(key, {
      key,
      hash,
      model,
      data,
      timestamp: Date.now()
    });
    await this.save();
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.hits = 0;
    this.misses = 0;
    await this.save();
  }

  getStats(): { hits: number; misses: number; entriesCount: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      entriesCount: this.memoryCache.size
    };
  }
}
