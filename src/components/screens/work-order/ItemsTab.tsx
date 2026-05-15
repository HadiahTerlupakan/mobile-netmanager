import { WorkOrder } from '@/types/work-order';
import { buildWorkOrderMaterialKey } from '@/utils/workOrderMaterialKey';
import {
  Image as ImageIcon,
  Package,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface ItemsTabProps {
  wo: WorkOrder;
  canInteract: boolean;
  isWorkStarted: boolean;
  resolvedWorkOrderId: string | null;
}

/** Tab Barang: daftar material digunakan & dikembalikan, tombol ambil/kembalikan */
export const ItemsTab = React.memo(function ItemsTab({
  wo,
  canInteract,
  isWorkStarted,
  resolvedWorkOrderId,
}: ItemsTabProps) {
  const router = useRouter();

  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 min-h-64`}>
      {/* Readonly Banner */}
      {!isWorkStarted && (
        <View style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-row items-center`}>
          <Text style={tw`text-yellow-700 text-xs flex-1`}>
            {"⚠️ Klik \"Mulai Kerja\" terlebih dahulu untuk mengambil barang"}
          </Text>
        </View>
      )}

      <Text style={tw`font-bold text-gray-800 mb-4`}>Barang Digunakan</Text>
      {wo.usedMaterials &&
        Array.isArray(wo.usedMaterials) &&
        wo.usedMaterials.length > 0 ? (
        wo.usedMaterials.map((item, idx: number) => (
          <View
            key={buildWorkOrderMaterialKey(item, idx, 'used')}
            style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}
          >
            <Text style={tw`text-gray-700`}>
              {item.name || item.barangName || item.nama}
            </Text>
            <Text style={tw`font-bold`}>
              {item.quantity || item.jumlah} {item.unit || item.satuan || "pcs"}
            </Text>
          </View>
        ))
      ) : (
        <Text style={tw`text-center text-gray-400 mt-4`}>
          Belum ada barang yang dicatat
        </Text>
      )}

      {/* Returned Materials Section (for DISCONNECTION) */}
      {wo.returnedMaterials &&
        Array.isArray(wo.returnedMaterials) &&
        wo.returnedMaterials.length > 0 && (
          <View style={tw`mt-6`}>
            <Text style={tw`font-bold text-gray-800 mb-4`}>
              Barang Dikembalikan
            </Text>
            {wo.returnedMaterials.map((item, idx: number) => (
              <View
                key={buildWorkOrderMaterialKey(item, idx, 'returned')}
                style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}
              >
                <View style={tw`flex-1`}>
                  <Text style={tw`text-gray-700`}>
                    {item.name || item.barangName || item.nama}
                  </Text>
                  <View style={tw`flex-row items-center gap-2 mt-1`}>
                    <View
                      style={tw`px-1.5 py-0.5 rounded ${item.kondisi === "BARU"
                        ? "bg-green-100"
                        : item.kondisi === "BEKAS"
                          ? "bg-yellow-100"
                          : "bg-red-100"
                        }`}
                    >
                      <Text
                        style={tw`text-[10px] font-bold ${item.kondisi === "BARU"
                          ? "text-green-700"
                          : item.kondisi === "BEKAS"
                            ? "text-yellow-700"
                            : "text-red-700"
                          }`}
                      >
                        {item.kondisi}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={tw`font-bold`}>
                  {item.quantity || item.jumlah}{" "}
                  {item.unit || item.satuan || "pcs"}
                </Text>
              </View>
            ))}
          </View>
        )}

      <View style={tw`mt-6 gap-3`}>
        {/* Ambil Barang Button */}
        <TouchableOpacity
          onPress={() => {
            if (!canInteract || !resolvedWorkOrderId) return;
            router.push(`/(app)/ambil-barang/${resolvedWorkOrderId}` as any);
          }}
          disabled={!canInteract}
          style={tw`flex-row items-center justify-center p-3 rounded-xl border ${canInteract ? "bg-blue-50 border-blue-200 active:bg-blue-100" : "bg-gray-100 border-gray-200 opacity-60"}`}
        >
          <ImageIcon
            size={20}
            color={canInteract ? "#2563eb" : "#9ca3af"}
            style={tw`mr-2`}
          />
          <Text style={tw`font-bold ${canInteract ? "text-blue-600" : "text-gray-400"}`}>
            Ambil Barang / Material
          </Text>
        </TouchableOpacity>

        {/* Kembalikan Barang Button - For DISCONNECTION and RELOCATION */}
        {(wo.type === "DISCONNECTION" || wo.type === "RELOCATION") && (
          <TouchableOpacity
            onPress={() => {
              if (!canInteract || !resolvedWorkOrderId) return;
              router.push(`/(app)/kembalikan-barang/${resolvedWorkOrderId}` as any);
            }}
            disabled={!canInteract}
            style={tw`flex-row items-center justify-center p-3 rounded-xl border ${canInteract ? "bg-green-50 border-green-200 active:bg-green-100" : "bg-gray-100 border-gray-200 opacity-60"}`}
          >
            <Package
              size={20}
              color={canInteract ? "#16a34a" : "#9ca3af"}
              style={tw`mr-2`}
            />
            <Text style={tw`font-bold ${canInteract ? "text-green-600" : "text-gray-400"}`}>
              Kembalikan Barang
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});
