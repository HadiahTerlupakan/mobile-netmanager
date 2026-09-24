import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';

import { presentAppError } from '@/utils/errorPresenter';
import { KUALITAS_FOTO_BUKTI, perkecilFoto } from '@/utils/presurvei/fotoBukti';

/**
 * State dan aksi kamera bukti kegiatan. Logika async (izin, potret, perkecil
 * foto) hidup di sini alih-alih di komponen `KameraBukti` supaya bisa diuji
 * tanpa merender native `CameraView` (amandemen preflight task-12 G10).
 */
export interface KameraBuktiState {
  kamera: React.RefObject<CameraView | null>;
  isIzinDiberikan: boolean;
  isMemotret: boolean;
  mintaIzin: () => void;
  potret: () => Promise<void>;
}

/** Kamera bukti kegiatan: potret, perkecil ke 1024/JPEG 0.7, lalu serahkan URI ke pemanggil. */
export function useKameraBukti(onAmbil: (uri: string) => void): KameraBuktiState {
  const [izin, mintaIzinAsli] = useCameraPermissions();
  const kamera = useRef<CameraView>(null);
  const [isMemotret, setIsMemotret] = useState(false);

  const mintaIzin = useCallback(() => {
    void mintaIzinAsli();
  }, [mintaIzinAsli]);

  const potret = useCallback(async () => {
    if (!kamera.current || isMemotret) return;
    setIsMemotret(true);
    try {
      const foto = await kamera.current.takePictureAsync({ quality: KUALITAS_FOTO_BUKTI });
      if (foto?.uri) onAmbil(await perkecilFoto(foto.uri));
    } catch (error) {
      presentAppError(error, { screen: 'KameraBukti' });
    } finally {
      setIsMemotret(false);
    }
  }, [isMemotret, onAmbil]);

  return { kamera, isIzinDiberikan: izin?.granted ?? false, isMemotret, mintaIzin, potret };
}
