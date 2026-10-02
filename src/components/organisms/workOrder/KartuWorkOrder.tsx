import {
  ArrowUpCircle,
  Cable,
  Clock,
  MapPin,
  MoveRight,
  Phone,
  Router,
  Unplug,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import React, { memo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { LencanaStatus } from '@/components/molecules/LencanaStatus';
import {
  PRIORITAS_MENDESAK,
  PRIORITAS_WORK_ORDER,
  TIPE_WORK_ORDER,
  labelKodeWo,
  statusWorkOrder,
} from '@/constants/workOrder';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import { formatDate } from '@/utils/date';
import { bukaAlamatDiPeta, hubungiKontak } from '@/utils/kontakWorkOrder';

const UKURAN_IKON_INFO = 14;
const UKURAN_IKON_TIPE = 18;

const IKON_TIPE: Readonly<Record<string, LucideIcon>> = {
  INSTALLATION: Cable,
  TROUBLESHOOT: Router,
  MAINTENANCE: Wrench,
  UPGRADE: ArrowUpCircle,
  RELOCATION: MoveRight,
  DISCONNECTION: Unplug,
};

export interface ItemKartuWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  type?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  locationAddress?: string | null;
  scheduledDate?: string | null;
  assignments?: { userId: string; role: string; status: string }[];
  pelanggan?: { nama?: string | null; noTelp?: string | null; alamat?: string | null } | null;
  site?: { name?: string | null } | null;
}

interface KartuWorkOrderProps {
  item: ItemKartuWorkOrder;
  /** Pengguna masuk; dipakai mengenali undangan partner yang menunggu konfirmasi. */
  userId?: string;
  /** Ada = tab Tersedia (tombol Ambil); tidak ada = WO milik sendiri (kartu membuka detail). */
  aksiAmbil?: { onAmbil: (id: string) => void; isMengambil: boolean };
  onBuka?: (id: string) => void;
}

function BarisInfo({ ikon: Ikon, teks, warna, onTekan }: { ikon: LucideIcon; teks: string; warna?: string; onTekan?: () => void }) {
  const isi = (
    <View style={tw`flex-row items-center mt-1.5`}>
      <Ikon size={UKURAN_IKON_INFO} color={warna ?? DESAIN_PREMIUM.ikonNetral} />
      <Text style={[tw`text-sm ml-2 flex-1`, warna ? { color: warna } : tw`text-slate-600`]} numberOfLines={1}>
        {teks}
      </Text>
    </View>
  );
  if (!onTekan) return isi;
  return (
    <TouchableOpacity accessibilityRole="link" accessibilityLabel={teks} onPress={onTekan}>
      {isi}
    </TouchableOpacity>
  );
}

/**
 * Kartu work order untuk daftar (Tersedia, Aktif, Riwayat): ikon tipe,
 * nomor & judul, status, tipe & prioritas berlabel Indonesia, kontak (ketuk
 * = WhatsApp), alamat (ketuk = peta), jadwal, dan tombol Ambil di tab Tersedia.
 */
export const KartuWorkOrder = memo(({ item, userId, aksiAmbil, onBuka }: KartuWorkOrderProps) => {
  const { tw: twTema, warna } = useTemaPersona();
  const penugasanSaya = item.assignments?.find((tugas) => tugas.userId === userId);
  const isUndanganPartner = penugasanSaya?.role === 'PARTNER' && penugasanSaya?.status === 'PENDING';
  const status = isUndanganPartner ? { label: 'Undangan', nada: 'menunggu' as const } : statusWorkOrder(item.status);
  const isMendesak = PRIORITAS_MENDESAK.includes(item.priority);
  const IkonTipe = (item.type && IKON_TIPE[item.type]) || Wrench;

  const namaKontak = item.contactName || item.pelanggan?.nama;
  const telepon = item.contactPhone || item.pelanggan?.noTelp;
  const alamat = item.locationAddress || item.pelanggan?.alamat || item.site?.name;

  const isi = (
    <View
      style={tw`bg-white rounded-2xl p-4 mb-3 border ${isUndanganPartner ? 'border-amber-200' : 'border-slate-200/70'}`}
    >
      <View style={tw`flex-row items-start`}>
        <View style={twTema`w-10 h-10 rounded-xl bg-utama-sangat-muda items-center justify-center mr-3`}>
          <IkonTipe size={UKURAN_IKON_TIPE} color={warna.utamaKuat} />
        </View>
        <View style={tw`flex-1 mr-2`}>
          <Text style={tw`text-xs font-semibold text-slate-500`}>{item.workOrderNumber}</Text>
          <Text style={tw`text-base font-bold text-slate-900 mt-0.5`} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <LencanaStatus status={status} />
      </View>

      <View style={tw`flex-row flex-wrap mt-3`}>
        {item.type ? (
          <View style={tw`rounded-md px-2 py-0.5 bg-slate-100 mr-2`}>
            <Text style={tw`text-[11px] font-semibold text-slate-600`}>{labelKodeWo(TIPE_WORK_ORDER, item.type)}</Text>
          </View>
        ) : null}
        <View style={tw`rounded-md px-2 py-0.5 ${isMendesak ? 'bg-rose-50' : 'bg-slate-100'}`}>
          <Text style={tw`text-[11px] font-semibold ${isMendesak ? 'text-rose-600' : 'text-slate-600'}`}>
            {`Prioritas ${labelKodeWo(PRIORITAS_WORK_ORDER, item.priority).toLowerCase()}`}
          </Text>
        </View>
      </View>

      <View style={tw`mt-2`}>
        {namaKontak ? <BarisInfo ikon={User} teks={namaKontak} /> : null}
        {telepon ? <BarisInfo ikon={Phone} teks={telepon} warna={warna.utamaKuat} onTekan={() => hubungiKontak(telepon)} /> : null}
        {alamat ? <BarisInfo ikon={MapPin} teks={alamat} onTekan={() => bukaAlamatDiPeta(alamat)} /> : null}
        {item.scheduledDate ? <BarisInfo ikon={Clock} teks={formatDate(item.scheduledDate, 'd MMM yyyy, HH:mm')} /> : null}
      </View>

      {isUndanganPartner ? (
        <View style={tw`mt-3 rounded-xl bg-amber-50 py-2`}>
          <Text style={tw`text-xs font-semibold text-amber-700 text-center`}>Menunggu konfirmasi Anda</Text>
        </View>
      ) : null}

      {aksiAmbil ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Ambil ${item.workOrderNumber}`}
          onPress={() => aksiAmbil.onAmbil(item.id)}
          disabled={aksiAmbil.isMengambil}
          style={[tw`mt-4 rounded-xl py-3 items-center ${aksiAmbil.isMengambil ? 'opacity-60' : ''}`, { backgroundColor: warna.utamaKuat }]}
        >
          {aksiAmbil.isMengambil ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={tw`text-white font-bold`}>Ambil tugas</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (!onBuka) return isi;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Work order ${item.workOrderNumber}, ketuk untuk detail`}
      onPress={() => onBuka(item.id)}
      activeOpacity={0.8}
    >
      {isi}
    </TouchableOpacity>
  );
});
KartuWorkOrder.displayName = 'KartuWorkOrder';
