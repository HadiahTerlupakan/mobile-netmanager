import { resolveAttendanceGeofenceAction } from '@/utils/attendanceGeofencePolicy';

describe('attendanceGeofencePolicy', () => {
  it('allows attendance when user is inside geofence', () => {
    expect(resolveAttendanceGeofenceAction('STRICT', true)).toBe('allow');
    expect(resolveAttendanceGeofenceAction('WARN', true)).toBe('allow');
    expect(resolveAttendanceGeofenceAction('DISABLED', true)).toBe('allow');
  });

  it('blocks strict policy when user is outside geofence', () => {
    expect(resolveAttendanceGeofenceAction('STRICT', false)).toBe('block');
  });

  it('warns warn policy when user is outside geofence', () => {
    expect(resolveAttendanceGeofenceAction('WARN', false)).toBe('warn');
  });

  it('allows disabled policy when user is outside geofence', () => {
    expect(resolveAttendanceGeofenceAction('DISABLED', false)).toBe('allow');
  });
});
