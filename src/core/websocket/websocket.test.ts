import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { AirbnbWebSocketListener } from './AirbnbWebSocketListener';
import { FallbackManager } from '../client/FallbackManager';

// Initialize global listener store
(globalThis as any)._mockListeners = {};

function triggerEvent(event: string, ...args: any[]) {
  const listeners = (globalThis as any)._mockListeners || {};
  const callbacks = listeners[event] || [];
  callbacks.forEach((cb: Function) => cb(...args));
}

function clearListeners() {
  (globalThis as any)._mockListeners = {};
}

// Mock ws library
vi.mock('ws', () => {
  const MockWebSocket = vi.fn().mockImplementation(function (url, options) {
    const wsInstance = {
      url,
      options,
      readyState: 0, // CONNECTING
      on: vi.fn().mockImplementation((event, callback) => {
        const listeners = (globalThis as any)._mockListeners;
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
      }),
      send: vi.fn(),
      close: vi.fn().mockImplementation(() => {
        wsInstance.readyState = 3; // CLOSED
        const listeners = (globalThis as any)._mockListeners;
        const closeCallbacks = listeners['close'] || [];
        closeCallbacks.forEach((cb: any) => cb(1000, 'Normal Closure'));
      }),
      terminate: vi.fn().mockImplementation(() => {
        wsInstance.readyState = 3; // CLOSED
        const listeners = (globalThis as any)._mockListeners;
        const closeCallbacks = listeners['close'] || [];
        closeCallbacks.forEach((cb: any) => cb(1006, 'Abnormal Termination'));
      }),
      ping: vi.fn().mockImplementation(() => {
        const listeners = (globalThis as any)._mockListeners;
        const pongCallbacks = listeners['pong'] || [];
        pongCallbacks.forEach((cb: any) => cb());
      })
    };
    return wsInstance;
  });

  (MockWebSocket as any).CONNECTING = 0;
  (MockWebSocket as any).OPEN = 1;
  (MockWebSocket as any).CLOSING = 2;
  (MockWebSocket as any).CLOSED = 3;

  return {
    default: MockWebSocket
  };
});

// Spy/Mock AirbnbWebSocketListener constructor/methods when testing FallbackManager
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn().mockResolvedValue(undefined);
let lastCreatedListener: any = null;
let useMockListener = false;

vi.mock('./AirbnbWebSocketListener', async (importOriginal) => {
  const actual: any = await importOriginal();
  
  class WrapperAirbnbWebSocketListener {
    public delegate: any = null;
    constructor(
      public account: any,
      public pool: any,
      public callback: any,
      public options?: any
    ) {
      if (useMockListener) {
        lastCreatedListener = this;
      } else {
        this.delegate = new actual.AirbnbWebSocketListener(account, pool, callback, options);
      }
    }

    async start() {
      if (useMockListener) {
        return mockStart();
      } else {
        return this.delegate.start();
      }
    }

    async stop() {
      if (useMockListener) {
        return mockStop();
      } else {
        return this.delegate.stop();
      }
    }
  }

  return {
    AirbnbWebSocketListener: WrapperAirbnbWebSocketListener
  };
});

// Helper function to flush standard microtasks
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('AirbnbWebSocketListener Tests', () => {
  let mockPool: any;
  let mockAccount: any;
  let eventCallback: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearListeners();
    useMockListener = false; // Use actual implementation for these tests

    mockPool = {
      execute: vi.fn().mockResolvedValue([[]])
    };

    mockAccount = {
      id: 99,
      account_name: 'Test Airbnb Account',
      platform: 'airbnb',
      cookies_json: 'test-cookies',
      api_key_cache: 'test-api-key'
    };

    eventCallback = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize and request upgrade with correct headers', async () => {
    const listener = new AirbnbWebSocketListener(mockAccount, mockPool, eventCallback);
    await listener.start();

    // Verify WebSocket constructed with headers
    expect(WebSocket).toHaveBeenCalled();
    const wsConstructorCall = (WebSocket as any).mock.calls[0];
    expect(wsConstructorCall[0]).toBe('wss://ws.airbnb.com/');
    expect(wsConstructorCall[1].headers['Cookie']).toBe('test-cookies');
    expect(wsConstructorCall[1].headers['x-airbnb-api-key']).toBe('test-api-key');
  });

  it('should send connection_init on socket open', async () => {
    const listener = new AirbnbWebSocketListener(mockAccount, mockPool, eventCallback);
    await listener.start();

    const mockWsInstance = (WebSocket as any).mock.results[0].value;
    mockWsInstance.readyState = 1; // OPEN
    
    // Simulate open
    triggerEvent('open');
    await flushMicrotasks();

    expect(mockWsInstance.send).toHaveBeenCalled();
    const payload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
    expect(payload.type).toBe('connection_init');
  });

  it('should subscribe on connection_ack', async () => {
    const listener = new AirbnbWebSocketListener(mockAccount, mockPool, eventCallback);
    await listener.start();

    const mockWsInstance = (WebSocket as any).mock.results[0].value;
    mockWsInstance.readyState = 1;

    triggerEvent('open');
    await flushMicrotasks();
    triggerEvent('message', JSON.stringify({ type: 'connection_ack' }));
    await flushMicrotasks();

    // Verify GraphQL subscription message was sent (init + 2 subscribe formats)
    expect(mockWsInstance.send).toHaveBeenCalledTimes(3); 
    const payloads = mockWsInstance.send.mock.calls.slice(1).map((c: any) => JSON.parse(c[0]));
    expect(payloads[0].payload.extensions.persistedQuery.sha256Hash).toBe('dd1acccd4801f9ad4dc6462fe5db76cb39839a76b5a531fb122d7029f9616234');
  });

  it('should recursively find threadId and emit message event', async () => {
    const listener = new AirbnbWebSocketListener(mockAccount, mockPool, eventCallback);
    await listener.start();
    
    const mockWsInstance = (WebSocket as any).mock.results[0].value;
    mockWsInstance.readyState = 1;

    triggerEvent('open');
    await flushMicrotasks();
    triggerEvent('message', JSON.stringify({ type: 'connection_ack' }));
    await flushMicrotasks();

    // Simulate push payload with nested threadId
    const pushPayload = {
      type: 'data',
      payload: {
        data: {
          show_sync_protocol_subscription: {
            event: {
              message: {
                id: 'msg-999',
                threadId: 'thread-real-time-123',
                text: 'Hello from real-time push!'
              }
            }
          }
        }
      }
    };

    triggerEvent('message', JSON.stringify(pushPayload));

    expect(eventCallback).toHaveBeenCalled();
    const emittedEvent = eventCallback.mock.calls.find((c: any) => c[0].type === 'message')[0];
    expect(emittedEvent.threadId).toBe('thread-real-time-123');
    expect(emittedEvent.payload).toBeDefined();
  });

  it('should auto-reconnect with exponential backoff on connection drop', async () => {
    const listener = new AirbnbWebSocketListener(mockAccount, mockPool, eventCallback, {
      maxBackoffMs: 10000
    });
    await listener.start();

    // Trigger drop
    triggerEvent('close', 1006, 'Abnormal Termination');
    await flushMicrotasks();
    
    expect(eventCallback).toHaveBeenCalledWith(expect.objectContaining({
      type: 'status_change',
      status: 'disconnected'
    }));

    // Backoff reconnect timer should be running
    expect(WebSocket).toHaveBeenCalledTimes(1);
    
    // Fast-forward time to trigger reconnect
    vi.advanceTimersByTime(2000); // 1000ms + jitter
    
    expect(WebSocket).toHaveBeenCalledTimes(2);
  });
});

describe('FallbackManager Tests', () => {
  let mockPool: any;
  let mockEngine: any;
  let activeAccounts: any[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    clearListeners();
    useMockListener = true; // Use mocked listener for FallbackManager tests

    activeAccounts = [
      { id: 1, platform: 'airbnb', cookies_json: 'cookies-1', is_active: 1, account_name: 'Acc 1' },
      { id: 2, platform: 'gathern', cookies_json: 'cookies-2', is_active: 1, account_name: 'Acc 2' }
    ];

    mockPool = {
      execute: vi.fn().mockImplementation((query) => {
        if (query.includes('FROM browser_accounts')) {
          return [activeAccounts];
        }
        return [[]];
      })
    };

    mockEngine = {
      syncSingleAccount: vi.fn().mockResolvedValue(undefined),
      syncSingleThread: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should discover active accounts and set up listeners/timers', async () => {
    const manager = new FallbackManager(mockPool, mockEngine);
    await manager.start();

    // Airbnb account gets listener, both get timers
    expect(mockPool.execute).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledTimes(1);

    // Fast-forward discovery polling
    await vi.advanceTimersByTimeAsync(30000);
    expect(mockPool.execute).toHaveBeenCalled();
  });

  it('should route WS message event with threadId to targeted sync', async () => {
    const manager = new FallbackManager(mockPool, mockEngine);
    await manager.start();

    // Grab the event handler passed to AirbnbWebSocketListener
    expect(lastCreatedListener).not.toBeNull();
    const callback = lastCreatedListener.callback;

    // Trigger message event with threadId
    callback({
      type: 'message',
      threadId: 'thread-999'
    });

    expect(mockEngine.syncSingleThread).toHaveBeenCalledWith(1, 'airbnb', 'thread-999');
  });

  it('should downgrade and switch to standard polling interval on socket disconnect', async () => {
    const manager = new FallbackManager(mockPool, mockEngine);
    await manager.start();

    // Retrieve event callback
    expect(lastCreatedListener).not.toBeNull();
    const callback = lastCreatedListener.callback;
    
    // Status shifts to disconnected
    callback({
      type: 'status_change',
      status: 'disconnected'
    });

    // Clear call counts
    mockEngine.syncSingleAccount.mockClear();

    // Standard interval is 2 minutes (120000ms). Let's fast forward time.
    await vi.advanceTimersByTimeAsync(130000); // 120s + random jitter (up to 5s)
    
    expect(mockEngine.syncSingleAccount).toHaveBeenCalled();
  });
});
