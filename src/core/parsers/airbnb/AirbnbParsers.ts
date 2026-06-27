// ─────────────────────────────────────────────────────────────────
// AirbnbMessageParser: Recursive Airbnb message parser
// src/core/parsers/airbnb/AirbnbMessageParser.ts
// ─────────────────────────────────────────────────────────────────

import { AbstractMessageParser } from '../base/AbstractMessageParser';
import type { ParsedMessage, ParseContext } from '../../interfaces/index';

export class AirbnbMessageParser extends AbstractMessageParser {
  platform = 'airbnb';

  canParse(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    // A message-like object: has id + (text or body or senderType)
    return !!(
      this.findField(obj, AbstractMessageParser.ID_FIELDS) &&
      (this.findField(obj, AbstractMessageParser.TEXT_FIELDS) || obj.senderType)
    );
  }

  parse(raw: unknown, ctx: ParseContext): ParsedMessage | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    const id = this.extractId(obj, `unknown-${Date.now()}`);

    // ── Extract text (handles StandardText shape recursively) ─────
    let text = '';
    if (obj.text) text = this.extractText(obj.text);
    if (!text && obj.body) text = this.extractText(obj.body);
    if (!text && obj.content) text = this.extractText(obj.content);
    if (!text && obj.hydratedContent) text = this.extractText(obj.hydratedContent);
    if (!text && obj.contentPreview) text = this.extractText(obj.contentPreview);
    if (!text) text = this.extractText(obj); // last resort: try any field

    if (!text || !text.trim()) return null;

    // ── Sender detection ──────────────────────────────────────────
    const senderType = String(obj.senderType ?? obj.role ?? '').toUpperCase();
    const senderObj = obj.sender as Record<string, unknown> | undefined;
    const authorObj = obj.author as Record<string, unknown> | undefined;
    const accountObj = obj.account as Record<string, unknown> | undefined;

    const rawSenderId = accountObj?.accountId
      ?? senderObj?.id
      ?? authorObj?.id
      ?? this.findField(obj, AbstractMessageParser.SENDER_FIELDS);

    const senderId = rawSenderId ? String(rawSenderId) : '';

    const isFromHost = !!(senderType === 'HOST' ||
                       senderType === 'COHOST' ||
                       (senderId && ctx.hostUserId && senderId === String(ctx.hostUserId)));

    const senderName = String(
      senderObj?.firstName ?? authorObj?.firstName ?? obj.senderName ?? ''
    );

    return {
      id,
      text: text.trim(),
      isFromHost,
      senderId: senderId || undefined,
      senderName: senderName || undefined,
      timestamp: this.extractTimestamp(obj),
      rawData: obj,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// AirbnbThreadParser: Recursive Airbnb thread parser
// src/core/parsers/airbnb/AirbnbThreadParser.ts
// ─────────────────────────────────────────────────────────────────
import type { IThreadParser, ParsedThread } from '../../interfaces/index';

export class AirbnbThreadParser implements IThreadParser {
  platform = 'airbnb';
  private msgParser = new AirbnbMessageParser();

  canParse(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    return !!(obj.threadId ?? obj.id ?? obj.globalThreadId);
  }

  parse(raw: unknown, ctx: ParseContext): ParsedThread | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;

    let threadId = String(obj.threadId ?? obj.id ?? '');
    if (!threadId) return null;

    // Decode base64 Relay IDs if present (e.g. TWVzc2FnZVRocmVhZDoyMDA5NDY1MzAx -> MessageThread:2009465301 -> 2009465301)
    if (threadId.startsWith('TWVzc2F') || /^[A-Za-z0-9+/=]+$/.test(threadId) && threadId.length > 20) {
      try {
        const decoded = Buffer.from(threadId, 'base64').toString('utf8');
        if (decoded.includes(':')) {
          threadId = decoded.split(':')[1];
        }
      } catch (e) { /* ignore */ }
    }

    // ── Guest name detection ──────────────────────────────────────
    let guestName = 'Guest';
    // Check users array
    if (Array.isArray(obj.users)) {
      const guest = (obj.users as any[]).find(u => u.type === 'GUEST' || u.role === 'GUEST');
      if (guest) guestName = guest.name ?? guest.firstName ?? 'Guest';
    }
    // Check otherUser
    if (guestName === 'Guest' && obj.otherUser) {
      guestName = (obj.otherUser as any).firstName ?? 'Guest';
    }
    // Check inboxTitle
    if (guestName === 'Guest' && obj.inboxTitle) {
      const title = this.extractText(obj.inboxTitle);
      if (title) guestName = title;
    }
    // Check participants
    if (guestName === 'Guest' && obj.participants) {
      const parts = this.findParticipants(obj.participants);
      const guest = parts.find(p => p.role !== 'HOST' && p.role !== 'COHOST');
      if (guest?.name) guestName = guest.name;
    }

    const messages = this.extractAllMessages(obj, ctx);

    return {
      threadId,
      guestName,
      listingId: String(obj.listingId ?? obj.listing_id ?? (obj.reservation as any)?.listingId ?? ''),
      reservationId: String(obj.reservationId ?? obj.reservation_id ?? (obj.reservation as any)?.id ?? ''),
      messages,
      rawData: obj,
    };
  }

  extractAllMessages(raw: unknown, ctx: ParseContext): ParsedMessage[] {
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const messages: ParsedMessage[] = [];
    const seenIds = new Set<string>();

    const addMsg = (m: unknown) => {
      const parsed = this.msgParser.parse(m, ctx);
      if (parsed && !seenIds.has(parsed.id)) {
        seenIds.add(parsed.id);
        messages.push(parsed);
      }
    };

    // Try known message container shapes
    const candidates = [
      obj.messages,
      (obj.messages as any)?.edges?.map((e: any) => e.node),
      (obj.messageData as any)?.messages,
      (obj.messageThread as any)?.messages,
      (obj.thread as any)?.messages,
    ].filter(Boolean);

    for (const container of candidates) {
      if (Array.isArray(container)) container.forEach(addMsg);
    }

    // If nothing found, do recursive discovery
    if (messages.length === 0) {
      const arrays = this.msgParser['discoverMessageArrays'](obj);
      for (const arr of arrays) arr.forEach(addMsg);
    }

    // Sort chronologically
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return messages;
  }

  private extractText(raw: unknown): string {
    return this.msgParser['extractText'](raw);
  }

  private findParticipants(participants: unknown): Array<{ role?: string; name?: string }> {
    if (!participants || typeof participants !== 'object') return [];
    const obj = participants as Record<string, unknown>;
    if (Array.isArray(obj.edges)) {
      return (obj.edges as any[]).map(e => e.node ?? e).filter(Boolean);
    }
    if (Array.isArray(participants)) return participants as any[];
    return [];
  }
}
