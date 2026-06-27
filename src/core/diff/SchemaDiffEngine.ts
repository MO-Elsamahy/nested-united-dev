// ─────────────────────────────────────────────────────────────────
// SchemaDiffEngine: Detects field-level changes between payloads
// src/core/diff/SchemaDiffEngine.ts
// ─────────────────────────────────────────────────────────────────

import type { ISchemaDiffEngine, SchemaDiff } from '../interfaces/index';

export class SchemaDiffEngine implements ISchemaDiffEngine {

  diff(oldPayload: unknown, newPayload: unknown): SchemaDiff {
    const oldKeys = this.collectKeys(oldPayload);
    const newKeys = this.collectKeys(newPayload);

    const addedFields: string[] = [];
    const removedFields: string[] = [];

    for (const key of newKeys) {
      if (!oldKeys.has(key)) addedFields.push(key);
    }
    for (const key of oldKeys) {
      if (!newKeys.has(key)) removedFields.push(key);
    }

    // Heuristic rename detection: if a field disappeared and a similar one appeared
    const renamedFields: Array<{ from: string; to: string }> = [];
    for (const removed of removedFields) {
      for (const added of addedFields) {
        if (this.similarity(removed, added) > 0.7) {
          renamedFields.push({ from: removed, to: added });
        }
      }
    }

    const rawDiff: Record<string, unknown> = {};
    if (addedFields.length > 0) rawDiff.added = addedFields;
    if (removedFields.length > 0) rawDiff.removed = removedFields;
    if (renamedFields.length > 0) rawDiff.renamed = renamedFields;

    return {
      addedFields,
      removedFields,
      renamedFields,
      hasBreakingChanges: removedFields.length > 0,
      rawDiff,
    };
  }

  isBreaking(diff: SchemaDiff): boolean {
    return diff.removedFields.length > 0;
  }

  // ── Recursively collect all dot-notation keys from a JSON payload ─
  private collectKeys(obj: unknown, prefix = '', depth = 0): Set<string> {
    const keys = new Set<string>();
    if (depth > 8 || !obj || typeof obj !== 'object') return keys;

    if (Array.isArray(obj)) {
      // For arrays, inspect only the first element's schema
      if (obj.length > 0) {
        const nested = this.collectKeys(obj[0], prefix ? `${prefix}[]` : '[]', depth + 1);
        nested.forEach(k => keys.add(k));
      }
      return keys;
    }

    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      if (val && typeof val === 'object') {
        const nested = this.collectKeys(val, fullKey, depth + 1);
        nested.forEach(k => keys.add(k));
      }
    }
    return keys;
  }

  // ── Dice coefficient for string similarity ────────────────────────
  private similarity(a: string, b: string): number {
    const bigrams = (s: string) => {
      const bg = new Map<string, number>();
      for (let i = 0; i < s.length - 1; i++) {
        const bg2 = s.substring(i, i + 2);
        bg.set(bg2, (bg.get(bg2) ?? 0) + 1);
      }
      return bg;
    };
    const bgA = bigrams(a.toLowerCase());
    const bgB = bigrams(b.toLowerCase());
    let intersection = 0;
    for (const [k, v] of bgA) {
      if (bgB.has(k)) intersection += Math.min(v, bgB.get(k)!);
    }
    const union = a.length + b.length - 2;
    return union === 0 ? 1 : (2 * intersection) / union;
  }
}
