import type { AttendanceStatusEntry, DerivedAttendanceStatus } from '@/utils/attendanceStatus'

export type MobileAttendanceStatusFixture = {
  id: string
  attendance: AttendanceStatusEntry
  now: Date
  expected: DerivedAttendanceStatus
}

export const attendanceStatusFixtures: MobileAttendanceStatusFixture[] = [
  {
    id: "previous-day-open-session",
    attendance: {
      checkIn: "2026-03-07T02:00:00.000Z",
    },
    now: new Date("2026-03-08T03:00:00.000Z"),
    expected: {
      status: "idle",
      checkInTime: null,
      checkOutTime: null,
      warningMessage: null,
    },
  },
  {
    id: "same-day-open-session",
    attendance: {
      checkIn: "2026-03-08T02:00:00.000Z",
    },
    now: new Date("2026-03-08T02:24:00.000Z"),
    expected: {
      status: "checked-in",
      checkInTime: "09:00",
      checkOutTime: null,
      warningMessage: null,
    },
  },
  {
    id: "overnight-shift-still-active",
    attendance: {
      checkIn: "2026-03-07T14:00:00.000Z",
      user: {
        workingHourMode: "SHIFT",
        shift: {
          startTime: "21:00",
          endTime: "04:00",
        },
      },
    },
    now: new Date("2026-03-07T19:24:00.000Z"),
    expected: {
      status: "checked-in",
      checkInTime: "21:00",
      checkOutTime: null,
      warningMessage: null,
    },
  },
  {
    id: "flexible-cross-day-active",
    attendance: {
      checkIn: "2026-03-07T15:00:00.000Z",
      user: {
        workingHourMode: "FLEXIBLE",
      },
    },
    now: new Date("2026-03-08T03:00:00.000Z"),
    expected: {
      status: "checked-in",
      checkInTime: "22:00",
      checkOutTime: null,
      warningMessage: null,
    },
  },
  {
    id: "stale-flexible-session",
    attendance: {
      checkIn: "2026-01-23T02:00:00.000Z",
      sessionMeta: {
        isStaleFlexibleSession: true,
      },
      user: {
        workingHourMode: "FLEXIBLE",
      },
    },
    now: new Date("2026-01-24T03:00:00.000Z"),
    expected: {
      status: "idle",
      checkInTime: null,
      checkOutTime: null,
      warningMessage: "Sesi fleksibel lama sejak 23/01/2026 09:00 belum checkout.",
    },
  },
  {
    id: "same-day-checked-out-session",
    attendance: {
      checkIn: "2026-03-08T02:00:00.000Z",
      checkOut: "2026-03-08T09:30:00.000Z",
    },
    now: new Date("2026-03-08T10:00:00.000Z"),
    expected: {
      status: "checked-out",
      checkInTime: "09:00",
      checkOutTime: "16:30",
      warningMessage: null,
    },
  },
]

export function getAttendanceStatusFixture(id: string) {
  return attendanceStatusFixtures.find((fixture) => fixture.id === id)
}
