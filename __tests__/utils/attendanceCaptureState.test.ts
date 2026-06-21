import { getAttendanceCaptureState } from '@/utils/attendanceCaptureState';

describe('getAttendanceCaptureState', () => {
  it('blocks fresh check-in on holidays and off-days', () => {
    expect(getAttendanceCaptureState({ status: 'idle', isHoliday: true, isOffDay: false })).toEqual({
      disabled: true,
      hasActiveSession: false,
      isBlockedDay: true,
    });

    expect(getAttendanceCaptureState({ status: 'idle', isHoliday: false, isOffDay: true })).toEqual({
      disabled: true,
      hasActiveSession: false,
      isBlockedDay: true,
    });
  });

  it('keeps checkout available for an active session even on a blocked day', () => {
    expect(getAttendanceCaptureState({ status: 'checked-in', isHoliday: true, isOffDay: false })).toEqual({
      disabled: false,
      hasActiveSession: true,
      isBlockedDay: true,
    });

    expect(getAttendanceCaptureState({ status: 'checked-in', isHoliday: false, isOffDay: true })).toEqual({
      disabled: false,
      hasActiveSession: true,
      isBlockedDay: true,
    });
  });

  it('allows fresh check-in on tukar libur work days even when the calendar is a holiday', () => {
    expect(getAttendanceCaptureState({
      status: 'idle',
      isHoliday: true,
      isOffDay: false,
      isTukarLiburWorkDay: true,
    })).toEqual({
      disabled: false,
      hasActiveSession: false,
      isBlockedDay: false,
    });
  });

  it('allows fresh check-in on tukar libur work days that fall on an off-day', () => {
    expect(getAttendanceCaptureState({
      status: 'idle',
      isHoliday: false,
      isOffDay: true,
      isTukarLiburWorkDay: true,
    })).toEqual({
      disabled: false,
      hasActiveSession: false,
      isBlockedDay: false,
    });
  });

  it('still blocks finished sessions', () => {
    expect(getAttendanceCaptureState({ status: 'checked-out', isHoliday: false, isOffDay: false })).toEqual({
      disabled: true,
      hasActiveSession: false,
      isBlockedDay: false,
    });
  });
});
