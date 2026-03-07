export type AttendanceGeofencePolicy = 'STRICT' | 'WARN' | 'DISABLED';

export type AttendanceGeofenceAction = 'allow' | 'warn' | 'block';

export function resolveAttendanceGeofenceAction(
  policy: AttendanceGeofencePolicy,
  isInside: boolean,
): AttendanceGeofenceAction {
  if (isInside) {
    return 'allow';
  }

  if (policy === 'DISABLED') {
    return 'allow';
  }

  if (policy === 'STRICT') {
    return 'block';
  }

  return 'warn';
}
