import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface LatarGradienProps {
  dari: string;
  ke: string;
  /** Lingkaran samar di pojok kanan atas sebagai aksen dekoratif. */
  isBerornamen?: boolean;
}

const OPASITAS_ORNAMEN = 0.06;

/**
 * Latar gradien diagonal untuk kartu utama. Memakai react-native-svg (sudah
 * terpasang) agar tidak perlu dependensi native baru — cukup dikirim via OTA.
 * Letakkan sebagai anak pertama dari View ber-`overflow-hidden`.
 */
export function LatarGradien({ dari, ke, isBerornamen = true }: LatarGradienProps) {
  const idGradien = `gradien-${useId()}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={idGradien} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={dari} />
          <Stop offset="1" stopColor={ke} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${idGradien})`} />
      {isBerornamen ? (
        <>
          <Circle cx="92%" cy="-10%" r="140" fill="#ffffff" fillOpacity={OPASITAS_ORNAMEN} />
          <Circle cx="105%" cy="40%" r="90" fill="#ffffff" fillOpacity={OPASITAS_ORNAMEN} />
        </>
      ) : null}
    </Svg>
  );
}
