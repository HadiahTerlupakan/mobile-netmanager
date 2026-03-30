import { queryKeys } from '@/lib/queryClient';

describe('queryKeys.attendance.status', () => {
  it('scopes attendance status queries per user', () => {
    expect(queryKeys.attendance.status('user-1')).toEqual([
      'attendance',
      'status',
      'user-1',
    ]);
    expect(queryKeys.attendance.status('user-2')).toEqual([
      'attendance',
      'status',
      'user-2',
    ]);
    expect(queryKeys.attendance.status('user-1')).not.toEqual(
      queryKeys.attendance.status('user-2')
    );
  });

  it('keeps anonymous attendance status distinct from authenticated users', () => {
    expect(queryKeys.attendance.status()).toEqual([
      'attendance',
      'status',
      'anonymous',
    ]);
    expect(queryKeys.attendance.status()).not.toEqual(
      queryKeys.attendance.status('user-1')
    );
  });
});

describe('queryKeys.attendance other scopes', () => {
  it('scopes attendance geofence per user', () => {
    expect(queryKeys.attendance.geofence('user-1')).toEqual([
      'attendance',
      'geofence',
      'user-1',
    ]);
    expect(queryKeys.attendance.geofence('user-2')).toEqual([
      'attendance',
      'geofence',
      'user-2',
    ]);
    expect(queryKeys.attendance.geofence('user-1')).not.toEqual(
      queryKeys.attendance.geofence('user-2')
    );
  });

  it('scopes attendance today and history per user', () => {
    expect(queryKeys.attendance.today('user-1')).toEqual([
      'attendance',
      'today',
      'user-1',
    ]);
    expect(queryKeys.attendance.history('user-1')).toEqual([
      'attendance',
      'history',
      'user-1',
    ]);
    expect(queryKeys.attendance.today('user-1')).not.toEqual(
      queryKeys.attendance.today('user-2')
    );
    expect(queryKeys.attendance.history('user-1')).not.toEqual(
      queryKeys.attendance.history('user-2')
    );
  });

  it('keeps anonymous geofence distinct from authenticated users', () => {
    expect(queryKeys.attendance.geofence()).toEqual([
      'attendance',
      'geofence',
      'anonymous',
    ]);
    expect(queryKeys.attendance.today()).toEqual([
      'attendance',
      'today',
      'anonymous',
    ]);
    expect(queryKeys.attendance.history()).toEqual([
      'attendance',
      'history',
      'anonymous',
    ]);
  });
});
