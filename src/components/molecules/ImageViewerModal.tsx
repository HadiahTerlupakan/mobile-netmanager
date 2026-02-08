import React from 'react';
import { Modal, TouchableOpacity, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={tw`flex-1 bg-black/95 justify-center items-center`}>
        <SafeAreaView style={tw`absolute top-0 left-0 right-0 z-10 flex-row justify-end p-4`}>
          <TouchableOpacity
            onPress={onClose}
            style={tw`p-2 bg-white/20 rounded-full`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        <Image
          source={imageUrl}
          style={{
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').height * 0.8
          }}
          contentFit="contain"
          transition={200}
        />
      </View>
    </Modal>
  );
};
