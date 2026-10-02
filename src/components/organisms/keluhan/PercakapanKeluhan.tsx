import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { ImageViewerModal } from '@/components/molecules/ImageViewerModal';
import type { BalasanKeluhan } from '@/types/keluhan';
import { formatTimeAgo } from '@/utils/date';
import { urlGambarTenant } from '@/utils/urlGambarTenant';

const UKURAN_LAMPIRAN = 72;

/** Siapa pengirim balasan, dari sudut pandang sales yang membaca. */
function labelPengirim(balasan: BalasanKeluhan, namaSaya: string | undefined) {
  if (balasan.dariHelpdesk) return `Helpdesk${balasan.namaPengirim ? ` · ${balasan.namaPengirim}` : ''}`;
  if (balasan.namaPengirim && balasan.namaPengirim === namaSaya) return 'Anda';
  return balasan.namaPengirim ?? 'Pelanggan';
}

/** Percakapan keluhan dengan helpdesk; balasan sales sendiri di kanan. */
export function PercakapanKeluhan({ balasan, namaSaya }: { balasan: BalasanKeluhan[]; namaSaya: string | undefined }) {
  const [gambarDibuka, setGambarDibuka] = useState<string | null>(null);
  if (balasan.length === 0) {
    return <Text style={tw`text-sm text-slate-500`}>Belum ada balasan. Helpdesk akan merespons keluhan ini.</Text>;
  }
  return (
    <View>
      {balasan.map((item) => {
        const isSaya = !item.dariHelpdesk && item.namaPengirim === namaSaya;
        return (
          <View key={item.id} style={tw`mb-3 ${isSaya ? 'items-end' : 'items-start'}`}>
            <Text style={tw`text-[11px] text-slate-400 mb-1`}>{`${labelPengirim(item, namaSaya)} · ${formatTimeAgo(item.waktu)}`}</Text>
            <View style={tw`max-w-[88%] rounded-2xl px-3 py-2 ${isSaya ? 'bg-slate-800' : item.dariHelpdesk ? 'bg-sky-50' : 'bg-slate-100'}`}>
              <Text style={tw`text-sm ${isSaya ? 'text-white' : 'text-slate-800'}`}>{item.pesan.replace(/\*\*/g, '')}</Text>
              {item.lampiran.length > 0 ? (
                <View style={tw`flex-row flex-wrap mt-2 -m-0.5`}>
                  {item.lampiran.map((jalur) => {
                    const url = urlGambarTenant(jalur);
                    return url ? (
                      <TouchableOpacity key={jalur} accessibilityRole="imagebutton" accessibilityLabel="Buka foto" onPress={() => setGambarDibuka(url)} style={tw`m-0.5`}>
                        <Image source={url} style={[tw`rounded-lg bg-slate-200`, { width: UKURAN_LAMPIRAN, height: UKURAN_LAMPIRAN }]} contentFit="cover" />
                      </TouchableOpacity>
                    ) : null;
                  })}
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      <ImageViewerModal visible={gambarDibuka !== null} imageUrl={gambarDibuka} onClose={() => setGambarDibuka(null)} />
    </View>
  );
}
