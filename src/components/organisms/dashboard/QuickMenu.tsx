import { JudulBagian } from '@/components/molecules/JudulBagian';
import { TileMenuCepat } from '@/components/molecules/TileMenuCepat';
import type { IdMenuCepat } from '@/constants/menuCepat';
import { useStatusMenuCepat } from '@/hooks/useStatusMenuCepat';
import { susunMenuCepat, type TileMenuCepatTersusun } from '@/utils/menuCepat';
import { Href, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Alert, View } from "react-native";
import tw from "twrnc";

export type { IdMenuCepat } from '@/constants/menuCepat';

interface QuickMenuProps {
  features?: string[];
  role?: string;
  isMitra?: boolean;
  /** Bila diisi, hanya menu ini yang tampil, sesuai urutannya (izin tetap diperiksa). */
  menuIds?: readonly IdMenuCepat[];
  /** Sembunyikan semua menu yang tidak berizin (bukan tampil terkunci). */
  isSembunyikanTerkunci?: boolean;
}

/** Kisi menu cepat Beranda: tile berizin bisa dibuka, yang tidak berizin tampil terkunci atau disembunyikan. */
const QuickMenuComponent = ({
  features = [],
  role,
  isMitra = false,
  menuIds,
  isSembunyikanTerkunci = false,
}: QuickMenuProps) => {
  const router = useRouter();
  const { idTersembunyi, lencana } = useStatusMenuCepat();

  const processedMenuItems = useMemo(
    () => susunMenuCepat({ features, role, isMitra, menuIds, isSembunyikanTerkunci, idTersembunyi }),
    [features, role, isMitra, menuIds, isSembunyikanTerkunci, idTersembunyi],
  );

  const handleMenuPress = useCallback((item: TileMenuCepatTersusun) => {
    if (item.enabled) {
      router.push(item.route as Href);
      return;
    }
    Alert.alert(
      "Akses Terbatas",
      "Anda tidak memiliki izin untuk mengakses fitur ini. Hubungi administrator untuk mendapatkan akses.",
      [{ text: "OK" }],
    );
  }, [router]);

  if (processedMenuItems.length === 0) return null;

  return (
    <View style={tw`px-4 pb-8`}>
      <JudulBagian judul="Menu Cepat" />
      <View style={tw`flex-row flex-wrap justify-between`}>
        {processedMenuItems.map((item) => (
          <TileMenuCepat
            key={item.id}
            item={item}
            isAktif={item.enabled}
            jumlahLencana={lencana[item.id] ?? 0}
            onTekan={() => handleMenuPress(item)}
          />
        ))}
      </View>
    </View>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const QuickMenu = React.memo(QuickMenuComponent);
QuickMenu.displayName = 'QuickMenu';
