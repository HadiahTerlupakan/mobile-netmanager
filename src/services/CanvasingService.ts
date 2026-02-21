import api from '@/services/api'
import { logger } from '@/utils/logger'

export interface CanvasingRequest {
  nama: string
  noKtp?: string
  noTelpon: string
  email?: string
  alamat: string
  kabel: number
  odp?: string
  paket?: string
  sn?: string
  latitude?: number | null
  longitude?: number | null
  foto?: string
  fotoKtp?: string
}

export interface CanvasingResponse {
  id: string
  nama: string
  noTelpon: string
  alamat: string
  kabel: number
  status: 'PENDING' | 'APPROVED' | 'INSTALASI' | 'COMPLETE' | 'CLAIM' | 'REJECTED'
  sn?: string | null
  fotoInstalasi?: string | null
  rejectReason?: string | null
  foto?: string | null
  createdAt: string
  updatedAt: string
}

class CanvasingService {
  /**
   * Mengambil riwayat canvasing pengguna
   */
  async getMyHistory(): Promise<CanvasingResponse[]> {
    try {
      const response = await api.get('/api/marketing/canvasing')
      return response.data.data
    } catch (error) {
      logger.error('Failed to get canvasing history', error)
      throw error
    }
  }

  /**
   * Membuat permohonan canvasing baru
   */
  async submitCanvasing(data: CanvasingRequest): Promise<CanvasingResponse> {
    try {
      const response = await api.post('/api/marketing/canvasing', data)
      return response.data.data
    } catch (error) {
      logger.error('Failed to submit canvasing', error)
      throw error
    }
  }
}

export const canvasingService = new CanvasingService()
