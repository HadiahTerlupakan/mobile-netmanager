/**
 * Camera Watermark Overlay
 * Displays timestamp, location, and geofence status on photo
 */

import { AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'
import tw from 'twrnc'
import { GeofenceStatus } from './types'

interface WatermarkOverlayProps {
    locationName: string
    geofenceStatus: GeofenceStatus | null
    currentTime: Date
}

export function WatermarkOverlay({
    locationName,
    geofenceStatus,
    currentTime
}: WatermarkOverlayProps) {
    const formattedDate = currentTime.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    const formattedTime = currentTime.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })

    return (
        <View style={tw`absolute bottom-0 left-0 right-0 bg-black/50 p-3`}>
            {/* Location */}
            <View style={tw`flex-row items-center gap-2 mb-1`}>
                <MapPin size={14} color="#fff" />
                <Text style={tw`text-white text-xs flex-1`} numberOfLines={1}>
                    {locationName || 'Mendapatkan lokasi...'}
                </Text>
            </View>

            {/* Date & Time */}
            <View style={tw`flex-row items-center gap-2 mb-1`}>
                <Clock size={14} color="#fff" />
                <Text style={tw`text-white text-xs`}>
                    {formattedDate} • {formattedTime}
                </Text>
            </View>

            {/* Geofence Status */}
            {geofenceStatus && (
                <View style={tw`flex-row items-center gap-2`}>
                    {geofenceStatus.isInside ? (
                        <>
                            <CheckCircle size={14} color="#22c55e" />
                            <Text style={tw`text-green-400 text-xs`}>
                                Dalam area: {geofenceStatus.siteName}
                            </Text>
                        </>
                    ) : (
                        <>
                            <AlertTriangle size={14} color="#f97316" />
                            <Text style={tw`text-orange-400 text-xs`}>
                                Luar area: {geofenceStatus.distance}m dari {geofenceStatus.siteName}
                            </Text>
                        </>
                    )}
                </View>
            )}
        </View>
    )
}

export default WatermarkOverlay
