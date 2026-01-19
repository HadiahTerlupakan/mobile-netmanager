/**
 * Attendance Types
 * Shared types for attendance module
 */

export interface GeofenceZone {
    siteId: string
    siteName: string
    latitude: number
    longitude: number
    radius: number
}

export interface GeofenceStatus {
    isInside: boolean
    distance: number
    siteName: string
}

export interface LocationData {
    coords: {
        latitude: number
        longitude: number
        accuracy: number | null
        altitude: number | null
        heading: number | null
        speed: number | null
    }
    timestamp: number
}

export interface AttendanceHistoryItem {
    id: string
    checkIn: string
    checkOut: string | null
    checkInPhoto: string | null
    checkOutPhoto: string | null
    status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'SICK' | 'PERMIT' | 'DAY_OFF'
    notes: string | null
}

export type AttendanceStatus = 'idle' | 'checked-in' | 'loading'
