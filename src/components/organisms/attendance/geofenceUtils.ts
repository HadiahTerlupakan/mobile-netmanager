/**
 * Geofence Utilities
 * Extracted from absensi.tsx for reusability
 */

import { GeofenceStatus, GeofenceZone } from './types'
import { logger } from '@/utils/logger'
import { calculateDistance } from '@/utils/geo'

// Re-export agar konsumen lama tetap bisa `import { calculateDistance }` dari sini.
export { calculateDistance }

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
