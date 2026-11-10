import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import { DESAIN_PREMIUM } from '@/theme';
import type { PengajuanBarang } from '@/types/pengajuanBarang';
import { formatDate } from '@/utils/date';
import { keadaanTahap, nadaStatusPengajuan, ringkasanBarisPengajuan, type KeadaanTahap } from '@/utils/pengajuanBarang';

const UKURAN_IKON_RINCIAN = 16;

const GAYA_TAHAP: Readonly<Record<KeadaanTahap, { titik: string; teks: string }>> = {
  selesai: { titik: 'bg-green-600', teks: 'text-slate-700' },
  berjalan: { titik: 'bg-amber-500', teks: 'text-slate-900 font-bold' },
  berhenti: { titik: 'bg-red-600', teks: 'text-red-800 font-bold' },
  belum: { titik: 'bg-slate-300', teks: 'text-slate-400' },
};

const LABEL_KEADAAN: Readonly<Record<KeadaanTahap, string>> = {
  selesai: 'selesai',
  berjalan: 'sedang berjalan',
  berhenti: 'berhenti',
  belum: 'belum',
};

/** Empat tahap pengajuan: Pengajuan → Persetujuan → Pembelian → Verifikasi. */
function GarisTahap({ pengajuan }: { pengajuan: PengajuanBarang }) {
  return (
    <View style={tw`mt-3`}>
      {pengajuan.tahap.judul.map((judul, index) => {
        const nomor = index + 1;
        const keadaan = keadaanTahap(pengajuan.tahap, nomor, pengajuan.status.kode);
        const gaya = GAYA_TAHAP[keadaan];
        return (
          <View
            key={judul}
            style={tw`flex-row items-center py-0.5`}
            accessible
            accessibilityLabel={`Tahap ${nomor}, ${judul}: ${LABEL_KEADAAN[keadaan]}`}
          >
            <View style={tw`w-2.5 h-2.5 rounded-full mr-2 ${gaya.titik}`} />
            <Text style={tw`text-[13px] ${gaya.teks}`}>
              {nomor}. {judul}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Rincian per barang: diminta, disetujui, dibeli, datang. */
function RincianBarang({ pengajuan }: { pengajuan: PengajuanBarang }) {
  return (
    <View style={tw`mt-3 pt-3 border-t border-slate-100`}>
      {pengajuan.barang.map((baris) => (
        <View key={baris.id} style={tw`mb-2`}>
          <Text style={tw`text-sm font-semibold ${baris.isDitolak ? 'text-slate-400' : 'text-slate-900'}`}>
            {baris.nama}
          </Text>
          <Text style={tw`text-xs text-slate-600 mt-0.5`}>{ringkasanBarisPengajuan(baris)}</Text>
          {baris.catatanAtasan ? (
            <Text style={tw`text-xs text-slate-500 mt-0.5`}>Catatan atasan: {baris.catatanAtasan}</Text>
          ) : null}
        </View>
      ))}
      {pengajuan.jumlahJasa > 0 ? (
        <Text style={tw`text-xs text-slate-500`}>Ditambah {pengajuan.jumlahJasa} item jasa.</Text>
      ) : null}
    </View>
  );
}

/**
 * Kartu satu pengajuan barang (hanya lihat): nomor, gudang, status, tahap,
 * dan kalimat keadaannya. Ketuk "Lihat barang" untuk rincian per barang.
 */
export const KartuPengajuanBarang = memo(({ pengajuan }: { pengajuan: PengajuanBarang }) => {
  const [isTerbuka, setIsTerbuka] = useState(false);
  const IkonRincian = isTerbuka ? ChevronUp : ChevronDown;
  const jumlahBarang = pengajuan.barang.length;

  return (
    <View style={tw`bg-white mx-4 mb-3 px-4 py-3 rounded-2xl border border-slate-200/70`}>
      <View style={tw`flex-row items-start`}>
        <View style={tw`flex-1 mr-2`}>
          <Text style={tw`text-[15px] font-bold text-slate-900`}>{pengajuan.nomor}</Text>
          <Text style={tw`text-xs text-slate-500 mt-0.5`}>
            {pengajuan.gudang} · {formatDate(pengajuan.tanggal, 'd MMM yyyy')}
            {pengajuan.pemohon ? ` · ${pengajuan.pemohon}` : ''}
          </Text>
        </View>
        <LencanaStatus status={{ label: pengajuan.status.label, nada: nadaStatusPengajuan(pengajuan.status.kode) }} />
      </View>

      {pengajuan.status.kalimat ? (
        <Text style={tw`text-sm text-slate-700 mt-2`}>{pengajuan.status.kalimat}</Text>
      ) : null}

      <GarisTahap pengajuan={pengajuan} />

      {jumlahBarang > 0 ? (
        <Pressable
          onPress={() => setIsTerbuka((terbuka) => !terbuka)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isTerbuka }}
          style={tw`flex-row items-center mt-2 min-h-[44px]`}
        >
          <Text style={tw`text-sm font-semibold text-slate-700 mr-1`}>
            {isTerbuka ? 'Sembunyikan barang' : `Lihat barang (${jumlahBarang})`}
          </Text>
          <IkonRincian size={UKURAN_IKON_RINCIAN} color={DESAIN_PREMIUM.ikonNetral} />
        </Pressable>
      ) : null}

      {isTerbuka ? <RincianBarang pengajuan={pengajuan} /> : null}
    </View>
  );
});
KartuPengajuanBarang.displayName = 'KartuPengajuanBarang';
