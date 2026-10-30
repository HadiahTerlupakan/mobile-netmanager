import { Copy } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import tw from 'twrnc';

const UKURAN_QR = 220;
const UKURAN_IKON_SALIN = 16;
/** gray-600 */
const WARNA_IKON_SALIN = '#4b5563';
const JENIS_MINIMARKET = 'RETAIL';

interface KartuMenungguGatewayProps {
  nominal: string;
  nomorVa?: string | null;
  stringQris?: string | null;
  namaMetode?: string;
  jenisMetode?: string;
  urlBayar?: string | null;
  onSalin: (teks: string, label: string) => void;
  onBukaHalamanBayar: () => void;
  onGantiMetode: () => void;
}

function InstruksiQris({ nominal, stringQris }: { nominal: string; stringQris: string }) {
  return (
    <View style={tw`items-center`}>
      <Text style={tw`text-xs text-gray-500 mb-3 font-medium`}>Scan QRIS dengan aplikasi bank atau e-wallet</Text>
      {/* QR tetap di atas putih agar terbaca kamera. */}
      <View style={tw`bg-white p-2 rounded-lg`}>
        <QRCode value={stringQris} size={UKURAN_QR} />
      </View>
      <Text style={tw`font-bold text-teal-600 text-2xl mt-3`}>{nominal}</Text>
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
        <InstruksiQris nominal={nominal} stringQris={stringQris} />
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
      {/* VA yang belum dibayar bisa diganti QRIS dan sebaliknya; backend menutup checkout lama. */}
      <TouchableOpacity onPress={props.onGantiMetode} style={tw`border border-teal-600 mt-3 py-3 rounded-xl items-center`}>
        <Text style={tw`text-teal-700 font-bold`}>Ganti Metode Pembayaran</Text>
      </TouchableOpacity>
    </View>
  );
}
