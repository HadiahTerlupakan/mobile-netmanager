/**
 * Geofence Utilities
 * Extracted from absensi.tsx for reusability
 */

import { GeofenceStatus, GeofenceZone } from './types'
import { logger } from '@/utils/logger'

const EARTH_RADIUS_METERS = 6371000

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const toRad = (deg: number) => deg * (Math.PI / 180)
    
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return EARTH_RADIUS_METERS * c
}

/**
 * Check if user is inside any geofence zone
 */
export function checkGeofenceStatus(
    userLat: number,
    userLng: number,
    zones: GeofenceZone[]
): GeofenceStatus {
    if (!zones || zones.length === 0) {
        // No zones configured - allow check-in
        return {
            isInside: true,
            distance: 0,
            siteName: 'Default'
        }
    }
    
    let nearestDistance = Infinity
    let nearestSiteName = ''
    let isInside = false
    
    for (const zone of zones) {
        const distance = calculateDistance(
            userLat,
            userLng,
            zone.latitude,
            zone.longitude
        )
        
        if (__DEV__) {
            logger.info(`[Geofence] Distance to ${zone.siteName}: ${distance.toFixed(2)}m (radius: ${zone.radius}m)`)
        }
        
        if (distance < nearestDistance) {
            nearestDistance = distance
            nearestSiteName = zone.siteName
        }
        
        if (distance <= zone.radius) {
            isInside = true
        }
    }
    
    return {
        isInside,
        distance: Math.round(nearestDistance),
        siteName: nearestSiteName
    }
}
