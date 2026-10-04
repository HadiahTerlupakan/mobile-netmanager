import { useMemo, useRef, useState } from 'react';
import { PanResponder, type GestureResponderEvent } from 'react-native';

/** Titik awal dan sambungan goresan dalam format data path SVG. */
function mulaiGoresan(event: GestureResponderEvent): string {
  const { locationX, locationY } = event.nativeEvent;
  return `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
}

function sambungGoresan(goresan: string, event: GestureResponderEvent): string {
  const { locationX, locationY } = event.nativeEvent;
  return `${goresan} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
}

/**
 * Rekam goresan jari sebagai path SVG. Goresan yang sedang digambar disimpan
 * di ref supaya setiap gerakan tidak memicu render ulang daftar penuh.
 */
export function useGoresanTandaTangan() {
  const [daftarGoresan, setDaftarGoresan] = useState<string[]>([]);
  const goresanAktif = useRef('');

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          goresanAktif.current = mulaiGoresan(event);
          setDaftarGoresan((sebelumnya) => [...sebelumnya, goresanAktif.current]);
        },
        onPanResponderMove: (event) => {
          goresanAktif.current = sambungGoresan(goresanAktif.current, event);
          setDaftarGoresan((sebelumnya) => [...sebelumnya.slice(0, -1), goresanAktif.current]);
        },
      }),
    [],
  );

  return {
    daftarGoresan,
    panHandlers: panResponder.panHandlers,
    isKosong: daftarGoresan.length === 0,
    hapus: () => setDaftarGoresan([]),
  };
}
