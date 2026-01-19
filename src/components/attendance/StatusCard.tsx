/**
 * Attendance Status Card
 * Displays current attendance status and action button
 */

import { LogIn, LogOut, RefreshCw } from 'lucide-react-native'
import React from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import tw from 'twrnc'
import { AttendanceStatus } from './types'

interface StatusCardProps {
    status: AttendanceStatus
    isLoading: boolean
    hasPhoto: boolean
    hasLocation: boolean
    onSubmit: () => void
    disabled?: boolean
}

export function StatusCard({
    status,
    isLoading,
    hasPhoto,
    hasLocation,
    onSubmit,
    disabled = false
}: StatusCardProps) {
    const isReady = hasPhoto && hasLocation
    const canSubmit = isReady && !isLoading && !disabled

    const getButtonConfig = () => {
        if (status === 'loading') {
            return {
                icon: RefreshCw,
                text: 'Memuat...',
                color: 'bg-gray-400',
                disabled: true
            }
        }

        if (status === 'idle') {
            return {
                icon: LogIn,
                text: 'Check In',
                color: canSubmit ? 'bg-green-500' : 'bg-gray-400',
                disabled: !canSubmit
            }
        }

        return {
            icon: LogOut,
            text: 'Check Out',
            color: canSubmit ? 'bg-red-500' : 'bg-gray-400',
            disabled: !canSubmit
        }
    }

    const config = getButtonConfig()
    const Icon = config.icon

    return (
        <View style={tw`p-4`}>
            {/* Status Indicators */}
            <View style={tw`flex-row justify-center gap-4 mb-4`}>
                <View style={tw`items-center`}>
                    <View style={tw`w-3 h-3 rounded-full ${hasPhoto ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <Text style={tw`text-xs text-gray-500 mt-1`}>Foto</Text>
                </View>
                <View style={tw`items-center`}>
                    <View style={tw`w-3 h-3 rounded-full ${hasLocation ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <Text style={tw`text-xs text-gray-500 mt-1`}>Lokasi</Text>
                </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={tw`${config.color} py-4 px-8 rounded-xl flex-row items-center justify-center gap-2 ${config.disabled ? 'opacity-50' : ''}`}
                onPress={onSubmit}
                disabled={config.disabled}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" size="small" />
                ) : (
                    <Icon size={24} color="white" />
                )}
                <Text style={tw`text-white font-bold text-lg`}>
                    {config.text}
                </Text>
            </TouchableOpacity>

            {/* Hint Text */}
            {!isReady && (
                <Text style={tw`text-center text-gray-500 text-xs mt-2`}>
                    {!hasPhoto && 'Ambil foto terlebih dahulu'}
                    {hasPhoto && !hasLocation && 'Mendapatkan lokasi...'}
                </Text>
            )}
        </View>
    )
}

export default StatusCard
