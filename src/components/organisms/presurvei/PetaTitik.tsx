import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

import { GAYA_PETA_OSM } from '@/constants/gayaPetaOsm';
import { getMapLibre } from '@/utils/maplibre';
import type { TitikGps } from '@/utils/presurvei/lokasiGps';

// null di Expo Go dan web (`src/utils/maplibre.ts:16-24`).
const MapLibreGL = getMapLibre();

const ZOOM_PETA_TITIK = 16;
const DIGIT_KOORDINAT = 6;

interface PetaTitikProps {
  titik: TitikGps;
}

/** Peta kecil non-interaktif penanda titik kegiatan; teks koordinat bila MapLibre tak tersedia. */
export function PetaTitik({ titik }: PetaTitikProps) {
  const koordinat: [number, number] = [titik.longitude, titik.latitude];
  if (!MapLibreGL) {
    return (
      <Text style={tw`text-sm text-gray-700`}>
        {`${titik.latitude.toFixed(DIGIT_KOORDINAT)}, ${titik.longitude.toFixed(DIGIT_KOORDINAT)}`}
      </Text>
    );
  }
  return (
    <View style={tw`h-40 rounded-xl overflow-hidden`} pointerEvents="none">
      <MapLibreGL.MapView
        style={tw`flex-1`}
        mapStyle={GAYA_PETA_OSM}
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <MapLibreGL.Camera centerCoordinate={koordinat} zoomLevel={ZOOM_PETA_TITIK} />
        <MapLibreGL.PointAnnotation id="titik-kegiatan" coordinate={koordinat}>
          <View style={tw`w-4 h-4 rounded-full bg-red-500 border-2 border-white`} />
        </MapLibreGL.PointAnnotation>
      </MapLibreGL.MapView>
    </View>
  );
}
