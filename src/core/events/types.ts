export type Platform = 'airbnb' | 'gathern';
export type EventStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';

export interface RawPlatformEvent {
  id?: string;             // generated or provided event ID
  accountId: string;       // browser_account_id
  platform: Platform;
  operationName: string;   // e.g. 'ViaductInboxData', 'CreateBulkMessagesMutation'
  timestamp: string;       // ISO string when captured
  url: string;
  headers: Record<string, string>;
  payload: any;            // Response JSON body
  requestBody?: any;       // GraphQL Request variables if intercepted
}

export interface NormalizedMessageDTO {
  platformMsgId: string;
  threadId: string;
  guestName: string;
  senderName: string | null;
  messageText: string;
  isFromMe: boolean;
  sentAt: Date;
  rawData: any;
}

export interface NormalizedThreadDTO {
  threadId: string;
  guestName: string;
  lastMessageId: string | null;
  lastMessageTimestamp: Date | null;
  serverUpdatedAt: Date | null;
  metadataJson: any;
  messages: NormalizedMessageDTO[];
}

export interface NormalizedEvent {
  eventId: string;
  accountId: string;
  platform: Platform;
  operationName: string;
  threads: NormalizedThreadDTO[];
}

export interface IEventQueue {
  enqueue(event: RawPlatformEvent): Promise<string>;
  processNext(): Promise<boolean>;
  size(): number;
}
