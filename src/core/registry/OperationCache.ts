// ─────────────────────────────────────────────────────────────────
// OperationCache: TTL-based in-memory cache for GraphQL operations
// src/core/registry/OperationCache.ts
// ─────────────────────────────────────────────────────────────────

import type { GraphQLOperation, OperationCategory } from '../interfaces/index';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  op: GraphQLOperation;
  expiresAt: number;
}

export class OperationCache {
  private byName = new Map<string, CacheEntry>();    // `platform:operationName` → op
  private byCategory = new Map<string, CacheEntry>(); // `platform:category` → op

  private nameKey(platform: string, name: string): string {
    return `${platform}:${name}`;
  }
  private catKey(platform: string, cat: OperationCategory): string {
    return `${platform}:cat:${cat}`;
  }

  getByName(platform: string, name: string): GraphQLOperation | null {
    const entry = this.byName.get(this.nameKey(platform, name));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.byName.delete(this.nameKey(platform, name));
      return null;
    }
    return entry.op;
  }

  getByCategory(platform: string, cat: OperationCategory): GraphQLOperation | null {
    const entry = this.byCategory.get(this.catKey(platform, cat));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.byCategory.delete(this.catKey(platform, cat));
      return null;
    }
    return entry.op;
  }

  setByName(platform: string, name: string, op: GraphQLOperation): void {
    this.byName.set(this.nameKey(platform, name), { op, expiresAt: Date.now() + TTL_MS });
  }

  setByCategory(platform: string, cat: OperationCategory, op: GraphQLOperation): void {
    this.byCategory.set(this.catKey(platform, cat), { op, expiresAt: Date.now() + TTL_MS });
  }

  invalidate(platform?: string): void {
    if (!platform) {
      this.byName.clear();
      this.byCategory.clear();
      return;
    }
    const prefix = `${platform}:`;
    for (const key of this.byName.keys()) {
      if (key.startsWith(prefix)) this.byName.delete(key);
    }
    for (const key of this.byCategory.keys()) {
      if (key.startsWith(prefix)) this.byCategory.delete(key);
    }
  }
}
