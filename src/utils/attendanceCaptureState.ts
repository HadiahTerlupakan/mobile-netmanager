export type AttendanceCaptureStatus = 'idle' | 'checked-in' | 'checked-out' | 'loading';

interface AttendanceCaptureStateInput {
  status: AttendanceCaptureStatus;
  isHoliday: boolean;
  isOffDay: boolean;
  isTukarLiburWorkDay?: boolean;
}

export function getAttendanceCaptureState({ status, isHoliday, isOffDay, isTukarLiburWorkDay = false }: AttendanceCaptureStateInput) {
  const hasActiveSession = status === 'checked-in';
  // Hari yang seharusnya libur tetap bisa diabsen jika user dijadwalkan masuk ganti libur (tukar libur).
  const isBlockedDay = (isHoliday || isOffDay) && !isTukarLiburWorkDay;
  const disabled = status === 'checked-out' || (!hasActiveSession && isBlockedDay);

  return {
    disabled,
    hasActiveSession,
    isBlockedDay,
  };
}
