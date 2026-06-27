// ─────────────────────────────────────────────────────────────────
// AbstractMessageParser: Recursive, zero-assumption message parser
// src/core/parsers/base/AbstractMessageParser.ts
// ─────────────────────────────────────────────────────────────────

import type { IMessageParser, ParsedMessage, ParseContext } from '../../interfaces/index';

export abstract class AbstractMessageParser implements IMessageParser {
  abstract platform: string;
  abstract canParse(raw: unknown): boolean;
  abstract parse(raw: unknown, ctx: ParseContext): ParsedMessage | null;

  // Priority-ordered field name candidates
  protected static readonly TEXT_FIELDS  = ['accessibilityText','plainText','text','body','content','message','richText','description'];
  protected static readonly ID_FIELDS    = ['id','messageId','message_id','msgId','msg_id'];
  protected static readonly TIME_FIELDS  = ['createdAt','created_at','createdAtMs','timestamp','sentAt','sent_at','time'];
  protected static readonly SENDER_FIELDS = ['senderId','sender_id','authorId','author_id','userId','user_id'];
  protected static readonly SENDER_TYPE  = ['senderType','sender_type','role','type'];

  // ── Recursively find first non-null value for a list of field names ─
  protected findField(obj: unknown, candidates: string[], depth = 0): unknown {
    if (depth > 6 || !obj || typeof obj !== 'object') return undefined;
    const record = obj as Record<string, unknown>;

    for (const key of candidates) {
      if (key in record && record[key] !== null && record[key] !== undefined) {
        return record[key];
      }
    }

    // Recurse into nested objects (not arrays)
    for (const val of Object.values(record)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const found = this.findField(val, candidates, depth + 1);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  // ── Extract text intelligently from any shape ─────────────────────
  protected extractText(raw: unknown): string {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw !== 'object') return '';

    const obj = raw as Record<string, unknown>;

    // Airbnb StandardText shape: { accessibilityText, components: [{text}] }
    if (obj.accessibilityText && typeof obj.accessibilityText === 'string') return obj.accessibilityText;
    if (obj.plainText && typeof obj.plainText === 'string') return obj.plainText;
    if (Array.isArray(obj.components)) {
      const parts = (obj.components as unknown[])
        .map(c => this.extractText(c))
        .filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
    }

    // Try known text field names
    for (const field of AbstractMessageParser.TEXT_FIELDS) {
      if (field in obj) {
        const val = obj[field];
        if (typeof val === 'string' && val.trim()) return val.trim();
        if (val && typeof val === 'object') {
          const nested = this.extractText(val);
          if (nested) return nested;
        }
      }
    }
    return '';
  }

  // ── Parse timestamp from various formats ──────────────────────────
  protected extractTimestamp(raw: unknown): Date {
    const val = this.findField(raw, AbstractMessageParser.TIME_FIELDS);
    if (!val) return new Date();
    if (typeof val === 'number') {
      // Handle milliseconds vs seconds
      return new Date(val > 1e12 ? val : val * 1000);
    }
    if (typeof val === 'string') {
      if (/^\d+$/.test(val)) {
        const num = Number(val);
        return new Date(num > 1e12 ? num : num * 1000);
      }
      return new Date(val);
    }
    return new Date();
  }

  // ── Extract message ID ────────────────────────────────────────────
  protected extractId(raw: unknown, fallback = ''): string {
    const val = this.findField(raw, AbstractMessageParser.ID_FIELDS);
    if (val !== undefined && val !== null) return String(val);
    return fallback;
  }

  // ── Find arrays that look like message lists ───────────────────────
  protected discoverMessageArrays(obj: unknown, depth = 0): unknown[][] {
    if (depth > 5 || !obj || typeof obj !== 'object') return [];
    const results: unknown[][] = [];

    if (Array.isArray(obj)) {
      if (obj.length > 0 && this.looksLikeMessages(obj)) {
        results.push(obj);
      }
      return results;
    }

    for (const val of Object.values(obj as Record<string, unknown>)) {
      if (Array.isArray(val) && val.length > 0 && this.looksLikeMessages(val)) {
        results.push(val);
      } else if (val && typeof val === 'object') {
        results.push(...this.discoverMessageArrays(val, depth + 1));
      }
    }
    return results;
  }

  // ── Heuristic: does this array look like messages? ────────────────
  private looksLikeMessages(arr: unknown[]): boolean {
    const sample = arr[0];
    if (!sample || typeof sample !== 'object') return false;
    const keys = Object.keys(sample as Record<string, unknown>);
    const messageKeys = [...AbstractMessageParser.ID_FIELDS, ...AbstractMessageParser.TEXT_FIELDS, ...AbstractMessageParser.TIME_FIELDS];
    return messageKeys.some(k => keys.includes(k));
  }
}
