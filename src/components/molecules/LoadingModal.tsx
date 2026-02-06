import React from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import tw from 'twrnc';

interface LoadingModalProps {
    visible: boolean;
    message?: string;
    progress?: number;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ visible, message = 'Memuat...', progress }) => {
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
                    <Text style={tw`text-gray-900 font-medium text-base text-center mb-2`}>
                        {message}
                    </Text>
                    {progress !== undefined && (
                        <View style={tw`w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2`}>
                            <View style={[tw`h-full bg-teal-600`, { width: `${progress}%` }]} />
                        </View>
                    )}
                    {progress !== undefined && (
                        <Text style={tw`text-gray-500 text-xs mt-1`}>{progress}%</Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default LoadingModal;
