import type { Href } from 'expo-router';

import type { NotifikasiPelanggan } from '@/types/portalPelanggan';
import { petakanRuteNotifikasi, RUTE_TAGIHAN_PELANGGAN } from '@/utils/ruteNotifikasi';

const TIPE_BALASAN_TIKET = 'TICKET_REPLY';

/**
 * Layar tujuan notifikasi in-app pelanggan: balasan tiket membuka tiketnya,
 * notifikasi tagihan (tautan portal "/tagihan") membuka Tagihan; notifikasi
 * lain hanya untuk dibaca.
 */
export function tujuanNotifikasiPelanggan(notifikasi: Pick<NotifikasiPelanggan, 'type' | 'ticketId' | 'link'>): Href | null {
  if (notifikasi.type === TIPE_BALASAN_TIKET && notifikasi.ticketId) {
    return { pathname: '/(customer)/tickets/[id]', params: { id: notifikasi.ticketId } };
  }
  if (notifikasi.link && petakanRuteNotifikasi(notifikasi.link) === RUTE_TAGIHAN_PELANGGAN) return RUTE_TAGIHAN_PELANGGAN;
  return null;
}
