// ─────────────────────────────────────────────────────────────────
// PersistedQueryExtractor: Extracts operationName, hash, variables
// from any captured GraphQL request/response pair.
// src/core/extractor/PersistedQueryExtractor.ts
// ─────────────────────────────────────────────────────────────────

import type { CapturedRequest, GraphQLOperation, OperationCategory } from '../interfaces/index';

export interface ExtractedOperation {
  platform: 'airbnb' | 'gathern' | 'generic';
  operationName: string;
  sha256Hash: string;
  endpointUrl: string;
  sampleHeaders: Record<string, string>;
  sampleVariables?: Record<string, unknown>;
  apiKey?: string;
  category: OperationCategory;
}

// Regex: matches 64-char hex hash in URL path
const HASH_IN_URL = /\/([a-f0-9]{64})(?:\/|\?|$)/;

export class PersistedQueryExtractor {

  extract(req: CapturedRequest): ExtractedOperation | null {
    const url = req.url;
    if (!url) return null;

    // Only process known API domains
    const isAirbnb = url.includes('www.airbnb.com/api/v3/');
    const isGathern = url.includes('chatapi-prod.gathern.co') || url.includes('business.gathern.co/api/');
    if (!isAirbnb && !isGathern) return null;

    const platform: 'airbnb' | 'gathern' = isAirbnb ? 'airbnb' : 'gathern';

    // ── Extract hash ──────────────────────────────────────────────
    let sha256Hash: string | null = null;
    const hashMatch = url.match(HASH_IN_URL);
    if (hashMatch) sha256Hash = hashMatch[1];

    // ── Extract from request body (GraphQL POST) ──────────────────
    let operationName: string | null = null;
    let sampleVariables: Record<string, unknown> | undefined;

    if (req.requestBody) {
      try {
        const body = typeof req.requestBody === 'string'
          ? JSON.parse(req.requestBody)
          : req.requestBody;

        operationName = body?.operationName ?? null;
        sampleVariables = body?.variables ?? undefined;

        // Hash from extensions.persistedQuery.sha256Hash
        const bodyHash = body?.extensions?.persistedQuery?.sha256Hash;
        if (bodyHash && !sha256Hash) sha256Hash = bodyHash;
      } catch (_e) {
        // Ignore parse errors
      }
    }

    // ── Extract operation name from URL (fallback) ─────────────────
    if (!operationName) {
      // URL segment before the hash, e.g. /api/v3/ViaductInboxData/<hash>
      const urlOpMatch = url.match(/\/api\/v3\/([A-Za-z]+)\/[a-f0-9]{64}/);
      if (urlOpMatch) operationName = urlOpMatch[1];
    }

    // ── For Gathern REST APIs — synthetic operation names ──────────
    if (platform === 'gathern' && !sha256Hash) {
      if (url.includes('/chats')) {
        operationName = operationName ?? 'GathernInboxList';
        sha256Hash = 'rest-gathern-inbox-list';
      } else if (url.includes('/chat_details')) {
        operationName = operationName ?? 'GathernThreadMessages';
        sha256Hash = 'rest-gathern-thread-messages';
      } else {
        return null; // Unknown Gathern endpoint
      }
    }

    // Must have both hash and name to be useful
    if (!sha256Hash || !operationName) return null;

    // ── Extract API key ───────────────────────────────────────────
    const apiKey = req.requestHeaders?.['x-airbnb-api-key']
      ?? req.requestHeaders?.['X-Airbnb-API-Key']
      ?? undefined;

    // ── Build clean headers (exclude cookies for security) ────────
    const sampleHeaders: Record<string, string> = {};
    const safeHeaders = ['content-type', 'x-airbnb-api-key', 'origin', 'referer', 'user-agent', 'accept'];
    for (const h of safeHeaders) {
      const val = req.requestHeaders?.[h] ?? req.requestHeaders?.[h.toLowerCase()];
      if (val) sampleHeaders[h] = val;
    }

    // ── Classify category ─────────────────────────────────────────
    const category = this.classifyCategory(operationName, url, req.responseBody);

    // ── Build endpoint URL ────────────────────────────────────────
    // For GraphQL: always rebuild from operation name + hash (canonical form)
    const endpointUrl = isAirbnb
      ? `https://www.airbnb.com/api/v3/${operationName}/${sha256Hash}`
      : url.split('?')[0]; // For REST: strip query params

    return {
      platform,
      operationName,
      sha256Hash,
      endpointUrl,
      sampleHeaders,
      sampleVariables,
      apiKey,
      category,
    };
  }

  private classifyCategory(opName: string, url: string, body: unknown): OperationCategory {
    const name = opName.toLowerCase();
    const u = url.toLowerCase();

    if (name.includes('inbox') || name.includes('inboxdata') || u.includes('/chats')) return 'inbox';
    if (name.includes('thread') || u.includes('/chat_details') || u.includes('/thread')) return 'thread';
    if (name.includes('createmessage') || name.includes('sendmessage') || name.includes('bulkmessage')) return 'send';
    if (name.includes('readreceipt') || name.includes('markread') || name.includes('seen')) return 'read_receipt';
    if (name.includes('typing') || name.includes('presence')) return 'typing';
    if (name.includes('reservation') || name.includes('booking')) return 'reservation';

    // Heuristic from response body
    if (body && typeof body === 'object') {
      const bodyStr = JSON.stringify(body);
      if (bodyStr.includes('"threads"') || bodyStr.includes('"inbox"')) return 'inbox';
      if (bodyStr.includes('"messages"') && bodyStr.includes('"thread"')) return 'thread';
    }

    return 'unknown';
  }
}
