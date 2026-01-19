import React from 'react';
import { ActivityIndicator, Modal, Text, View, useColorScheme } from 'react-native';
import tw from 'twrnc';

interface LoadingModalProps {
    visible: boolean;
    message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ visible, message = 'Memuat...' }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                <View style={tw`bg-white rounded-xl p-6 w-full max-w-xs items-center shadow-lg`}>
                    <ActivityIndicator size="large" color="#0D9488" style={tw`mb-4`} />
                    <Text style={tw`text-gray-900 font-medium text-base text-center`}>
                        {message}
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

export default LoadingModal;
