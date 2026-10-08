/**
 * Konfirmasi berapa banyak material yang benar-benar terpasang di pelanggan.
 *
 * Sebelum ini tidak ada tempat mana pun yang mencatatnya: gudang sudah
 * mengurangi stoknya saat barang diambil, pelanggan hanya menerima sebagian,
 * dan selisihnya — yang ada di mobil teknisi — tidak tercatat di mana-mana.
 *
 * Nilai awalnya sengaja terisi penuh: kasus yang paling sering terjadi adalah
 * semua yang dibawa memang terpakai, dan memaksa mengetik ulang angka yang
 * sudah benar hanya mengundang orang mengisinya asal-asalan.
 */

import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import type { SisaBarang } from '@/utils/sisaPengembalian';

interface PemakaianMaterialProps {
  dipegang: SisaBarang[];
  nilai: Record<string, number>;
  onUbah: (barangId: string, jumlah: number) => void;
}

export function PemakaianMaterial({
  dipegang,
  nilai,
  onUbah,
}: PemakaianMaterialProps) {
  if (dipegang.length === 0) return null;

  return (
    <View style={tw`mt-6`}>
      <Text style={tw`font-bold text-gray-800 mb-1`}>Material Terpasang</Text>
      <Text style={tw`text-xs text-gray-500 mb-3`}>
        Sisanya tetap tercatat di tangan Anda sampai dikembalikan ke gudang.
      </Text>

      {dipegang.map((barang) => {
        const terpasang = nilai[barang.barangId] ?? barang.sisa;
        const sisa = barang.sisa - terpasang;

        return (
          <View
            key={barang.barangId}
            style={tw`bg-white border border-gray-200 rounded-xl p-3 mb-2`}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`font-semibold text-gray-900`}>
                  {barang.nama}
                </Text>
                <Text style={tw`text-xs text-gray-500`}>
                  Dibawa {barang.sisa} {barang.satuan}
                </Text>
              </View>

              <View style={tw`flex-row items-center gap-2`}>
                <TouchableOpacity
                  onPress={() => onUbah(barang.barangId, terpasang - 1)}
                  disabled={terpasang <= 0}
                  style={tw`w-8 h-8 rounded-lg items-center justify-center ${terpasang <= 0 ? 'bg-gray-100' : 'bg-gray-200'}`}
                >
                  <Minus size={16} color={terpasang <= 0 ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>

                <Text style={tw`w-8 text-center font-bold text-gray-900`}>
                  {terpasang}
                </Text>

                <TouchableOpacity
                  onPress={() => onUbah(barang.barangId, terpasang + 1)}
                  disabled={terpasang >= barang.sisa}
                  style={tw`w-8 h-8 rounded-lg items-center justify-center ${terpasang >= barang.sisa ? 'bg-gray-100' : 'bg-gray-200'}`}
                >
                  <Plus
                    size={16}
                    color={terpasang >= barang.sisa ? '#d1d5db' : '#374151'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Angka sisa ditulis apa adanya supaya teknisi tahu persis apa yang
                masih harus ia bawa kembali — bukan sekadar "ada sisa". */}
            {sisa > 0 && (
              <Text style={tw`text-xs text-amber-700 mt-2`}>
                Sisa {sisa} {barang.satuan} tetap tercatat di tangan Anda.
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default PemakaianMaterial;
