import { AttendanceTelemetryService } from "@/services/AttendanceTelemetryService";
import { logger } from "@/utils/logger";

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe("AttendanceTelemetryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs structured telemetry event with requestId", () => {
    AttendanceTelemetryService.track("attendance_submit_started", {
      requestId: "att-111-abc123",
      userId: "user-1",
      networkState: "online",
      queueDepth: 2,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "[AttendanceTelemetry]",
      expect.objectContaining({
        event: "attendance_submit_started",
        requestId: "att-111-abc123",
        userId: "user-1",
        networkState: "online",
        queueDepth: 2,
      }),
    );
  });
});
