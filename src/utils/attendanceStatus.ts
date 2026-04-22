import { formatDate, isSameDay, isValidDate } from "@/utils/date";

export type AttendanceUiStatus = "idle" | "checked-in" | "checked-out";

export interface AttendanceStatusEntry {
  checkIn: string;
  checkOut?: string | null;
  warningMessage?: string | null;
  canonical?: {
    finalStatus?: string | null;
    reviewState?: "FINAL" | "PENDING_REVIEW" | null;
    warningMessage?: string | null;
  } | null;
  sessionMeta?: {
    isStaleFlexibleSession?: boolean;
  } | null;
  user?: {
    workingHourMode?: "FIXED" | "SHIFT" | "FLEXIBLE" | null;
    shift?: {
      startTime: string;
      endTime: string;
    } | null;
  } | null;
}

export interface DerivedAttendanceStatus {
  status: AttendanceUiStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  warningMessage: string | null;
}

const IDLE_ATTENDANCE_STATUS: DerivedAttendanceStatus = {
  status: "idle",
  checkInTime: null,
  checkOutTime: null,
  warningMessage: null,
};

const PENDING_REVIEW_WARNING_MESSAGE = "Status absensi ini masih menunggu review.";

function getCanonicalWarningMessage(attendance: AttendanceStatusEntry): string | null {
  if (attendance.canonical?.warningMessage) {
    return attendance.canonical.warningMessage;
  }

  if (attendance.canonical?.reviewState === "PENDING_REVIEW") {
    return PENDING_REVIEW_WARNING_MESSAGE;
  }

  return attendance.warningMessage ?? null;
}

function isOvernightShiftSessionActive(attendance: AttendanceStatusEntry, now: Date): boolean {
  if (attendance.user?.workingHourMode !== "SHIFT" || !attendance.user.shift || attendance.checkOut) {
    return false;
  }

  const [startHour = 0] = attendance.user.shift.startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = attendance.user.shift.endTime.split(":").map(Number);
  const isOvernightShift = endHour < startHour;

  if (!isOvernightShift) {
    return false;
  }

  const checkInDate = new Date(attendance.checkIn);
  const shiftEnd = new Date(checkInDate);
  shiftEnd.setDate(shiftEnd.getDate() + 1);
  shiftEnd.setHours(endHour, endMinute, 0, 0);

  return now <= shiftEnd;
}

function isFlexibleSessionActive(attendance: AttendanceStatusEntry): boolean {
  return attendance.user?.workingHourMode === "FLEXIBLE" && !attendance.checkOut;
}

function isStaleFlexibleSession(attendance: AttendanceStatusEntry): boolean {
  return attendance.sessionMeta?.isStaleFlexibleSession === true;
}

export function deriveAttendanceStatus(
  attendance: AttendanceStatusEntry | null | undefined,
  now: Date = new Date(),
): DerivedAttendanceStatus {
  if (!attendance?.checkIn || !isValidDate(attendance.checkIn)) {
    return IDLE_ATTENDANCE_STATUS;
  }

  const warningMessage = getCanonicalWarningMessage(attendance);

  if (isStaleFlexibleSession(attendance)) {
    return {
      status: "idle",
      checkInTime: null,
      checkOutTime: null,
      warningMessage:
        warningMessage
        ?? `Sesi fleksibel lama sejak ${formatDate(attendance.checkIn, "dd/MM/yyyy HH:mm")} belum checkout.`,
    };
  }

  if (
    !isSameDay(attendance.checkIn, now)
    && !isOvernightShiftSessionActive(attendance, now)
    && !isFlexibleSessionActive(attendance)
  ) {
    return IDLE_ATTENDANCE_STATUS;
  }

  if (!attendance.checkOut) {
    return {
      status: "checked-in",
      checkInTime: formatDate(attendance.checkIn, "HH:mm"),
      checkOutTime: null,
      warningMessage,
    };
  }

  return {
    status: "checked-out",
    checkInTime: formatDate(attendance.checkIn, "HH:mm"),
    checkOutTime: formatDate(attendance.checkOut, "HH:mm"),
    warningMessage,
  };
}
