// ─────────────────────────────────────────────────────────────────
// TrafficAnalyzer: Wires CDP capture → extractor → registry → diff
// This is the brain that runs whenever the Electron browser sees traffic.
// src/core/analyzer/TrafficAnalyzer.ts
// ─────────────────────────────────────────────────────────────────

import type { CapturedRequest } from '../interfaces/index';
import type { GraphQLRegistry } from '../registry/GraphQLRegistry';
import type { PersistedQueryExtractor } from '../extractor/PersistedQueryExtractor';
import type { SchemaDiffEngine } from '../diff/SchemaDiffEngine';

export class TrafficAnalyzer {

  constructor(
    private registry: GraphQLRegistry,
    private extractor: PersistedQueryExtractor,
    private diff: SchemaDiffEngine,
  ) {}

  async analyze(req: CapturedRequest): Promise<void> {
    try {
      const extracted = this.extractor.extract(req);
      if (!extracted) return;

      // ── Look up the current known hash ────────────────────────────
      const existing = await this.registry.getLatestByName(extracted.platform, extracted.operationName);

      const isNew = !existing;
      const hashChanged = existing && existing.sha256Hash !== extracted.sha256Hash;

      // ── Upsert to registry ────────────────────────────────────────
      await this.registry.upsertOperation({
        platform:       extracted.platform,
        operationName:  extracted.operationName,
        sha256Hash:     extracted.sha256Hash,
        endpointUrl:    extracted.endpointUrl,
        sampleHeaders:  extracted.sampleHeaders,
        sampleVariables: extracted.sampleVariables,
        apiKey:         extracted.apiKey,
        category:       extracted.category,
        isActive:       true,
      });

      // ── Log important events ──────────────────────────────────────
      if (isNew) {
        console.log(`\x1b[32m[Registry] 🆕 New operation discovered: ${extracted.platform}/${extracted.operationName} (${extracted.sha256Hash.substring(0, 12)}...)\x1b[0m`);
        await this.registry.logEvent(
          extracted.platform,
          'new_operation',
          `New GraphQL operation discovered: ${extracted.operationName}`,
          { hash: extracted.sha256Hash, category: extracted.category },
          req.accountId ? parseInt(req.accountId) : undefined
        );
      }

      // ── Schema diff on hash change ────────────────────────────────
      if (hashChanged && existing && req.responseBody) {
        const schemaDiff = this.diff.diff(
          existing.sampleVariables ?? {},
          extracted.sampleVariables ?? {},
        );

        const isBreaking = this.diff.isBreaking(schemaDiff);
        const color = isBreaking ? '\x1b[31m' : '\x1b[33m';

        console.log(`${color}[Registry] 🔄 Hash changed for ${extracted.operationName}:`);
        console.log(`  Old: ${existing.sha256Hash.substring(0, 16)}...`);
        console.log(`  New: ${extracted.sha256Hash.substring(0, 16)}...`);
        if (schemaDiff.addedFields.length > 0)   console.log(`  ➕ Added:   ${schemaDiff.addedFields.join(', ')}`);
        if (schemaDiff.removedFields.length > 0)  console.log(`  ➖ Removed: ${schemaDiff.removedFields.join(', ')}`);
        if (schemaDiff.renamedFields.length > 0)  console.log(`  ↔️  Renamed: ${schemaDiff.renamedFields.map(r=>`${r.from}→${r.to}`).join(', ')}`);
        console.log(`\x1b[0m`);

        // Persist the diff
        try {
          const dbPool = (this.registry as any).db;
          await dbPool.execute(`
            INSERT INTO schema_diff_log (platform, operation_name, old_hash, new_hash, added_fields, removed_fields, renamed_fields, raw_diff)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            extracted.platform,
            extracted.operationName,
            existing.sha256Hash,
            extracted.sha256Hash,
            JSON.stringify(schemaDiff.addedFields),
            JSON.stringify(schemaDiff.removedFields),
            JSON.stringify(schemaDiff.renamedFields),
            JSON.stringify(schemaDiff.rawDiff),
          ]);
        } catch (_e) { /* non-critical */ }

        await this.registry.logEvent(
          extracted.platform,
          'hash_updated',
          `Hash changed for ${extracted.operationName}: ${existing.sha256Hash.substring(0, 12)} → ${extracted.sha256Hash.substring(0, 12)}`,
          { diff: schemaDiff, isBreaking },
          req.accountId ? parseInt(req.accountId) : undefined
        );
      }
    } catch (e: unknown) {
      // Never crash the Electron main process due to analysis errors
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[TrafficAnalyzer] ⚠️ Analysis error: ${msg}`);
    }
  }
}
