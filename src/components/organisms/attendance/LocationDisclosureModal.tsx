/**
 * LocationDisclosureModal
 * Custom in-app prominent disclosure untuk background location permission.
 * Wajib ditampilkan SEBELUM request background location (Google Play policy).
 */

import { MapPin, ShieldCheck } from 'lucide-react-native'
import React from 'react'
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import tw from 'twrnc'

interface LocationDisclosureModalProps {
    visible: boolean
    onAccept: () => void
    onReject: () => void
}

export function LocationDisclosureModal({
    visible,
    onAccept,
    onReject,
}: LocationDisclosureModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onReject}
        >
            <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                <View style={tw`bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-xl max-h-[88%]`}>
                    <ScrollView contentContainerStyle={tw`p-6`} showsVerticalScrollIndicator={false}>
                        {/* Icon */}
                        <View style={tw`items-center mb-4`}>
                            <View style={tw`bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full`}>
                                <MapPin size={40} color="#2563eb" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={tw`text-xl font-bold text-center text-gray-800 dark:text-white mb-2`}>
                            Izin Akses Lokasi
                        </Text>

                        {/* Description — prominent disclosure (Google Play User Data policy) */}
                        <Text style={tw`text-sm text-gray-600 dark:text-gray-300 mb-3 leading-5`}>
                            RADPRO mengumpulkan data lokasi GPS Anda, termasuk di latar belakang
                            ketika aplikasi sedang ditutup atau tidak digunakan, untuk keperluan
                            berikut:
                        </Text>

                        {/* Purpose list */}
                        <View style={tw`mb-3`}>
                            <View style={tw`flex-row items-start mb-2`}>
                                <Text style={tw`text-blue-500 mr-2 mt-0.5`}>•</Text>
                                <Text style={tw`text-sm text-gray-600 dark:text-gray-300 flex-1`}>
                                    Verifikasi kehadiran di lokasi kerja saat check-in/check-out
                                </Text>
                            </View>
                            <View style={tw`flex-row items-start mb-2`}>
                                <Text style={tw`text-blue-500 mr-2 mt-0.5`}>•</Text>
                                <Text style={tw`text-sm text-gray-600 dark:text-gray-300 flex-1`}>
                                    Pelacakan lokasi di latar belakang selama jam kerja (setelah
                                    check-in hingga check-out) untuk laporan perjalanan ke supervisor
                                </Text>
                            </View>
                            <View style={tw`flex-row items-start mb-2`}>
                                <Text style={tw`text-blue-500 mr-2 mt-0.5`}>•</Text>
                                <Text style={tw`text-sm text-gray-600 dark:text-gray-300 flex-1`}>
                                    Penugasan work order ke teknisi terdekat
                                </Text>
                            </View>
                        </View>

                        {/* Background usage notice */}
                        <View style={tw`bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-3`}>
                            <Text style={tw`text-xs text-amber-800 dark:text-amber-200 leading-4`}>
                                Aplikasi ini akan terus mengumpulkan lokasi Anda meskipun sedang
                                ditutup atau tidak sedang dibuka. Sebuah notifikasi tetap akan
                                ditampilkan selama pelacakan berlangsung.
                            </Text>
                        </View>

                        {/* Data sharing info */}
                        <View style={tw`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4`}>
                            <View style={tw`flex-row items-center mb-1`}>
                                <ShieldCheck size={16} color="#16a34a" />
                                <Text style={tw`text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1`}>
                                    Privasi Data
                                </Text>
                            </View>
                            <Text style={tw`text-xs text-gray-500 dark:text-gray-400 leading-4`}>
                                Data lokasi hanya dikirim ke server RADPRO dan diakses oleh tim
                                manajemen perusahaan Anda. Pelacakan latar belakang otomatis berhenti
                                saat Anda check-out, dan Anda dapat mencabut izin ini kapan saja
                                melalui Pengaturan perangkat.
                            </Text>
                        </View>

                        {/* Buttons */}
                        <View style={tw`flex-row gap-3`}>
                            <TouchableOpacity
                                style={tw`flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl`}
                                onPress={onReject}
                            >
                                <Text style={tw`text-center font-semibold text-gray-700 dark:text-gray-300`}>
                                    Tolak
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={tw`flex-1 bg-blue-600 py-3 rounded-xl`}
                                onPress={onAccept}
                            >
                                <Text style={tw`text-center font-semibold text-white`}>
                                    Setuju
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

export default LocationDisclosureModal
