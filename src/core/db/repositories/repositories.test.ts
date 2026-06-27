import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThreadMetadataRepository } from "./ThreadMetadataRepository";
import { MessageRepository } from "./MessageRepository";
import { IThreadMetadata } from "../../interfaces/ISyncEngine";

describe("Repositories Unit Tests", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
    };
  });

  describe("ThreadMetadataRepository", () => {
    it("findByThreadId should return parsed object if found", async () => {
      const repo = new ThreadMetadataRepository(mockDb);
      mockDb.execute.mockResolvedValueOnce([
        [
          {
            id: "test-id",
            browser_account_id: "acc-1",
            platform: "airbnb",
            thread_id: "thread-abc",
            guest_name: "John Doe",
            message_count: 5,
            sync_status: "synced",
            last_message_timestamp: "2026-06-27 00:00:00",
            last_synced_at: "2026-06-27 01:00:00",
          },
        ],
      ]);

      const result = await repo.findByThreadId("acc-1", "airbnb", "thread-abc");

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM platform_thread_metadata"),
        ["acc-1", "airbnb", "thread-abc"]
      );
      expect(result).not.toBeNull();
      expect(result?.guestName).toBe("John Doe");
      expect(result?.messageCount).toBe(5);
      expect(result?.syncStatus).toBe("synced");
      expect(result?.lastMessageTimestamp).toBeInstanceOf(Date);
      expect(result?.lastSyncedAt).toBeInstanceOf(Date);
    });

    it("findByThreadId should return null if not found", async () => {
      const repo = new ThreadMetadataRepository(mockDb);
      mockDb.execute.mockResolvedValueOnce([[]]);

      const result = await repo.findByThreadId("acc-1", "airbnb", "thread-abc");

      expect(result).toBeNull();
    });

    it("upsert should execute correct INSERT statement", async () => {
      const repo = new ThreadMetadataRepository(mockDb);
      const metadata: IThreadMetadata = {
        id: "test-id",
        browserAccountId: "acc-1",
        platform: "airbnb",
        threadId: "thread-abc",
        guestName: "John Doe",
        messageCount: 5,
        syncStatus: "synced",
        lastMessageId: "msg-123",
        lastMessageTimestamp: new Date("2026-06-27T00:00:00.000Z"),
        serverUpdatedAt: new Date("2026-06-27T01:00:00.000Z"),
        lastSyncedAt: new Date("2026-06-27T02:00:00.000Z"),
        metadataJson: "{}",
      };

      await repo.upsert(metadata);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO platform_thread_metadata"),
        [
          "test-id",
          "acc-1",
          "airbnb",
          "thread-abc",
          "John Doe",
          null, // unitId
          null, // chaletId
          null, // reservationId
          "msg-123",
          expect.any(Date), // lastMessageTimestamp
          5,
          expect.any(Date), // serverUpdatedAt
          null, // etag
          null, // threadVersion
          expect.any(Date), // lastSyncedAt
          "synced",
          null, // lastError
          "{}",
        ]
      );
    });
  });

  describe("MessageRepository", () => {
    it("saveMessage should execute INSERT INTO platform_messages", async () => {
      const repo = new MessageRepository(mockDb);
      mockDb.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await repo.saveMessage({
        accountId: 1,
        platformAccountId: "platform-123",
        platform: "airbnb",
        threadId: "thread-abc",
        msgId: "msg-456",
        guestName: "John Doe",
        text: "Hello",
        isFromMe: 0,
        sentAt: new Date("2026-06-27T00:00:00.000Z"),
        rawData: "{}",
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO platform_messages"),
        [
          expect.any(String), // generated id
          1,
          "platform-123",
          "airbnb",
          "thread-abc",
          "msg-456",
          "John Doe",
          "Hello",
          0,
          expect.any(Date),
          "{}",
        ]
      );
      expect(result).toBe(true);
    });

    it("messageExists should query platform_messages and return true if exists", async () => {
      const repo = new MessageRepository(mockDb);
      mockDb.execute.mockResolvedValueOnce([[{ "1": 1 }]]);

      const exists = await repo.messageExists("airbnb", "thread-abc", "msg-456");

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT 1 FROM platform_messages"),
        ["airbnb", "thread-abc", "msg-456"]
      );
      expect(exists).toBe(true);
    });
  });
});
