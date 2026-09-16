import { useWorkOrderPartners } from '@/hooks/useWorkOrderPartners';
import { UserSummary } from '@/types/work-order';
import { FlashList } from '@shopify/flash-list';
import { X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface PartnerModalProps {
  visible: boolean;
  onClose: () => void;
  workOrderId: string | null;
  onRefresh: () => void;
}

/** Modal untuk memilih dan menambahkan partner ke work order */
export const PartnerModal = React.memo(function PartnerModal({
  visible,
  onClose,
  workOrderId,
  onRefresh,
}: PartnerModalProps) {
  const {
    setIsPartnerModalVisible,
    availablePartners,
    searchPartnerQuery,
    setSearchPartnerQuery,
    partnerLoading,
    isFetchingMorePartners,
    handleAddPartner,
    loadMorePartners,
  } = useWorkOrderPartners({ workOrderId, onRefresh });

  // Sync prop visibility with hook's internal state
  useEffect(() => {
    setIsPartnerModalVisible(visible);
  }, [visible, setIsPartnerModalVisible]);

  const handleAdd = async (userId: string) => {
    await handleAddPartner(userId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/50 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl h-3/4 p-4`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`font-bold text-lg text-gray-800`}>
              Pilih Partner
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={tw`p-2 bg-gray-100 rounded-full`}
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={tw`bg-gray-50 p-3 rounded-xl mb-4 text-gray-800`}
            placeholder="Cari nama teknisi..."
            value={searchPartnerQuery}
            onChangeText={setSearchPartnerQuery}
          />

          {partnerLoading ? (
            <ActivityIndicator size="large" color="#2563eb" style={tw`mt-10`} />
          ) : (
            <View style={tw`flex-1`}>
              <FlashList
                data={availablePartners}
                keyExtractor={(item: UserSummary) => item.id}
                renderItem={({ item }: { item: UserSummary }) => (
                  <TouchableOpacity
                    onPress={() => handleAdd(item.id)}
                    style={tw`flex-row items-center p-3 border-b border-gray-100 active:bg-blue-50`}
                  >
                    <View style={tw`w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-3`}>
                      <Text style={tw`font-bold text-gray-600`}>
                        {item.name?.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={tw`font-bold text-gray-800`}>
                        {item.name}
                      </Text>
                      <Text style={tw`text-xs text-gray-500`}>
                        {item.role?.name || "Karyawan"} •{" "}
                        {item.site?.name || "Headquarters"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                onEndReached={loadMorePartners}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isFetchingMorePartners ? (
                    <ActivityIndicator size="small" color="#2563eb" style={tw`py-4`} />
                  ) : null
                }
                ListEmptyComponent={
                  !partnerLoading ? (
                    <Text style={tw`text-center text-gray-400 mt-10`}>
                      Tidak ada teknisi ditemukan
                    </Text>
                  ) : null
                }
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});
