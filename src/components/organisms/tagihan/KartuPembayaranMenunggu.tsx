import dayjs from 'dayjs';
import 'dayjs/locale/id';
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import { KartuCheckoutKedaluwarsa } from '@/components/organisms/tagihan/KartuCheckoutKedaluwarsa';
import { KartuMenungguGateway } from '@/components/organisms/tagihan/KartuMenungguGateway';
import { KartuTransferManual } from '@/components/organisms/tagihan/KartuTransferManual';
import { KepalaPembayaranMenunggu } from '@/components/organisms/tagihan/KepalaPembayaranMenunggu';
import type { HitungMundur } from '@/hooks/tagihan/useHitungMundurPembayaran';
import type { MetodePembayaranPelanggan, PembayaranTerakhir, RekeningTransferManual, TagihanPelanggan } from '@/types/portalPelanggan';
import { formatRupiah } from '@/utils/rupiah';
import { nominalCheckout, nomorTagihanCheckout, tulisNomorTagihan } from '@/utils/tagihan/checkoutPelanggan';

dayjs.locale('id');

/** Aksi pelanggan pada checkout yang menunggu. */
export interface AksiPembayaranMenunggu {
  onSalin: (teks: string, label: string) => void;
  onSimpanQris: (base64Png: string) => void;
  onCekStatus: () => void;
  onBukaHalamanBayar: () => void;
  onGantiMetode: () => void;
  onUnggahBukti: () => void;
}

interface KartuPembayaranMenungguProps {
  tagihan: TagihanPelanggan;
  pembayaran: PembayaranTerakhir;
  /** Metode checkout ini di daftar metode (nama & jenis), bila termuat. */
  metode: MetodePembayaranPelanggan | undefined;
  /** Rekening tujuan bila checkout ini transfer manual. */
  rekening: RekeningTransferManual | undefined;
  hitungMundur: HitungMundur;
  isMengecekStatus: boolean;
  isMengunggah: boolean;
  aksi: AksiPembayaranMenunggu;
}

function keteranganCheckout(metode: string | undefined, nomorTagihan: string, pembayaran: PembayaranTerakhir): string {
  const batas = pembayaran.expiresAt ? `bayar sebelum ${dayjs(pembayaran.expiresAt).format('D MMM, HH.mm')}` : null;
  return [metode, tulisNomorTagihan(nomorTagihanCheckout(pembayaran, nomorTagihan)), batas].filter(Boolean).join(' · ');
}

function IsiPembayaranMenunggu(props: KartuPembayaranMenungguProps) {
  const { pembayaran, metode, rekening, aksi } = props;
  const nominal = nominalCheckout(pembayaran);
  if (props.hitungMundur.isKedaluwarsa) return <KartuCheckoutKedaluwarsa onPilihMetode={aksi.onGantiMetode} />;
  if (rekening) {
    return (
      <KartuTransferManual
        rekening={rekening}
        nominal={formatRupiah(nominal)}
        nominalMentah={nominal}
        isBuktiTerkirim={Boolean(pembayaran.receiptUrl)}
        isMengunggah={props.isMengunggah}
        onSalin={aksi.onSalin}
        onUnggahBukti={aksi.onUnggahBukti}
      />
    );
  }
  return (
    <KartuMenungguGateway
      nominal={formatRupiah(nominal)}
      nomorVa={pembayaran.vaNumber}
      stringQris={pembayaran.qrString}
      namaMetode={metode?.name}
      jenisMetode={metode?.type}
      urlBayar={pembayaran.paymentUrl}
      isMengecekStatus={props.isMengecekStatus}
      {...aksi}
    />
  );
}

/** Checkout yang menunggu dibayar: judul + instruksi bayar sesuai metodenya. */
export function KartuPembayaranMenunggu(props: KartuPembayaranMenungguProps) {
  return (
    <View style={tw`p-4`}>
      <View style={tw`bg-white rounded-2xl p-5 shadow-lg border border-orange-200 overflow-hidden`}>
        <KepalaPembayaranMenunggu
          hitungMundur={props.hitungMundur}
          keterangan={keteranganCheckout(props.metode?.name, props.tagihan.invoiceNumber, props.pembayaran)}
        />
        <IsiPembayaranMenunggu {...props} />
      </View>
    </View>
  );
}
