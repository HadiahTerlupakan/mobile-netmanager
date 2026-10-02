import React, { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface LatarGradienProps {
  dari: string;
  ke: string;
  /** Lingkaran samar di pojok kanan atas sebagai aksen dekoratif. */
  isBerornamen?: boolean;
}

const OPASITAS_ORNAMEN = 0.06;
/** Ornamen putih samar, sama untuk semua persona. */
const WARNA_ORNAMEN = '#ffffff';
/** Ornamen relatif terhadap lebar kartu agar proporsional di semua layar. */
const ORNAMEN = [
  { cx: 0.92, cy: -0.1, r: 0.38 },
  { cx: 1.05, cy: 0.4, r: 0.25 },
] as const;

/**
 * Latar gradien diagonal untuk kartu utama. Memakai react-native-svg (sudah
 * terpasang) agar tidak perlu dependensi native baru — cukup dikirim via OTA.
 * Ukuran diukur lewat onLayout dan diberikan eksplisit ke Svg: dengan
 * `height="100%"` react-native-svg tidak menggambar ulang saat kartu memanjang
 * (mis. setelah data dimuat), sehingga bagian bawah kartu tidak terwarnai.
 * Letakkan sebagai anak pertama dari View ber-`overflow-hidden`.
 */
export function LatarGradien({ dari, ke, isBerornamen = true }: LatarGradienProps) {
  const idGradien = `gradien-${useId()}`;
  const [ukuran, setUkuran] = useState({ lebar: 0, tinggi: 0 });

  const ukur = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setUkuran((lama) => (lama.lebar === width && lama.tinggi === height ? lama : { lebar: width, tinggi: height }));
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={ukur}>
      {ukuran.lebar > 0 ? (
        <Svg width={ukuran.lebar} height={ukuran.tinggi}>
          <Defs>
            <LinearGradient id={idGradien} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={dari} />
              <Stop offset="1" stopColor={ke} />
            </LinearGradient>
          </Defs>
          <Rect width={ukuran.lebar} height={ukuran.tinggi} fill={`url(#${idGradien})`} />
          {isBerornamen
            ? ORNAMEN.map((ornamen) => (
                <Circle
                  key={`${ornamen.cx}-${ornamen.cy}`}
                  cx={ornamen.cx * ukuran.lebar}
                  cy={ornamen.cy * ukuran.tinggi}
                  r={ornamen.r * ukuran.lebar}
                  fill={WARNA_ORNAMEN}
                  fillOpacity={OPASITAS_ORNAMEN}
                />
              ))
            : null}
        </Svg>
      ) : null}
    </View>
  );
}
