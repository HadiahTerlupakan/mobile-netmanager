import React, { useState } from 'react';
import { View } from 'react-native';

import { ImageViewerModal } from '@/components/molecules/ImageViewerModal';
import type { BalasanTiket, DetailTiket } from '@/types/portalPelanggan';

import { GelembungTiket } from './GelembungTiket';

const NAMA_STAF_BAWAAN = 'Tim Dukungan';

/** Nama pengirim hanya untuk balasan staf; balasan pelanggan sendiri tanpa label. */
function namaPengirimBalasan(balasan: BalasanTiket): string | undefined {
  if (!balasan.isFromAdmin) return undefined;
  return balasan.sender?.name || NAMA_STAF_BAWAAN;
}

/** Percakapan tiket: deskripsi awal pelanggan lalu balasan berurutan. */
export function PercakapanTiket({ tiket }: { tiket: DetailTiket }) {
  const [gambarDibuka, setGambarDibuka] = useState<string | null>(null);
  return (
    <View>
      <GelembungTiket
        pesan={tiket.description}
        waktu={tiket.createdAt}
        isDariSaya
        lampiran={tiket.attachments.map((lampiran) => lampiran.fileUrl)}
        onBukaGambar={setGambarDibuka}
      />
      {tiket.replies.map((balasan) => (
        <GelembungTiket
          key={balasan.id}
          pesan={balasan.message}
          waktu={balasan.createdAt}
          isDariSaya={!balasan.isFromAdmin}
          namaPengirim={namaPengirimBalasan(balasan)}
          lampiran={balasan.attachments}
          onBukaGambar={setGambarDibuka}
        />
      ))}
      <ImageViewerModal visible={gambarDibuka !== null} imageUrl={gambarDibuka} onClose={() => setGambarDibuka(null)} />
    </View>
  );
}
