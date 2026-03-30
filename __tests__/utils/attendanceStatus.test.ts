import { deriveAttendanceStatus } from "@/utils/attendanceStatus";
import { attendanceStatusFixtures, getAttendanceStatusFixture } from "../fixtures/attendance/crossSurfaceAttendanceFixtures";

const requiredFixtureIds = [
  "previous-day-open-session",
  "same-day-open-session",
  "same-day-checked-out-session",
  "overnight-shift-still-active",
  "flexible-cross-day-active",
  "stale-flexible-session",
] as const;

describe("attendance status fixtures", () => {
  it("defines the required shared attendance scenarios", () => {
    expect(attendanceStatusFixtures.map((fixture) => fixture.id)).toEqual(
      expect.arrayContaining(requiredFixtureIds)
    );
  });

  it.each(requiredFixtureIds)("derives mobile status from fixture %s", (fixtureId) => {
    const fixture = getAttendanceStatusFixture(fixtureId);

    expect(fixture).toBeDefined();
    expect(deriveAttendanceStatus(fixture!.attendance, fixture!.now)).toEqual(fixture!.expected);
  });
});

describe("deriveAttendanceStatus", () => {
  it("treats a stale open session from a previous day as idle", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-03-07T09:00:00.000Z",
      },
      new Date("2026-03-08T02:24:00.000Z"),
    );

    expect(result).toEqual({
      status: "idle",
      checkInTime: null,
      checkOutTime: null,
      warningMessage: null,
    });
  });

  it("keeps a same-day open session as checked in", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-03-08T02:00:00.000Z",
      },
      new Date("2026-03-08T02:24:00.000Z"),
    );

    expect(result).toEqual({
      status: "checked-in",
      checkInTime: "09:00",
      checkOutTime: null,
      warningMessage: null,
    });
  });

  it("keeps an overnight shift session active after midnight before shift end", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-03-07T14:00:00.000Z",
        user: {
          workingHourMode: "SHIFT",
          shift: {
            startTime: "21:00",
            endTime: "04:00",
          },
        },
      },
      new Date("2026-03-07T19:24:00.000Z"),
    );

    expect(result).toEqual({
      status: "checked-in",
      checkInTime: "21:00",
      checkOutTime: null,
      warningMessage: null,
    });
  });

  it("keeps a flexible open session active across days", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-03-07T15:00:00.000Z",
        user: {
          workingHourMode: "FLEXIBLE",
        },
      },
      new Date("2026-03-08T03:00:00.000Z"),
    );

    expect(result).toEqual({
      status: "checked-in",
      checkInTime: "22:00",
      checkOutTime: null,
      warningMessage: null,
    });
  });

  it("treats a stale flexible open session as idle when backend marks it stale", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-01-23T02:00:00.000Z",
        user: {
          workingHourMode: "FLEXIBLE",
        },
        sessionMeta: {
          isStaleFlexibleSession: true,
        },
      },
      new Date("2026-03-08T03:00:00.000Z"),
    );

    expect(result).toEqual({
      status: "idle",
      checkInTime: null,
      checkOutTime: null,
      warningMessage: "Sesi fleksibel lama sejak 23/01/2026 09:00 belum checkout.",
    });
  });

  it("keeps a same-day closed session as checked out", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-03-08T02:00:00.000Z",
        checkOut: "2026-03-08T09:30:00.000Z",
      },
      new Date("2026-03-08T10:00:00.000Z"),
    );

    expect(result).toEqual({
      status: "checked-out",
      checkInTime: "09:00",
      checkOutTime: "16:30",
      warningMessage: null,
    });
  });

  it("treats a previous-day closed session as idle", () => {
    const result = deriveAttendanceStatus(
      {
        checkIn: "2026-03-08T02:00:00.000Z",
        checkOut: "2026-03-08T09:30:00.000Z",
      },
      new Date("2026-03-09T02:24:00.000Z"),
    );

    expect(result).toEqual({
      status: "idle",
      checkInTime: null,
      checkOutTime: null,
      warningMessage: null,
    });
  });
});
