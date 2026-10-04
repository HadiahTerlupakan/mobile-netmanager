const leaveAllowedPrefixes = [
  '/dashboard',
  '/chat',
  '/notifications',
  '/izin',
  // Menandatangani surat tetap boleh selama cuti.
  '/pengesahan',
]

export function isRouteAllowedDuringLeave(pathname?: string | null): boolean {
  if (!pathname) return true
  return leaveAllowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
