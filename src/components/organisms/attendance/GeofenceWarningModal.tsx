/**
 * Geofence Warning Modal
 * Shows when user is outside geofence zone
 */

import { AlertTriangle } from 'lucide-react-native'
import React from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import tw from 'twrnc'

interface GeofenceWarningModalProps {
    visible: boolean
    siteName: string
    distance: number
    onCancel: () => void
    onContinue: () => void
    loading?: boolean
    isMutating?: boolean
}

export function GeofenceWarningModal({
    visible,
    siteName,
    distance,
    onCancel,
    onContinue,
    loading = false,
    isMutating = false
}: GeofenceWarningModalProps) {
    const isDisabled = loading || isMutating

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                <View style={tw`bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl`}>
                    {/* Icon */}
                    <View style={tw`items-center mb-4`}>
                        <View style={tw`bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full`}>
                            <AlertTriangle size={40} color="#f97316" />
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={tw`text-xl font-bold text-center text-gray-800 dark:text-white mb-2`}>
                        Di Luar Area Kantor
                    </Text>

                    {/* Message */}
                    <Text style={tw`text-sm text-center text-gray-600 dark:text-gray-300 mb-4`}>
                        Anda berada {distance} meter dari {siteName}.{'\n'}
                        Absensi dapat tetap dilanjutkan, namun akan tercatat sebagai lokasi di luar area.
                    </Text>

                    {/* Buttons */}
                    <View style={tw`flex-row gap-3`}>
                        <TouchableOpacity
                            style={tw`flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl`}
                            onPress={onCancel}
                            disabled={isDisabled}
                        >
                            <Text style={tw`text-center font-semibold text-gray-700 dark:text-gray-300`}>
                                Batal
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={tw`flex-1 bg-orange-500 py-3 rounded-xl ${isDisabled ? 'opacity-50' : ''}`}
                            onPress={onContinue}
                            disabled={isDisabled}
                        >
                            <Text style={tw`text-center font-semibold text-white`}>
                                {isDisabled ? 'Memproses...' : 'Lanjutkan'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

export default GeofenceWarningModal
