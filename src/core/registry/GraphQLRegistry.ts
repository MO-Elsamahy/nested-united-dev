// ─────────────────────────────────────────────────────────────────
// GraphQLRegistry: Persistent + cached registry for all known operations
// src/core/registry/GraphQLRegistry.ts
// ─────────────────────────────────────────────────────────────────

import type { Pool } from 'mysql2/promise';
import type {
  IGraphQLRegistry, GraphQLOperation, OperationCategory,
} from '../interfaces/index';
import { OperationCache } from './OperationCache';

export class GraphQLRegistry implements IGraphQLRegistry {
  private cache = new OperationCache();

  constructor(private db: Pool) {}

  // ── Upsert (insert or update on hash change) ─────────────────────
  async upsertOperation(op: Omit<GraphQLOperation, 'id' | 'firstSeenAt' | 'lastSeenAt'>): Promise<GraphQLOperation> {
    const headersJson = op.sampleHeaders ? JSON.stringify(op.sampleHeaders) : null;
    const varsJson    = op.sampleVariables ? JSON.stringify(op.sampleVariables) : null;
    const schemaJson  = op.variablesSchema  ? JSON.stringify(op.variablesSchema)  : null;

    await this.db.execute(`
      INSERT INTO graphql_operations
        (platform, operation_name, sha256_hash, endpoint_url, sample_headers, sample_variables, variables_schema, api_key, category, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        endpoint_url     = VALUES(endpoint_url),
        sample_headers   = COALESCE(VALUES(sample_headers), sample_headers),
        sample_variables = COALESCE(VALUES(sample_variables), sample_variables),
        variables_schema = COALESCE(VALUES(variables_schema), variables_schema),
        api_key          = COALESCE(VALUES(api_key), api_key),
        category         = VALUES(category),
        last_seen_at     = NOW(),
        is_active        = 1
    `, [
      op.platform, op.operationName, op.sha256Hash, op.endpointUrl,
      headersJson, varsJson, schemaJson, op.apiKey ?? null, op.category,
    ]);

    // Deactivate older hashes for the same operation (different hash = old version)
    await this.db.execute(`
      UPDATE graphql_operations
      SET is_active = 0
      WHERE platform = ? AND operation_name = ? AND sha256_hash != ? AND is_active = 1
    `, [op.platform, op.operationName, op.sha256Hash]);

    this.cache.invalidate(op.platform);

    const result = await this.getLatestByName(op.platform, op.operationName);
    return result!;
  }

  // ── Lookup by operation name (e.g. "ViaductInboxData") ───────────
  async getLatestByName(platform: string, operationName: string): Promise<GraphQLOperation | null> {
    const cached = this.cache.getByName(platform, operationName);
    if (cached) return cached;

    const [rows]: any = await this.db.execute(`
      SELECT * FROM graphql_operations
      WHERE platform = ? AND operation_name = ? AND is_active = 1
      ORDER BY last_seen_at DESC
      LIMIT 1
    `, [platform, operationName]);

    if (!rows || rows.length === 0) return null;
    const op = this.rowToOp(rows[0]);
    this.cache.setByName(platform, operationName, op);
    return op;
  }

  // ── Lookup by category (e.g. "inbox") ────────────────────────────
  async getLatestByCategory(platform: string, category: OperationCategory): Promise<GraphQLOperation | null> {
    const cached = this.cache.getByCategory(platform, category);
    if (cached) return cached;

    const [rows]: any = await this.db.execute(`
      SELECT * FROM graphql_operations
      WHERE platform = ? AND category = ? AND is_active = 1
      ORDER BY last_seen_at DESC
      LIMIT 1
    `, [platform, category]);

    if (!rows || rows.length === 0) return null;
    const op = this.rowToOp(rows[0]);
    this.cache.setByCategory(platform, category, op);
    return op;
  }

  // ── Get all active operations for a platform ──────────────────────
  async getAll(platform: string): Promise<GraphQLOperation[]> {
    const [rows]: any = await this.db.execute(`
      SELECT * FROM graphql_operations WHERE platform = ? AND is_active = 1
      ORDER BY last_seen_at DESC
    `, [platform]);
    return (rows ?? []).map((r: any) => this.rowToOp(r));
  }

  // ── Mark a specific hash as inactive ─────────────────────────────
  async markInactive(platform: string, sha256Hash: string): Promise<void> {
    await this.db.execute(`
      UPDATE graphql_operations SET is_active = 0
      WHERE platform = ? AND sha256_hash = ?
    `, [platform, sha256Hash]);
    this.cache.invalidate(platform);
  }

  invalidateCache(platform?: string): void {
    this.cache.invalidate(platform);
  }

  // ── Log a discovery event ─────────────────────────────────────────
  async logEvent(platform: string, eventType: string, message: string, metadata?: unknown, accountId?: number): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO discovery_log (platform, account_id, event_type, message, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [platform, accountId ?? null, eventType, message, metadata ? JSON.stringify(metadata) : null]);
    } catch (_e) {
      // Non-critical — never crash on logging
    }
  }

  // ── Map DB row → TypeScript object ───────────────────────────────
  private rowToOp(row: any): GraphQLOperation {
    return {
      id:               row.id,
      platform:         row.platform,
      operationName:    row.operation_name,
      sha256Hash:       row.sha256_hash,
      endpointUrl:      row.endpoint_url,
      variablesSchema:  row.variables_schema ? JSON.parse(row.variables_schema) : undefined,
      sampleVariables:  row.sample_variables  ? JSON.parse(row.sample_variables)  : undefined,
      sampleHeaders:    row.sample_headers     ? JSON.parse(row.sample_headers)     : undefined,
      apiKey:           row.api_key,
      category:         row.category,
      firstSeenAt:      row.first_seen_at ? new Date(row.first_seen_at) : undefined,
      lastSeenAt:       row.last_seen_at  ? new Date(row.last_seen_at)  : undefined,
      isActive:         Boolean(row.is_active),
    };
  }
}
