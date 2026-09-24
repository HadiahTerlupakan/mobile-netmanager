import { CameraView } from 'expo-camera';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { useKameraBukti } from '@/hooks/presurvei/useKameraBukti';

interface KameraBuktiProps {
  onAmbil: (uri: string) => void;
  onTutup: () => void;
}

/**
 * Kamera belakang layar penuh untuk foto bukti; izin, potret, dan
 * pengecilan foto ditangani `useKameraBukti` (amandemen preflight task-12
 * G10 — komponen hanya merender).
 */
export function KameraBukti({ onAmbil, onTutup }: KameraBuktiProps) {
  const { kamera, izinDiberikan, isMemotret, mintaIzin, potret } = useKameraBukti(onAmbil);

  if (!izinDiberikan) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-black p-6`}>
        <Text style={tw`text-white text-center mb-4`}>Aplikasi butuh izin kamera untuk foto bukti.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={mintaIzin} style={tw`bg-blue-600 rounded-xl px-5 py-3 mb-3`}>
          <Text style={tw`text-white font-bold`}>Izinkan Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onTutup}>
          <Text style={tw`text-gray-300`}>Batal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-black`}>
      <CameraView ref={kamera} style={tw`flex-1`} facing="back" />
      <View style={tw`absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-6`}>
        <TouchableOpacity accessibilityRole="button" onPress={onTutup}>
          <Text style={tw`text-white font-semibold`}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Jepret"
          disabled={isMemotret}
          onPress={() => void potret()}
          style={tw`w-16 h-16 rounded-full border-4 border-white ${isMemotret ? 'bg-gray-400' : 'bg-white/30'}`}
        />
        <View style={tw`w-12`} />
      </View>
    </View>
  );
}
