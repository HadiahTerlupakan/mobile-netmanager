/**
 * Memilah dokumen snapshot kanal realtime menjadi riwayat atau event baru.
 *
 * Snapshot pertama sebuah listener memuat 20 event terakhir: riwayat, bukan
 * kejadian baru. Riwayat itu baru lengkap pada snapshot pertama yang dijawab
 * server. Snapshot dari cache lokal bisa kosong (perangkat offline) atau hanya
 * memuat sebagian, dan sisanya lalu tiba sebagai "added" begitu server
 * menjawab — dulu terkirim sebagai rentetan event setiap aplikasi dibuka atau
 * tersambung lagi. Hal yang sama berlaku untuk listener pengganti setelah
 * galat: snapshot pertamanya kembali riwayat.
 */

import type { DocumentData } from 'firebase/firestore'

/** ID yang diingat dibatasi: listener layar WO/chat bisa hidup berjam-jam. */
const BATAS_ID_TERINGAT = 500

/**
 * Selisih createdAt di bawah event terbaru yang masih dianggap event baru.
 *
 * Server menulis event berkelompok (jendela 2 detik), jadi event yang dibuat
 * lebih dulu bisa tiba setelah event yang lebih baru. Dokumen yang jauh lebih
 * tua daripada riwayat terbaru adalah dokumen lama yang masuk ke jendela
 * `limit(20)`, mis. karena dokumen di dalamnya dihapus. Pembandingnya createdAt
 * buatan server, bukan jam perangkat: jam HP yang maju akan membuat setiap
 * event baru tampak lama.
 */
const TOLERANSI_URUTAN_MS = 60_000

interface DokumenKanal {
  id: string
  data(): DocumentData
}

/** Bagian `QuerySnapshot` Firestore yang dibaca pemilah. */
export interface SnapshotKanal {
  metadata: { fromCache: boolean }
  docs: DokumenKanal[]
  docChanges(): { type: string; doc: DokumenKanal }[]
}

/** createdAt dalam ms epoch: string ISO, angka ms, atau Timestamp Firestore. */
function bacaWaktuCreatedAt(nilai: unknown): number | null {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : null
  if (typeof nilai === 'string') {
    const waktu = Date.parse(nilai)
    return Number.isNaN(waktu) ? null : waktu
  }
  const timestamp = nilai as { toMillis?: unknown } | null
  return typeof timestamp?.toMillis === 'function' ? (timestamp.toMillis as () => number)() : null
}

/** Pemilah untuk satu langganan kanal; ID yang sudah terlihat bertahan antar-listener. */
export function buatPemilahSnapshotRealtime() {
  const idTeringat = new Set<string>()
  let createdAtTerbaruMs: number | null = null
  let isTerhidrasi = false

  const ingatId = (id: string) => {
    if (idTeringat.size >= BATAS_ID_TERINGAT) {
      // Urutan iterasi Set = urutan sisip, jadi ini ID tertua.
      const tertua = idTeringat.values().next().value
      if (tertua !== undefined) idTeringat.delete(tertua)
    }
    idTeringat.add(id)
  }

  const catatWaktu = (waktu: number | null) => {
    if (waktu === null) return
    createdAtTerbaruMs = createdAtTerbaruMs === null ? waktu : Math.max(createdAtTerbaruMs, waktu)
  }

  // createdAt yang tidak terbaca tidak dihakimi: penjaga utamanya hidrasi dan
  // ID yang diingat, bukan waktu.
  const isJauhLebihLama = (waktu: number | null) =>
    waktu !== null && createdAtTerbaruMs !== null && waktu < createdAtTerbaruMs - TOLERANSI_URUTAN_MS

  const ingatRiwayat = (snapshot: SnapshotKanal) => {
    for (const dokumen of snapshot.docs) {
      ingatId(dokumen.id)
      catatWaktu(bacaWaktuCreatedAt(dokumen.data().createdAt))
    }
    isTerhidrasi = !snapshot.metadata.fromCache
  }

  const pilahDokumenBaru = (dokumen: DokumenKanal): DocumentData | null => {
    if (idTeringat.has(dokumen.id)) return null
    ingatId(dokumen.id)
    const data = dokumen.data()
    const waktu = bacaWaktuCreatedAt(data.createdAt)
    if (isJauhLebihLama(waktu)) return null
    catatWaktu(waktu)
    return data
  }

  return {
    /** Dipanggil setiap listener dipasang, termasuk langganan ulang setelah galat. */
    mulaiListener(): void {
      isTerhidrasi = false
    },

    /** Data dokumen yang benar-benar baru di snapshot ini; riwayat menghasilkan daftar kosong. */
    pilahEventBaru(snapshot: SnapshotKanal): DocumentData[] {
      if (!isTerhidrasi) {
        ingatRiwayat(snapshot)
        return []
      }
      const dataBaru: DocumentData[] = []
      for (const perubahan of snapshot.docChanges()) {
        if (perubahan.type !== 'added') continue
        const data = pilahDokumenBaru(perubahan.doc)
        if (data) dataBaru.push(data)
      }
      return dataBaru
    },

    /** Lepas ID yang diingat saat langganan berakhir. */
    lupakan(): void {
      idTeringat.clear()
    },
  }
}
