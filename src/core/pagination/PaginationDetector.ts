// ─────────────────────────────────────────────────────────────────
// PaginationDetector: Detects any pagination strategy from a payload
// src/core/pagination/PaginationDetector.ts
// ─────────────────────────────────────────────────────────────────

import type { IPaginationDetector, PaginationInfo } from '../interfaces/index';

// Candidates ordered by priority
const CURSOR_NEXT   = ['nextCursor','beforeCursor','afterCursor','cursor','pageInfo.endCursor','metadata.nextCursor','next_cursor','endCursor'];
const HAS_NEXT_BOOL = ['hasNextPage','hasNext','has_next','pageInfo.hasNextPage'];
const PAGE_NUM      = ['page','current_page','currentPage'];
const TOTAL_PAGES   = ['last_page','lastPage','total_pages','totalPages'];
const TOTAL_COUNT   = ['total','totalCount','count'];

export class PaginationDetector implements IPaginationDetector {

  detect(payload: unknown): PaginationInfo {
    if (!payload || typeof payload !== 'object') {
      return { hasNextPage: false, strategy: 'unknown' };
    }

    // ── Try cursor strategy first ─────────────────────────────────
    const cursorResult = this.tryCursor(payload);
    if (cursorResult) return cursorResult;

    // ── Try page/offset strategy ──────────────────────────────────
    const pageResult = this.tryPage(payload);
    if (pageResult) return pageResult;

    // ── Try has_next boolean (no cursor value) ────────────────────
    const hasNextResult = this.tryHasNextBool(payload);
    if (hasNextResult) return hasNextResult;

    return { hasNextPage: false, strategy: 'unknown' };
  }

  // ── Cursor-based pagination ───────────────────────────────────────
  private tryCursor(payload: unknown): PaginationInfo | null {
    for (const candidate of CURSOR_NEXT) {
      const val = this.deepGet(payload, candidate);
      if (val !== undefined && val !== null && val !== '') {
        return {
          hasNextPage: true,
          nextCursor: String(val),
          strategy: 'cursor',
          rawField: candidate,
        };
      }
    }
    return null;
  }

  // ── Boolean hasNext ───────────────────────────────────────────────
  private tryHasNextBool(payload: unknown): PaginationInfo | null {
    for (const candidate of HAS_NEXT_BOOL) {
      const val = this.deepGet(payload, candidate);
      if (val === true || val === 'true' || val === 1) {
        return { hasNextPage: true, strategy: 'cursor', rawField: candidate };
      }
      if (val === false || val === 'false' || val === 0) {
        return { hasNextPage: false, strategy: 'cursor', rawField: candidate };
      }
    }
    return null;
  }

  // ── Page-based pagination ─────────────────────────────────────────
  private tryPage(payload: unknown): PaginationInfo | null {
    const currentPage = this.deepGetNumber(payload, PAGE_NUM);
    const totalPages  = this.deepGetNumber(payload, TOTAL_PAGES);
    if (currentPage !== null && totalPages !== null) {
      return {
        hasNextPage: currentPage < totalPages,
        nextPage: currentPage + 1,
        totalPages,
        strategy: 'page',
        rawField: `page/${currentPage} of ${totalPages}`,
      };
    }
    return null;
  }

  // ── Deep get by dot-notation path ────────────────────────────────
  private deepGet(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    // If not found at top level, search recursively
    if (current === undefined) return this.recursiveSearch(obj, parts[parts.length - 1]);
    return current;
  }

  private deepGetNumber(obj: unknown, candidates: string[]): number | null {
    for (const c of candidates) {
      const val = this.deepGet(obj, c);
      if (val !== null && val !== undefined) {
        const n = Number(val);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  }

  // ── Recursive search for a key anywhere in the object ────────────
  private recursiveSearch(obj: unknown, key: string, depth = 0): unknown {
    if (depth > 5 || !obj || typeof obj !== 'object') return undefined;
    if (Array.isArray(obj)) return undefined;
    const record = obj as Record<string, unknown>;
    if (key in record) return record[key];
    for (const val of Object.values(record)) {
      if (val && typeof val === 'object') {
        const found = this.recursiveSearch(val, key, depth + 1);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
}
