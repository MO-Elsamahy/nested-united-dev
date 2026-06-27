// ─────────────────────────────────────────────────────────────────
// Gathern Parsers
// src/core/parsers/gathern/GathernParsers.ts
// ─────────────────────────────────────────────────────────────────

import { AbstractMessageParser } from '../base/AbstractMessageParser';
import type { IThreadParser, ParsedMessage, ParsedThread, ParseContext } from '../../interfaces/index';

// ── GathernMessageParser ──────────────────────────────────────────

export class GathernMessageParser extends AbstractMessageParser {
  platform = 'gathern';

  canParse(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    return !!(obj.id || obj.message_id) && !!(obj.message || obj.body || obj.content);
  }

  parse(raw: unknown, ctx: ParseContext): ParsedMessage | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    const id = String(obj.id ?? obj.message_id ?? `gathern-${Date.now()}`);
    const text = String(obj.message ?? obj.body ?? obj.content ?? '').trim();
    if (!text) return null;

    // Gathern: is_provider = true means it's from the host
    let isFromHost: boolean;
    if ('is_provider' in obj) {
      isFromHost = Boolean(obj.is_provider);
    } else {
      // fallback: compare sender_id with context host
      const senderId = String(obj.sender_id ?? '');
      isFromHost = !!ctx.hostUserId && senderId === ctx.hostUserId;
    }

    return {
      id,
      text,
      isFromHost,
      senderId: String(obj.sender_id ?? ''),
      senderName: String(obj.sender_name ?? ''),
      timestamp: this.extractTimestamp(obj),
      rawData: obj,
    };
  }
}

// ── GathernThreadParser ───────────────────────────────────────────

export class GathernThreadParser implements IThreadParser {
  platform = 'gathern';
  private msgParser = new GathernMessageParser();

  canParse(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    return !!(obj.chat_uid ?? obj.id);
  }

  parse(raw: unknown, ctx: ParseContext): ParsedThread | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    const threadId = String(obj.chat_uid ?? obj.id ?? '');
    if (!threadId) return null;

    const guestName = String(
      obj.name ?? obj.name_verified ?? (obj.guest as any)?.name ?? obj.guest_name ?? 'Guest'
    );

    const unitId = String(obj.unit_id ?? obj.chalet_id ?? '');
    const messages = this.extractAllMessages(obj, ctx);

    return {
      threadId,
      guestName,
      listingId: unitId || undefined,
      reservationId: String(obj.reservation_id ?? ''),
      messages,
      rawData: obj,
    };
  }

  extractAllMessages(raw: unknown, ctx: ParseContext): ParsedMessage[] {
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const messages: ParsedMessage[] = [];
    const seenIds = new Set<string>();

    const providerId = String((obj as any).provider_id ?? ctx.hostUserId ?? '');
    const enrichedCtx = { ...ctx, hostUserId: providerId || ctx.hostUserId };

    const addMsg = (m: unknown) => {
      const parsed = this.msgParser.parse(m, enrichedCtx);
      if (parsed && !seenIds.has(parsed.id)) {
        seenIds.add(parsed.id);
        messages.push(parsed);
      }
    };

    // Try known Gathern message container shapes
    const containers = [obj.messages, (obj.data as any)?.messages, obj.data];
    for (const container of containers) {
      if (Array.isArray(container)) { container.forEach(addMsg); break; }
      if (container && typeof container === 'object') {
        // Gathern returns grouped messages as { date: [msgs...] }
        for (const group of Object.values(container as Record<string, unknown>)) {
          if (Array.isArray(group)) group.forEach(addMsg);
        }
        if (messages.length > 0) break;
      }
    }

    // Also check last_message for chat list entries
    if (messages.length === 0 && obj.last_message) {
      addMsg(obj.last_message);
    }

    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return messages;
  }
}
