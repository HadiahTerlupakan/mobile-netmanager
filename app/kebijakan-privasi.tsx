import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white`}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={tw`p-2 -ml-2 rounded-full active:bg-gray-100`}
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 flex-1 text-center mr-8`}>
                    Kebijakan Privasi
                </Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-6 pb-12`}>
                <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>
                    Kebijakan Privasi
                </Text>
                <Text style={tw`text-sm text-gray-500 mb-6`}>
                    Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-base text-gray-700 leading-relaxed`}>
                        Aplikasi NetManager (&quot;Aplikasi&quot;) dibangun dan dioperasikan oleh SBL NET (PT Surya Bintang Langit). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda saat menggunakan Aplikasi kami.
                    </Text>
                </View>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>
                        1. Informasi yang Kami Kumpulkan
                    </Text>
                    <Text style={tw`text-base text-gray-700 leading-relaxed mb-2`}>
                        Saat mendaftar dan menggunakan Aplikasi, kami dapat mengumpulkan informasi pribadi yang dapat mengidentifikasi Anda secara langsung maupun tidak langsung, termasuk namun tidak terbatas pada:
                    </Text>
                    <View style={tw`pl-4`}>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}>• Nama lengkap dan nama pengguna (username)</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}>• Alamat email dan nomor telepon</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}>• Data biometrik (sidik jari/pengenalan wajah, jika diaktifkan untuk login instan)</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}>• Data lokasi (GPS) yang digunakan eksklusif untuk fitur presensi (absensi) dan pelacakan work order.</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}>• Foto dan gambar (diambil dari kamera) untuk keperluan absensi, laporan work order, dan pengajuan reimbursement.</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}>• Informasi teknis terkait jenis perangkat, sistem operasi, dan log aktivitas Aplikasi (untuk keperluan troubleshooting dan perbaikan bug).</Text>
                    </View>
                </View>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>
                        2. Izin Perangkat (Permissions)
                    </Text>
                    <Text style={tw`text-base text-gray-700 leading-relaxed mb-2`}>
                        Agar dapat berfungsi dengan baik, Aplikasi memerlukan beberapa izin akses ke fitur perangkat Anda:
                    </Text>
                    <View style={tw`pl-4`}>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}><Text style={tw`font-bold`}>• Kamera:</Text> Digunakan untuk mengambil foto wajah saat absensi, mendokumentasikan hasil pekerjaan (work order), serta mengunggah bukti pengeluaran (reimbursement).</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}><Text style={tw`font-bold`}>• Lokasi:</Text> Digunakan untuk memverifikasi lokasi saat Anda melakukan absensi masuk/pulang, serta mencatat status lokasi penyelesaian work order di lapangan.</Text>
                        <Text style={tw`text-base text-gray-700 leading-relaxed`}><Text style={tw`font-bold`}>• Penyimpanan (Storage):</Text> Digunakan untuk menyimpan file yang diunduh (misalnya struk gaji) dan mengakses galeri bila Anda memilih mengunggah foto dari penyimpanan perangkat.</Text>
                    </View>
                </View>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>
                        3. Penggunaan Informasi
                    </Text>
                    <Text style={tw`text-base text-gray-700 leading-relaxed`}>
                        Informasi yang kami kumpulkan digunakan semata-mata untuk mengelola kehadiran staf (absensi), melacak penugasan (work order), mengelola insentif dan reimbursement, serta meningkatkan keamanan Aplikasi dan infrastruktur layanan kami. Kami tidak pernah menjual atau membagikan data kepada pihak ketiga yang tidak berkepentingan tanpa dasar hukum yang jelas.
                    </Text>
                </View>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>
                        4. Keamanan Data
                    </Text>
                    <Text style={tw`text-base text-gray-700 leading-relaxed`}>
                        Kami menerapkan langkah-langkah keamanan teknis dan administratif yang kuat untuk melindungi data Anda dari akses, pengubahan, pengungkapan, atau penghancuran tanpa izin. Semua data dikirimkan melalui protokol terenkripsi yang aman.
                    </Text>
                </View>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>
                        5. Hubungi Kami
                    </Text>
                    <Text style={tw`text-base text-gray-700 leading-relaxed`}>
                        Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, Anda dapat menghubungi tim administrator IT melalui admin@suryabintanglangit.com atau menu bantuan di Aplikasi.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
