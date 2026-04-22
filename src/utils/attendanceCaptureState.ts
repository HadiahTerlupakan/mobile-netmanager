export type AttendanceCaptureStatus = 'idle' | 'checked-in' | 'checked-out' | 'loading';

interface AttendanceCaptureStateInput {
  status: AttendanceCaptureStatus;
  isHoliday: boolean;
  isOffDay: boolean;
  isTukarLiburWorkDay?: boolean;
}

export function getAttendanceCaptureState({ status, isHoliday, isOffDay }: AttendanceCaptureStateInput) {
  const hasActiveSession = status === 'checked-in';
  const isBlockedDay = isHoliday || isOffDay;
  const disabled = status === 'checked-out' || (!hasActiveSession && isBlockedDay);

  return {
    disabled,
    hasActiveSession,
    isBlockedDay,
  };
}
