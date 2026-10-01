import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTemaPersona } from '@/theme';

/** Jarak isi modal dari tepi atas setelah inset sistem. */
const JARAK_TEPI = 16;
/** Perluasan area sentuh tombol kecil di kepala modal. */
const PERLUASAN_SENTUH = { top: 12, bottom: 12, left: 12, right: 12 };
const UKURAN_IKON_KEMBALI = 22;
const WARNA_IKON_KEMBALI = '#111827';

interface BingkaiModalPenilaianProps {
  judul: string;
  onTutup: () => void;
  /** Bila diisi, tampil tombol kembali ke isi sebelumnya (rincian bertingkat). */
  onKembali?: () => void;
  children: React.ReactNode;
}

/**
 * Modal layar penuh rincian penilaian. Inset aman wajib: modal digambar
 * sampai ke bawah status bar (Android edge-to-edge). Isi boleh berupa
 * FlatList (bingkai tidak menggulung sendiri).
 */
export function BingkaiModalPenilaian({ judul, onTutup, onKembali, children }: BingkaiModalPenilaianProps) {
  const { tw } = useTemaPersona();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onKembali ?? onTutup}>
      <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top + JARAK_TEPI, paddingBottom: insets.bottom }]}>
        <View style={tw`flex-row items-center px-4 mb-3`}>
          {onKembali ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali ke tim" onPress={onKembali} hitSlop={PERLUASAN_SENTUH} style={tw`mr-2`}>
              <ChevronLeft size={UKURAN_IKON_KEMBALI} color={WARNA_IKON_KEMBALI} />
            </TouchableOpacity>
          ) : null}
          <Text style={tw`flex-1 text-lg font-bold text-gray-900 mr-2`} numberOfLines={1}>{judul}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={onTutup} hitSlop={PERLUASAN_SENTUH} style={tw`px-3 py-1.5 bg-utama-sangat-muda rounded-full`}>
            <Text style={tw`text-utama-kuat font-semibold`}>Tutup</Text>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}
