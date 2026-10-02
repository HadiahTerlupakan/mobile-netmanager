import type { DetailKeluhan } from '@/types/keluhan';

/** Satu langkah pada linimasa penanganan keluhan. */
export interface LangkahKeluhan {
  kunci: 'DILAPORKAN' | 'DITANGANI' | 'DIJADWALKAN' | 'DIKERJAKAN' | 'SELESAI';
  judul: string;
  keterangan: string | null;
  isSelesai: boolean;
}

const STATUS_TUNTAS = ['RESOLVED', 'CLOSED'];
const STATUS_WO_DIKERJAKAN = ['IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED'];

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const FORMAT_HARI = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

const formatWaktu = (iso: string | null) => (iso ? FORMAT_TANGGAL.format(new Date(iso)) : null);

/** Tanggal jadwal WO singkat, mis. "Sen, 5 Okt". */
export function formatHariJadwal(iso: string): string {
  return FORMAT_HARI.format(new Date(iso));
}

/** Keterangan langkah "Teknisi dijadwalkan": nomor WO, teknisi, dan jadwal. */
function keteranganJadwal(keluhan: DetailKeluhan): string | null {
  const wo = keluhan.workOrders[0];
  if (!wo) return null;
  const jadwal = wo.jadwal ? `${formatHariJadwal(wo.jadwal)}${wo.jamJadwal ? ` ${wo.jamJadwal}` : ''}` : null;
  return [wo.nomor, wo.namaTeknisi ?? 'teknisi belum ditentukan', jadwal].filter(Boolean).join(' · ');
}

/**
 * Linimasa keluhan: dilaporkan → ditangani helpdesk → (teknisi dijadwalkan →
 * dikerjakan) → selesai. Langkah teknisi hanya muncul untuk gangguan teknis
 * atau bila helpdesk sudah membuat WO.
 */
export function susunLangkahKeluhan(keluhan: DetailKeluhan): LangkahKeluhan[] {
  const wo = keluhan.workOrders[0];
  const isTuntas = STATUS_TUNTAS.includes(keluhan.status);
  const isDitangani =
    isTuntas || keluhan.status !== 'OPEN' || Boolean(wo) || keluhan.balasan.some((balasan) => balasan.dariHelpdesk);
  const isPakaiTeknisi = keluhan.kategori === 'TECHNICAL' || Boolean(wo);
  const isDikerjakan = Boolean(wo?.dimulaiPada) || (wo ? STATUS_WO_DIKERJAKAN.includes(wo.status) : false);

  const langkah: LangkahKeluhan[] = [
    { kunci: 'DILAPORKAN', judul: 'Dilaporkan', keterangan: formatWaktu(keluhan.dibuatPada), isSelesai: true },
    { kunci: 'DITANGANI', judul: 'Ditangani helpdesk', keterangan: null, isSelesai: isDitangani },
  ];
  if (isPakaiTeknisi) {
    langkah.push(
      { kunci: 'DIJADWALKAN', judul: 'Teknisi dijadwalkan', keterangan: keteranganJadwal(keluhan), isSelesai: Boolean(wo) },
      { kunci: 'DIKERJAKAN', judul: 'Dikerjakan teknisi', keterangan: formatWaktu(wo?.dimulaiPada ?? null), isSelesai: isDikerjakan || isTuntas },
    );
  }
  langkah.push({
    kunci: 'SELESAI',
    judul: 'Selesai',
    keterangan: formatWaktu(keluhan.selesaiPada ?? wo?.selesaiPada ?? null),
    isSelesai: isTuntas,
  });
  return langkah;
}

/** Pesan WhatsApp ke pelanggan yang mengabarkan perkembangan keluhannya. */
export function pesanKabarKeluhan(keluhan: DetailKeluhan, namaSales: string): string {
  const wo = keluhan.workOrders[0];
  const salam = `Halo ${keluhan.pelanggan.nama}, saya ${namaSales}.`;
  if (STATUS_TUNTAS.includes(keluhan.status)) {
    return `${salam} Keluhan "${keluhan.subjek}" (${keluhan.nomor}) sudah diselesaikan. Mohon kabari kami bila masih ada kendala. Terima kasih.`;
  }
  if (wo) {
    const jadwal = keteranganJadwal(keluhan);
    return `${salam} Keluhan "${keluhan.subjek}" (${keluhan.nomor}) sedang kami tangani. Teknisi dijadwalkan: ${jadwal}.`;
  }
  return `${salam} Keluhan "${keluhan.subjek}" sudah kami teruskan ke tim helpdesk dengan nomor ${keluhan.nomor}. Kami kabari lagi perkembangannya.`;
}
