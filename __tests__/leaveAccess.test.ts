import { isRouteAllowedDuringLeave } from '../src/utils/leaveAccess'

describe('isRouteAllowedDuringLeave', () => {
  it('allows dashboard and chat related routes', () => {
    expect(isRouteAllowedDuringLeave('/dashboard')).toBe(true)
    expect(isRouteAllowedDuringLeave('/chat')).toBe(true)
    expect(isRouteAllowedDuringLeave('/chat/123')).toBe(true)
  })

  it('allows notification inbox and leave history routes', () => {
    expect(isRouteAllowedDuringLeave('/notifications')).toBe(true)
    expect(isRouteAllowedDuringLeave('/izin')).toBe(true)
    expect(isRouteAllowedDuringLeave('/izin/form')).toBe(true)
  })

  it('allows signing endorsement documents during leave', () => {
    expect(isRouteAllowedDuringLeave('/pengesahan')).toBe(true)
    expect(isRouteAllowedDuringLeave('/pengesahan/doc-1')).toBe(true)
    expect(isRouteAllowedDuringLeave('/pengesahan/tanda-tangan/doc-1')).toBe(true)
  })

  it('blocks unrelated feature routes during leave mode', () => {
    expect(isRouteAllowedDuringLeave('/work-order')).toBe(false)
    expect(isRouteAllowedDuringLeave('/barang')).toBe(false)
    expect(isRouteAllowedDuringLeave('/absensi')).toBe(false)
    expect(isRouteAllowedDuringLeave('/lembur')).toBe(false)
  })
})
