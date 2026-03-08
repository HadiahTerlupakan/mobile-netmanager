const leaveAllowedPrefixes = [
  '/dashboard',
  '/chat',
  '/notifications',
  '/izin',
]

export function isRouteAllowedDuringLeave(pathname?: string | null): boolean {
  if (!pathname) return true
  return leaveAllowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
