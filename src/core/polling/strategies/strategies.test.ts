import { describe, it, expect, vi, beforeEach } from "vitest";
import { AirbnbSyncStrategy } from "./AirbnbSyncStrategy";
import { GathernSyncStrategy } from "./GathernSyncStrategy";

describe("Sync Strategies Tests", () => {
  let mockClient: any;
  let mockThreadParser: any;
  let mockPaginator: any;
  let mockThreadRepo: any;
  let mockMessageRepo: any;
  let mockConnection: any;

  beforeEach(() => {
    mockClient = {
      execute: vi.fn(),
    };
    mockThreadParser = {
      parse: vi.fn(),
      extractAllMessages: vi.fn(),
    };
    mockPaginator = {
      detect: vi.fn(),
    };
    mockThreadRepo = {
      findByThreadId: vi.fn(),
      upsert: vi.fn(),
      updateSyncStatus: vi.fn(),
    };
    mockMessageRepo = {
      saveMessage: vi.fn(),
      messageExists: vi.fn(),
    };
    mockConnection = {};
  });

  describe("AirbnbSyncStrategy - Incremental Sync", () => {
    const mockAccount = {
      id: "acc-airbnb-123",
      account_name: "Test Airbnb Account",
      cookies_json: "{}",
      platform_user_id: "user-123",
    };

    it("should skip syncing if thread metadata is unchanged", async () => {
      // 1. Mock list of threads returned in inbox
      mockClient.execute.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          data: {
            presentation: {
              inbox: {
                threads: [
                  {
                    id: "thread-abc",
                    messages: {
                      edges: [
                        {
                          node: {
                            id: "msg-last-123",
                            createdAtMs: 1782506741566,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      });

      mockPaginator.detect.mockReturnValue({ hasNextPage: false });

      // Parser returns parsed thread details
      mockThreadParser.parse.mockReturnValue({
        threadId: "thread-abc",
        guestName: "Guest User",
      });

      // Local metadata exists and matches the server's latest message ID
      mockThreadRepo.findByThreadId.mockResolvedValueOnce({
        syncStatus: "synced",
        lastMessageId: "msg-last-123",
        lastMessageTimestamp: new Date(1782506741566),
        messageCount: 5,
      });

      const strategy = new AirbnbSyncStrategy(
        mockClient,
        mockThreadParser,
        mockPaginator,
        mockThreadRepo,
        mockMessageRepo
      );

      await strategy.incrementalSync(mockAccount, mockConnection);

      // Verify that findByThreadId was called
      expect(mockThreadRepo.findByThreadId).toHaveBeenCalledWith("acc-airbnb-123", "airbnb", "thread-abc");
      
      // Verify that fetchThreadMessages was NOT triggered (skipped detail fetch)
      expect(mockClient.execute).toHaveBeenCalledTimes(1); // Only ViaductInboxData
      expect(mockThreadParser.extractAllMessages).not.toHaveBeenCalled();
      
      // Verify metadata lastSyncedAt was updated
      expect(mockThreadRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: "thread-abc",
          syncStatus: "synced",
          lastMessageId: "msg-last-123",
        })
      );
    });

    it("should trigger details fetch if thread metadata is changed", async () => {
      mockClient.execute
        // Inbox query
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            data: {
              presentation: {
                inbox: {
                  threads: [
                    {
                      id: "thread-abc",
                      messages: {
                        edges: [
                          {
                            node: {
                              id: "msg-new-456",
                              createdAtMs: 1782506751566,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        })
        // Detail messages query
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            data: {
              presentation: {
                thread: {},
              },
            },
          },
        });

      mockPaginator.detect.mockReturnValue({ hasNextPage: false });

      mockThreadParser.parse.mockReturnValue({
        threadId: "thread-abc",
        guestName: "Guest User",
      });

      // Local metadata exists but has an older lastMessageId
      mockThreadRepo.findByThreadId.mockResolvedValueOnce({
        syncStatus: "synced",
        lastMessageId: "msg-last-123",
        lastMessageTimestamp: new Date(1782506741566),
      });

      mockThreadParser.extractAllMessages.mockReturnValue([
        { id: "msg-last-123", text: "Old", timestamp: new Date(1782506741566), isFromHost: false, rawData: {} },
        { id: "msg-new-456", text: "New", timestamp: new Date(1782506751566), isFromHost: true, rawData: {} },
      ]);

      const strategy = new AirbnbSyncStrategy(
        mockClient,
        mockThreadParser,
        mockPaginator,
        mockThreadRepo,
        mockMessageRepo
      );

      await strategy.incrementalSync(mockAccount, mockConnection);

      // Verify messages were fetched and saved
      expect(mockClient.execute).toHaveBeenCalledTimes(2); // ViaductInboxData + ViaductGetThreadAndDataQuery
      expect(mockMessageRepo.saveMessage).toHaveBeenCalledTimes(2);
      expect(mockThreadRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: "thread-abc",
          lastMessageId: "msg-new-456",
          messageCount: 2,
        })
      );
    });
  });

  describe("GathernSyncStrategy - Incremental Sync", () => {
    const mockAccount = {
      id: "acc-gathern-123",
      account_name: "Test Gathern Account",
      chat_auth_token: "token-123",
      platform_user_id: "user-456",
    };

    beforeEach(() => {
      // Mock global fetch
      global.fetch = vi.fn();
    });

    it("should skip detail fetch if Gathern last message matches local DB", async () => {
      const mockFetch = global.fetch as any;
      
      // Chats response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          contact_list: [
            {
              chat_uid: "chat-xyz",
              unit_id: 99,
              last_message: {
                id: "gmsg-789",
                created_at: "2026-06-27T01:00:00.000Z",
              },
            },
          ],
        }),
      });

      mockPaginator.detect.mockReturnValue({ hasNextPage: false });
      mockThreadParser.parse.mockReturnValue({
        threadId: "chat-xyz",
        guestName: "Guest User",
      });

      mockThreadRepo.findByThreadId.mockResolvedValueOnce({
        syncStatus: "synced",
        lastMessageId: "gmsg-789",
        lastMessageTimestamp: new Date("2026-06-27T01:00:00.000Z"),
      });

      const strategy = new GathernSyncStrategy(
        mockThreadParser,
        mockPaginator,
        mockThreadRepo,
        mockMessageRepo
      );

      await strategy.incrementalSync(mockAccount, mockConnection);

      // Verifies only one API call was made (list chats)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockThreadParser.extractAllMessages).not.toHaveBeenCalled();
      expect(mockThreadRepo.upsert).toHaveBeenCalled();
    });
  });
});
