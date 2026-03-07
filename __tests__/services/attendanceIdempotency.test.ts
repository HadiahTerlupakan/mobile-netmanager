import {
  buildAttendanceIdempotencyHeaders,
  createAttendanceRequestId,
  ensureAttendanceRequestId,
} from "@/utils/attendanceIdempotency";

describe("attendanceIdempotency", () => {
  it("creates stable attendance request id format", () => {
    const requestId = createAttendanceRequestId();

    expect(requestId).toMatch(/^att-\d+-[a-z0-9]{6}$/);
  });

  it("keeps provided requestId unchanged", () => {
    const payload = ensureAttendanceRequestId({ requestId: "att-existing-123" });

    expect(payload.requestId).toBe("att-existing-123");
  });

  it("adds requestId when payload has none", () => {
    const payload = ensureAttendanceRequestId({ photoUrl: "https://cdn/photo.jpg" });

    expect(payload.requestId).toMatch(/^att-\d+-[a-z0-9]{6}$/);
  });

  it("builds idempotency header when requestId exists", () => {
    const headers = buildAttendanceIdempotencyHeaders("att-111-abc123");

    expect(headers).toEqual({ "Idempotency-Key": "att-111-abc123" });
  });

  it("returns undefined headers when requestId missing", () => {
    const headers = buildAttendanceIdempotencyHeaders(undefined);

    expect(headers).toBeUndefined();
  });
});
