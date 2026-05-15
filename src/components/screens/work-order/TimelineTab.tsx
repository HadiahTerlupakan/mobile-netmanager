import { WorkOrder, WorkOrderUpdate } from '@/types/work-order';
import { formatDate } from '@/utils/date';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

interface TimelineTabProps {
  wo: WorkOrder;
}

/** Tab Riwayat: timeline aktivitas sistem (status change, material, assignment) */
export const TimelineTab = React.memo(function TimelineTab({
  wo,
}: TimelineTabProps) {
  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
      <Text style={tw`text-xs text-gray-400 font-bold mb-4 uppercase`}>
        Riwayat Aktivitas
      </Text>
      {wo.updates
        ?.filter((u) => !["COMMENT", "NOTE"].includes(u.updateType))
        .map((update, index, arr) => (
          <View key={update.id || `${update.updateType}-${update.createdAt || index}`} style={tw`flex-row mb-6 relative`}>
            {/* Line */}
            {index !== arr.length - 1 && (
              <View style={tw`absolute left-3 top-6 bottom--6 w-0.5 bg-gray-200`} />
            )}

            {/* Dot */}
            <View
              style={tw`w-6 h-6 rounded-full ${update.updateType === "PHOTO"
                ? "bg-purple-100"
                : update.updateType === "MATERIAL_PICKUP"
                  ? "bg-orange-100"
                  : update.updateType === "MATERIAL_RETURN"
                    ? "bg-green-100"
                    : update.updateType === "STATUS_CHANGE"
                      ? "bg-blue-100"
                      : "bg-gray-100"
                } items-center justify-center mr-3 z-10`}
            >
              <View
                style={tw`w-2 h-2 rounded-full ${update.updateType === "PHOTO"
                  ? "bg-purple-600"
                  : update.updateType === "MATERIAL_PICKUP"
                    ? "bg-orange-600"
                    : update.updateType === "MATERIAL_RETURN"
                      ? "bg-green-600"
                      : update.updateType === "STATUS_CHANGE"
                        ? "bg-blue-600"
                        : "bg-gray-400"
                  }`}
              />
            </View>

            {/* Content */}
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-500 mb-0.5`}>
                {formatDate(update.createdAt, "dd MMM HH:mm")}
              </Text>
              <Text style={tw`font-bold text-gray-800 text-sm`}>
                {update.updateType === "STATUS_CHANGE"
                  ? `Status: ${update.newStatus}`
                  : update.updateType === "PHOTO"
                    ? "📷 Foto Diupload"
                    : update.updateType === "MATERIAL_PICKUP"
                      ? "📦 Ambil Barang"
                      : update.updateType === "MATERIAL_RETURN"
                        ? "↩️ Kembalikan Barang"
                        : update.updateType === "ASSIGNMENT"
                          ? "👤 Penugasan"
                          : update.updateType === "PARTNER_RESPONSE"
                            ? "🤝 Respon Partner"
                            : update.updateType}
              </Text>
              <Text style={tw`text-gray-600 text-sm mt-1 leading-5`}>
                {update.message}
              </Text>

              {update.user && (
                <Text style={tw`text-xs text-gray-400 mt-1 italic`}>
                  Oleh: {update.user.name}
                </Text>
              )}
              {!update.user && update.createdBy && (
                <Text style={tw`text-xs text-gray-400 mt-1 italic`}>
                  Oleh: {update.createdBy.name || "System"}
                </Text>
              )}
            </View>
          </View>
        ))}
      {(!wo.updates ||
        wo.updates.filter(
          (u: WorkOrderUpdate) => !["COMMENT", "NOTE"].includes(u.updateType),
        ).length === 0) && (
        <Text style={tw`text-center text-gray-400 py-4`}>
          Belum ada riwayat sistem
        </Text>
      )}
    </View>
  );
});
