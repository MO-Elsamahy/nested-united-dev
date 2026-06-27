import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncrementalSyncEngine } from "./IncrementalSyncEngine";

describe("IncrementalSyncEngine Tests", () => {
  let mockPool: any;
  let mockConnection: any;
  let mockStrategy: any;

  beforeEach(() => {
    mockConnection = {
      execute: vi.fn(),
      release: vi.fn(),
    };
    mockPool = {
      execute: vi.fn(),
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    };
    mockStrategy = {
      platform: "airbnb",
      initialSync: vi.fn(),
      incrementalSync: vi.fn(),
    };
  });

  it("should sync initial accounts if initial_sync_completed is 0", async () => {
    // 1. Mock database query returning active accounts
    mockPool.execute.mockResolvedValueOnce([
      [
        {
          id: "acc-1",
          platform: "airbnb",
          account_name: "Lullwah",
          initial_sync_completed: 0,
        },
      ],
    ]);

    const engine = new IncrementalSyncEngine(mockPool);
    engine.registerStrategy(mockStrategy);

    await engine.runSyncOnce();

    // Verify initialSync was called
    expect(mockStrategy.initialSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "acc-1" }),
      mockConnection
    );
    expect(mockStrategy.incrementalSync).not.toHaveBeenCalled();

    // Verify browser account status was updated to completed
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE browser_accounts SET initial_sync_completed = 1"),
      ["acc-1"]
    );
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it("should sync incrementally if initial_sync_completed is 1", async () => {
    mockPool.execute.mockResolvedValueOnce([
      [
        {
          id: "acc-2",
          platform: "airbnb",
          account_name: "The Nest",
          initial_sync_completed: 1,
        },
      ],
    ]);

    const engine = new IncrementalSyncEngine(mockPool);
    engine.registerStrategy(mockStrategy);

    await engine.runSyncOnce();

    expect(mockStrategy.incrementalSync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "acc-2" }),
      mockConnection
    );
    expect(mockStrategy.initialSync).not.toHaveBeenCalled();

    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE browser_accounts SET last_poll_at = NOW()"),
      ["acc-2"]
    );
  });

  it("should isolate errors so that one failed account does not abort others", async () => {
    mockPool.execute.mockResolvedValueOnce([
      [
        { id: "acc-fail", platform: "airbnb", account_name: "Failed Account", initial_sync_completed: 1 },
        { id: "acc-success", platform: "airbnb", account_name: "Success Account", initial_sync_completed: 1 },
      ],
    ]);

    // First call to incrementalSync throws error
    mockStrategy.incrementalSync
      .mockRejectedValueOnce(new Error("Network timeout on Airbnb API"))
      .mockResolvedValueOnce(undefined);

    const engine = new IncrementalSyncEngine(mockPool);
    engine.registerStrategy(mockStrategy);

    await engine.runSyncOnce();

    // Both accounts should have been processed
    expect(mockStrategy.incrementalSync).toHaveBeenCalledTimes(2);

    // Verify first account failures are saved to DB
    expect(mockPool.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE browser_accounts SET poll_error = ?"),
      ["Network timeout on Airbnb API", "acc-fail"]
    );

    // Verify second account completed successfully
    expect(mockConnection.execute).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE browser_accounts SET last_poll_at = NOW()"),
      ["acc-success"]
    );
  });
});
