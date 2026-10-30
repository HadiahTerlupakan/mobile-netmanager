import { Copy, Download } from 'lucide-react-native';
import React, { useRef } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import tw from 'twrnc';

const UKURAN_QR = 220;
const UKURAN_IKON_SALIN = 16;
/** gray-600 */
const WARNA_IKON_SALIN = '#4b5563';
const JENIS_MINIMARKET = 'RETAIL';
/** teal-700 */
const WARNA_AKSI = '#0f766e';

/** Bagian dari ref `react-native-qrcode-svg` yang dipakai: PNG base64 tanpa prefiks data URL. */
interface RefQr {
  toDataURL: (selesai: (base64: string) => void) => void;
}

interface KartuMenungguGatewayProps {
  nominal: string;
  nomorVa?: string | null;
  stringQris?: string | null;
  namaMetode?: string;
  jenisMetode?: string;
  urlBayar?: string | null;
  isMengecekStatus: boolean;
  onSalin: (teks: string, label: string) => void;
  onSimpanQris: (base64Png: string) => void;
  onCekStatus: () => void;
  onBukaHalamanBayar: () => void;
  onGantiMetode: () => void;
}

interface InstruksiQrisProps {
  nominal: string;
  stringQris: string;
  onSimpanQris: (base64Png: string) => void;
}

function InstruksiQris({ nominal, stringQris, onSimpanQris }: InstruksiQrisProps) {
  const refQr = useRef<RefQr | null>(null);
  return (
    <View style={tw`items-center`}>
      <Text style={tw`text-xs text-gray-500 mb-3 font-medium`}>Scan QRIS dengan aplikasi bank atau e-wallet</Text>
      {/* QR tetap di atas putih agar terbaca kamera. */}
      <View style={tw`bg-white p-2 rounded-lg`}>
        <QRCode value={stringQris} size={UKURAN_QR} getRef={(ref: RefQr | null) => (refQr.current = ref)} />
      </View>
      <Text style={tw`font-bold text-teal-600 text-2xl mt-3`}>{nominal}</Text>
      {/* HP yang menampilkan QR tidak bisa memindainya sendiri; aplikasi e-wallet bisa membaca QR dari galeri. */}
      <TouchableOpacity
        onPress={() => refQr.current?.toDataURL(onSimpanQris)}
        style={tw`flex-row items-center mt-2 px-3 py-2`}
      >
        <Download size={UKURAN_IKON_SALIN} color={WARNA_AKSI} />
        <Text style={tw`text-teal-700 font-bold text-sm ml-1.5`}>Simpan QRIS ke Galeri</Text>
      </TouchableOpacity>
    </View>
  );
}

interface InstruksiKodeProps {
  nominal: string;
  nomorVa: string;
  namaMetode?: string;
  jenisMetode?: string;
  onSalin: (teks: string, label: string) => void;
}

function InstruksiKode({ nominal, nomorVa, namaMetode, jenisMetode, onSalin }: InstruksiKodeProps) {
  const isMinimarket = jenisMetode === JENIS_MINIMARKET;
  const label = isMinimarket ? 'Kode Pembayaran' : 'Nomor Virtual Account';
  return (
    <View>
      <Text style={tw`text-xs text-gray-500 mb-1 font-medium`}>{namaMetode ? `${label} ${namaMetode}` : label}</Text>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={tw`flex-1 text-xl font-bold tracking-widest text-gray-900`}>{nomorVa}</Text>
        <TouchableOpacity
          accessibilityLabel={`Salin ${label}`}
          onPress={() => onSalin(nomorVa, label)}
          style={tw`p-2 bg-gray-100 rounded-md`}
        >
          <Copy size={UKURAN_IKON_SALIN} color={WARNA_IKON_SALIN} />
        </TouchableOpacity>
      </View>
      <View style={tw`border-t border-dashed border-gray-200 pt-2`}>
        <Text style={tw`text-xs text-gray-500 mb-1 font-medium`}>Nominal yang harus dibayar (tepat):</Text>
        <Text style={tw`font-bold text-teal-600 text-2xl`}>{nominal}</Text>
      </View>
      <Text style={tw`text-xs text-gray-500 mt-3`}>
        {isMinimarket
          ? 'Tunjukkan kode ini ke kasir Alfamart atau Indomaret.'
          : 'Bayar lewat m-banking, internet banking, atau ATM: pilih transfer ke Virtual Account, masukkan nomor di atas, lalu periksa nama dan nominalnya sebelum konfirmasi.'}
      </Text>
    </View>
  );
}

/**
 * Checkout gateway yang menunggu dibayar, sama dengan portal pelanggan: nomor
 * VA atau QRIS ditampilkan di aplikasi; halaman gateway hanya untuk metode
 * tanpa instruksi (kartu kredit, e-wallet yang meminta login).
 */
export function KartuMenungguGateway(props: KartuMenungguGatewayProps) {
  const { nominal, nomorVa, stringQris, urlBayar } = props;
  return (
    <View>
      {stringQris ? (
        <InstruksiQris nominal={nominal} stringQris={stringQris} onSimpanQris={props.onSimpanQris} />
      ) : nomorVa ? (
        <InstruksiKode {...props} nomorVa={nomorVa} />
      ) : (
        <View style={tw`items-center py-2`}>
          <Text style={tw`text-xs text-gray-500 mb-1 font-medium`}>Total Pembayaran</Text>
          <Text style={tw`font-bold text-teal-600 text-2xl`}>{nominal}</Text>
        </View>
      )}
      {urlBayar && !stringQris && !nomorVa && (
        <TouchableOpacity onPress={props.onBukaHalamanBayar} style={tw`bg-teal-600 mt-4 py-3 rounded-xl items-center`}>
          <Text style={tw`text-white font-bold`}>Lanjutkan ke Halaman Pembayaran</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        accessibilityLabel="Saya Sudah Bayar, Cek Status"
        accessibilityState={{ disabled: props.isMengecekStatus, busy: props.isMengecekStatus }}
        disabled={props.isMengecekStatus}
        onPress={props.onCekStatus}
        style={tw`bg-teal-600 mt-4 py-3 rounded-xl items-center ${props.isMengecekStatus ? 'opacity-70' : ''}`}
      >
        {props.isMengecekStatus ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={tw`text-white font-bold`}>Saya Sudah Bayar, Cek Status</Text>
        )}
      </TouchableOpacity>
      {/* VA yang belum dibayar bisa diganti QRIS dan sebaliknya; backend menutup checkout lama. */}
      <TouchableOpacity onPress={props.onGantiMetode} style={tw`border border-teal-600 mt-3 py-3 rounded-xl items-center`}>
        <Text style={tw`text-teal-700 font-bold`}>Ganti Metode Pembayaran</Text>
      </TouchableOpacity>
    </View>
  );
}
