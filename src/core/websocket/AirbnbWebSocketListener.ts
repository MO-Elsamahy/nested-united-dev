import WebSocket from 'ws';
import { Pool } from 'mysql2/promise';

export interface WebSocketListenerOptions {
  wsUrl?: string;
  userAgent?: string;
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
  maxBackoffMs?: number;
}

export type WebSocketEventCallback = (event: {
  type: 'message' | 'status_change' | 'error';
  threadId?: string;
  status?: 'connected' | 'disconnected';
  error?: string;
  payload?: any;
}) => void;

export class AirbnbWebSocketListener {
  private ws: WebSocket | null = null;
  private isClosedIntentional = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private currentBackoff = 1000;
  
  private wsUrl: string;
  private userAgent: string;
  private pingIntervalMs: number;
  private pongTimeoutMs: number;
  private maxBackoffMs: number;

  constructor(
    private account: any,
    private pool: Pool,
    private callback: WebSocketEventCallback,
    options: WebSocketListenerOptions = {}
  ) {
    this.wsUrl = options.wsUrl || process.env.AIRBNB_WS_URL || 'wss://ws.airbnb.com/';
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.pingIntervalMs = options.pingIntervalMs || 30000;
    this.pongTimeoutMs = options.pongTimeoutMs || 10000;
    this.maxBackoffMs = options.maxBackoffMs || 60000;
  }

  async start(): Promise<void> {
    this.isClosedIntentional = false;
    await this.connect();
  }

  async stop(): Promise<void> {
    console.log(`[WS] 🛑 Stopping WebSocket Listener for account ${this.account.account_name}`);
    this.isClosedIntentional = true;
    this.clearTimeouts();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    await this.updateStatus('disconnected');
  }

  private async connect(): Promise<void> {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    console.log(`[WS] 🔗 Connecting to Airbnb WebSocket for account ${this.account.account_name}...`);

    // Prepare headers with cookies and User-Agent
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    };

    if (this.account.cookies_json) {
      headers['Cookie'] = this.account.cookies_json;
    }

    // Include api key if cached
    const apiKey = this.account.api_key_cache || 'd306zoyjsyarp7ifhu67rjxn52tv0t20';
    headers['x-airbnb-api-key'] = apiKey;

    try {
      this.ws = new WebSocket(this.wsUrl, {
        headers,
        handshakeTimeout: 10000
      });

      this.setupHandlers();
    } catch (err: any) {
      console.error(`[WS] ❌ Setup error for ${this.account.account_name}:`, err.message);
      this.handleDisconnect(err.message);
    }
  }

  private setupHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', async () => {
      console.log(`[WS] 🔌 Socket open for ${this.account.account_name}. Sending connection_init...`);
      this.currentBackoff = 1000; // Reset backoff on success
      await this.updateStatus('connected');
      
      // Apollo graphql-ws connection initialization
      this.sendJson({
        type: 'connection_init',
        payload: {
          headers: {
            'x-airbnb-api-key': this.account.api_key_cache || 'd306zoyjsyarp7ifhu67rjxn52tv0t20'
          }
        }
      });

      this.startHeartbeat();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      this.handleRawMessage(data);
    });

    this.ws.on('close', (code, reason) => {
      const reasonStr = reason ? reason.toString() : `code ${code}`;
      console.log(`[WS] 🔌 Socket closed for ${this.account.account_name}: ${reasonStr}`);
      this.handleDisconnect(`Closed: ${reasonStr}`);
    });

    this.ws.on('error', (err: any) => {
      console.error(`[WS] ❌ Socket error for ${this.account.account_name}:`, err.message);
      this.callback({ type: 'error', error: err.message });
    });

    this.ws.on('pong', () => {
      this.resetPongTimeout();
    });
  }

  private handleRawMessage(data: WebSocket.Data): void {
    try {
      const text = data.toString();
      if (!text) return;
      
      const message = JSON.parse(text);

      // Handle GraphQL keep-alive or connection acknowledgement
      if (message.type === 'ka' || message.type === 'ping') {
        this.resetPongTimeout();
        if (message.type === 'ping') {
          this.sendJson({ type: 'pong' });
        }
        return;
      }

      if (message.type === 'connection_ack') {
        console.log(`[WS] ✅ connection_ack received. Subscribing to SyncProtocolSubscription...`);
        this.subscribeToSyncProtocol();
        return;
      }

      if (message.type === 'data' || message.type === 'next') {
        this.decodeAndClassifyFrame(message);
      }
    } catch (err: any) {
      console.warn(`[WS] ⚠️ Failed to parse message frame:`, err.message);
    }
  }

  private subscribeToSyncProtocol(): void {
    const subscriptionPayload = {
      id: 'sync-protocol-subscription',
      type: 'start', // 'start' for subscriptions-transport-ws, we can support both
      payload: {
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: 'dd1acccd4801f9ad4dc6462fe5db76cb39839a76b5a531fb122d7029f9616234'
          }
        },
        variables: {
          originType: 'USER_INBOX',
          forceUgcTranslation: false,
          readReceiptsEnabled: true,
          getInboxFields: true,
          isNovaLite: false,
          threadId: null
        }
      }
    };

    this.sendJson(subscriptionPayload);

    // Also send in graphql-ws 'subscribe' format in case the endpoint prefers it
    const subscribePayload = {
      id: 'sync-protocol-subscription-new',
      type: 'subscribe',
      payload: {
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: 'dd1acccd4801f9ad4dc6462fe5db76cb39839a76b5a531fb122d7029f9616234'
          }
        },
        variables: {
          originType: 'USER_INBOX',
          forceUgcTranslation: false,
          readReceiptsEnabled: true,
          getInboxFields: true,
          isNovaLite: false,
          threadId: null
        }
      }
    };

    this.sendJson(subscribePayload);
  }

  private decodeAndClassifyFrame(message: any): void {
    const payload = message.payload || {};
    const threadId = this.findThreadIdRecursively(payload);

    if (threadId) {
      console.log(`[WS] 🔔 Event classified: Thread updated => Thread ID: ${threadId}`);
      this.callback({
        type: 'message',
        threadId,
        payload
      });
    } else {
      // General update notification: check if it's general data
      console.log(`[WS] 🔔 Unspecified data frame received for ${this.account.account_name}`);
      this.callback({
        type: 'message',
        payload
      });
    }
  }

  private findThreadIdRecursively(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return null;
    
    if (obj.threadId) return String(obj.threadId);
    if (obj.thread_id) return String(obj.thread_id);
    if (obj.globalThreadId) {
      const gid = String(obj.globalThreadId);
      if (gid.startsWith('TWVzc2F') || (/^[A-Za-z0-9+/=]+$/.test(gid) && gid.length > 20)) {
        try {
          const decoded = Buffer.from(gid, 'base64').toString('utf8');
          if (decoded.includes(':')) return decoded.split(':')[1];
        } catch {}
      }
      return gid;
    }
    
    for (const key of Object.keys(obj)) {
      const found = this.findThreadIdRecursively(obj[key]);
      if (found) return found;
    }
    
    return null;
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send native Ping frame
        this.ws.ping();
        // Also send graphql-ws ping message
        this.sendJson({ type: 'ping' });
        
        // Expect pong within timeout window
        this.resetPongTimeout();
      }
    }, this.pingIntervalMs);
  }

  private resetPongTimeout(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
    }
    
    this.pongTimeout = setTimeout(() => {
      console.warn(`[WS] ⚠️ Ping timeout (no pong received in ${this.pongTimeoutMs}ms) for ${this.account.account_name}. Reconnecting...`);
      if (this.ws) {
        this.ws.terminate();
      }
    }, this.pongTimeoutMs);
  }

  private handleDisconnect(errorMsg: string): void {
    this.clearTimeouts();
    this.updateStatus('disconnected').catch(console.error);

    if (this.isClosedIntentional) {
      return;
    }

    // Schedule reconnection with exponential backoff + jitter (+/- 20%)
    const jitter = (Math.random() * 0.4 - 0.2) * this.currentBackoff;
    const delay = Math.min(this.currentBackoff + jitter, this.maxBackoffMs);
    
    console.log(`[WS] 🔄 Scheduling reconnect in ${Math.round(delay)}ms for account ${this.account.account_name}`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoffMs);
      this.connect().catch(err => {
        console.error(`[WS] ❌ Reconnect attempt failed for ${this.account.account_name}:`, err.message);
      });
    }, delay);

    this.callback({
      type: 'status_change',
      status: 'disconnected',
      error: errorMsg
    });
  }

  private clearTimeouts(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
    
    this.reconnectTimeout = null;
    this.pingInterval = null;
    this.pongTimeout = null;
  }

  private sendJson(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private async updateStatus(status: 'connected' | 'disconnected'): Promise<void> {
    try {
      await this.pool.execute(
        `UPDATE browser_accounts SET ws_status = ?, last_ws_activity = NOW() WHERE id = ?`,
        [status, this.account.id]
      );
      this.callback({
        type: 'status_change',
        status
      });
    } catch (err: any) {
      console.error(`[WS] ❌ Failed to update ws_status in DB for ${this.account.account_name}:`, err.message);
    }
  }
}
