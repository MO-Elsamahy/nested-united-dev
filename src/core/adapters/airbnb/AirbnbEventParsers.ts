import { IEventParser } from '../../events/ParserRegistry';
import { RawPlatformEvent, NormalizedEvent, NormalizedThreadDTO, NormalizedMessageDTO } from '../../events/types';

// Helper to extract thread ID handling base64 encoding commonly used by Airbnb
function extractThreadId(raw: any): string | null {
  const id = raw?.threadId ?? raw?.id ?? raw?.globalThreadId;
  if (!id) return null;
  let strId = String(id);
  if (strId.startsWith('TWVzc2F') || (/^[A-Za-z0-9+/=]+$/.test(strId) && strId.length > 20)) {
    try {
      const decoded = Buffer.from(strId, 'base64').toString('utf8');
      if (decoded.includes(':')) return decoded.split(':')[1];
      return decoded;
    } catch { }
  }
  return strId;
}

// Recursive object search for extracting deep Airbnb data
function findInObject(obj: any, keyMap: (k: string, v: any) => any): any[] {
  let results: any[] = [];
  if (!obj || typeof obj !== 'object') return results;
  
  for (const [k, v] of Object.entries(obj)) {
    const match = keyMap(k, v);
    if (match) results.push(match);
    if (typeof v === 'object') {
      results = results.concat(findInObject(v, keyMap));
    }
  }
  return results;
}

function extractMessageText(m: any): string {
  if (typeof m.text === 'string') return m.text;
  if (m.text?.components?.[0]?.text) return m.text.components[0].text;
  if (typeof m.body === 'string') return m.body;
  if (typeof m.content === 'string') return m.content;
  if (m.contentPreview?.content) return m.contentPreview.content;
  return '';
}

export class AirbnbInboxParser implements IEventParser {
  canParse(operationName: string, platform: string): boolean {
    return platform === 'airbnb' && (operationName === 'ViaductInboxData' || operationName === 'ViaductGetThreadAndDataQuery');
  }

  parse(event: RawPlatformEvent): NormalizedEvent | null {
    const threads: NormalizedThreadDTO[] = [];
    
    // Find all thread objects in the payload
    const threadObjects = findInObject(event.payload, (k, v) => {
      if (v && typeof v === 'object' && (v.__typename === 'Thread' || v.__typename === 'MessageThread')) {
        return v;
      }
      return null;
    });

    for (const t of threadObjects) {
      const threadId = extractThreadId(t);
      if (!threadId) continue;

      const title = t.title || t.inboxTitle?.components?.[0]?.text || t.guestDetails?.localizedName || 'Guest';
      const lastMessageNode = t.latestMessage || t.snippetMessage || t.messages?.edges?.[t.messages.edges.length - 1]?.node;
      
      let lastMsgId = lastMessageNode?.id ? String(lastMessageNode.id) : null;
      let lastMsgTime = lastMessageNode?.createdAtMs ? new Date(parseInt(lastMessageNode.createdAtMs)) : (lastMessageNode?.createdAt ? new Date(lastMessageNode.createdAt) : null);

      // Extract messages if present in this node
      const messages: NormalizedMessageDTO[] = [];
      const msgNodes = t.messages?.edges?.map((e: any) => e.node) || (lastMessageNode ? [lastMessageNode] : []);
      
      for (const m of msgNodes) {
        if (!m.id) continue;
        const mTime = m.createdAtMs ? new Date(parseInt(m.createdAtMs)) : (m.createdAt ? new Date(m.createdAt) : new Date());
        const text = extractMessageText(m);
        if (!text.trim()) continue;

        const senderType = String(m.senderType ?? m.role ?? '').toUpperCase();
        const isFromHost = ['HOST', 'COHOST'].includes(senderType);

        messages.push({
          platformMsgId: String(m.id),
          threadId: threadId,
          guestName: title,
          senderName: m.sender?.firstName ?? null,
          messageText: text,
          isFromMe: isFromHost,
          sentAt: mTime,
          rawData: m
        });
      }

      if (!lastMsgId && messages.length > 0) {
        const sorted = [...messages].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
        lastMsgId = sorted[0].platformMsgId;
        lastMsgTime = sorted[0].sentAt;
      }

      threads.push({
        threadId,
        guestName: title,
        lastMessageId: lastMsgId,
        lastMessageTimestamp: lastMsgTime,
        serverUpdatedAt: new Date(),
        metadataJson: t,
        messages
      });
    }

    // Deduplicate threads
    const uniqueThreads = new Map<string, NormalizedThreadDTO>();
    for (const t of threads) {
      if (!uniqueThreads.has(t.threadId) || (t.messages.length > (uniqueThreads.get(t.threadId)?.messages.length || 0))) {
        uniqueThreads.set(t.threadId, t);
      }
    }

    return {
      eventId: event.id!,
      accountId: event.accountId,
      platform: event.platform,
      operationName: event.operationName,
      threads: Array.from(uniqueThreads.values())
    };
  }
}

export class AirbnbOutgoingParser implements IEventParser {
  canParse(operationName: string, platform: string): boolean {
    return platform === 'airbnb' && (
      operationName === 'CreateBulkMessagesMutation' || 
      operationName === 'CreateInstantEventViaductMutation'
    );
  }

  parse(event: RawPlatformEvent): NormalizedEvent | null {
    // Determine Thread ID. For outgoing, it's usually in the requestBody variables!
    let threadId = extractThreadId(event.requestBody?.variables?.threadId ?? event.requestBody?.variables?.globalThreadId);
    
    // If not in request, try to find it in the response
    if (!threadId) {
       const threadNodes = findInObject(event.payload, (k, v) => (k === 'threadId' || k === 'id') && typeof v === 'string' ? v : null);
       if (threadNodes.length > 0) {
         threadId = extractThreadId({ id: threadNodes[0] });
       }
    }

    if (!threadId) return null;

    // Determine Message Text from requestBody
    let text = event.requestBody?.variables?.message || event.requestBody?.variables?.messageText || event.requestBody?.variables?.text || '';
    
    // If empty, search response
    if (!text) {
      const textNodes = findInObject(event.payload, (k, v) => (k === 'text' || k === 'message') && typeof v === 'string' ? v : null);
      if (textNodes.length > 0) text = textNodes[0];
    }

    const messages: NormalizedMessageDTO[] = [{
      platformMsgId: `temp-out-${Date.now()}`, // Temporary ID if backend doesn't return one instantly
      threadId: threadId,
      guestName: 'Guest', // Unknown on outgoing
      senderName: 'Host',
      messageText: text,
      isFromMe: true,
      sentAt: new Date(event.timestamp),
      rawData: event.payload
    }];

    return {
      eventId: event.id!,
      accountId: event.accountId,
      platform: event.platform,
      operationName: event.operationName,
      threads: [{
        threadId,
        guestName: 'Guest',
        lastMessageId: messages[0].platformMsgId,
        lastMessageTimestamp: messages[0].sentAt,
        serverUpdatedAt: new Date(),
        metadataJson: {},
        messages
      }]
    };
  }
}

export class AirbnbRealtimeParser implements IEventParser {
  canParse(operationName: string, platform: string): boolean {
    return platform === 'airbnb' && (operationName === 'SyncProtocolSubscription' || operationName === 'AirbnbWebSocketMessage');
  }

  parse(event: RawPlatformEvent): NormalizedEvent | null {
     // Re-use logic from Inbox Parser as the payload structures are often similar nested nodes
     const inboxParser = new AirbnbInboxParser();
     return inboxParser.parse(event);
  }
}
