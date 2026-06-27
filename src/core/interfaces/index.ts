// ─────────────────────────────────────────────────────────────────
// AMSF Core Interfaces
// src/core/interfaces/index.ts
// ─────────────────────────────────────────────────────────────────

// ── Network Capture ──────────────────────────────────────────────

export interface CapturedRequest {
  requestId: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: string | null;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  timestamp: Date;
  platform: 'airbnb' | 'gathern' | 'unknown';
  accountId?: string;
}

export interface INetworkCapture {
  attach(): Promise<void>;
  detach(): void;
  isAttached(): boolean;
  onCapture(handler: (req: CapturedRequest) => void): void;
  offCapture(handler: (req: CapturedRequest) => void): void;
}

// ── GraphQL Registry ─────────────────────────────────────────────

export type OperationCategory =
  | 'inbox' | 'thread' | 'message' | 'send'
  | 'read_receipt' | 'typing' | 'reservation' | 'unknown';

export interface GraphQLOperation {
  id?: number;
  platform: 'airbnb' | 'gathern' | 'generic';
  operationName: string;
  sha256Hash: string;
  endpointUrl: string;
  variablesSchema?: Record<string, unknown>;
  sampleVariables?: Record<string, unknown>;
  sampleHeaders?: Record<string, string>;
  apiKey?: string;
  category: OperationCategory;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  isActive: boolean;
}

export interface IGraphQLRegistry {
  upsertOperation(op: Omit<GraphQLOperation, 'id' | 'firstSeenAt' | 'lastSeenAt'>): Promise<GraphQLOperation>;
  getLatestByName(platform: string, operationName: string): Promise<GraphQLOperation | null>;
  getLatestByCategory(platform: string, category: OperationCategory): Promise<GraphQLOperation | null>;
  getAll(platform: string): Promise<GraphQLOperation[]>;
  markInactive(platform: string, sha256Hash: string): Promise<void>;
  invalidateCache(platform?: string): void;
}

// ── Parsers ───────────────────────────────────────────────────────

export interface ParsedAttachment {
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
  url?: string;
  name?: string;
}

export interface ParsedMessage {
  id: string;
  text: string;
  isFromHost: boolean;
  senderId?: string;
  senderName?: string;
  timestamp: Date;
  rawData: unknown;
  attachments?: ParsedAttachment[];
}

export interface ParsedThread {
  threadId: string;
  guestName: string;
  hostId?: string;
  listingId?: string;
  reservationId?: string;
  messages: ParsedMessage[];
  rawData: unknown;
}

export interface ParseContext {
  platform: string;
  accountId: number;
  hostUserId?: string;
}

export interface IMessageParser {
  platform: string;
  canParse(raw: unknown): boolean;
  parse(raw: unknown, ctx: ParseContext): ParsedMessage | null;
}

export interface IThreadParser {
  platform: string;
  canParse(raw: unknown): boolean;
  parse(raw: unknown, ctx: ParseContext): ParsedThread | null;
  extractAllMessages(raw: unknown, ctx: ParseContext): ParsedMessage[];
}

// ── Pagination ────────────────────────────────────────────────────

export type PaginationStrategy = 'cursor' | 'offset' | 'page' | 'unknown';

export interface PaginationInfo {
  hasNextPage: boolean;
  nextCursor?: string;
  nextPage?: number;
  totalPages?: number;
  strategy: PaginationStrategy;
  rawField?: string; // the actual discovered field name
}

export interface IPaginationDetector {
  detect(payload: unknown): PaginationInfo;
}

// ── Adaptive Client ───────────────────────────────────────────────

export interface AdaptiveRequestConfig {
  platform: 'airbnb' | 'gathern';
  operationName: string;
  variables?: Record<string, unknown>;
  cookies: string;
  apiKey?: string;
  overrideHash?: string;
}

export interface AdaptiveResponse {
  ok: boolean;
  status: number;
  data: unknown;
  operationUsed?: GraphQLOperation;
  rawBody?: string;
}

export interface IAdaptiveClient {
  execute(config: AdaptiveRequestConfig): Promise<AdaptiveResponse>;
}

// ── Discovery Engine ──────────────────────────────────────────────

export interface DiscoveryResult {
  platform: string;
  operationsFound: number;
  hashesUpdated: number;
  newOperations: string[];
}

export interface IDiscoveryEngine {
  runDiscovery(platform: string, cookies: string): Promise<DiscoveryResult>;
}

// ── Schema Diff ───────────────────────────────────────────────────

export interface SchemaDiff {
  addedFields: string[];
  removedFields: string[];
  renamedFields: Array<{ from: string; to: string }>;
  hasBreakingChanges: boolean;
  rawDiff: Record<string, unknown>;
}

export interface ISchemaDiffEngine {
  diff(oldPayload: unknown, newPayload: unknown): SchemaDiff;
  isBreaking(diff: SchemaDiff): boolean;
}
