import { ArrowRight, FileText, Lock } from 'lucide-react-native';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface WorkOrderCardProps {
    assigned: number;
    pending: number;
    onPress: () => void;
    disabled?: boolean;
}

export const WorkOrderCard = React.memo<WorkOrderCardProps>(({ assigned, pending, onPress, disabled }) => {
    const handlePress = () => {
        if (disabled) {
            Alert.alert('Akses Terbatas', 'Anda tidak memiliki akses ke Work Order.', [{ text: 'OK' }]);
            return;
        }
        onPress();
    };

    return (
        <View style={tw`mx-4 mb-4 rounded-xl overflow-hidden shadow-md`}>
            <View style={tw`${disabled ? 'bg-gray-400' : 'bg-blue-600'} p-5`}>
                <View style={tw`flex-row justify-between items-start mb-4`}>
                    <View>
                        <Text style={tw`${disabled ? 'text-gray-200' : 'text-blue-100'} text-sm font-medium mb-1`}>Work Order Saya</Text>
                        <Text style={tw`text-4xl font-bold text-white`}>{assigned}</Text>
                    </View>
                    <View style={tw`p-2 bg-white/20 rounded-lg`}>
                        <FileText size={24} color="white" />
                    </View>
                </View>

                <View style={tw`flex-row items-center mb-4`}>
                    <View style={tw`h-2 w-2 rounded-full ${disabled ? 'bg-gray-300' : 'bg-green-400'} mr-2`} />
                    <Text style={tw`text-sm font-medium ${disabled ? 'text-gray-100' : 'text-blue-50'}`}>
                        {pending} tiket tersedia untuk diambil
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={handlePress}
                    activeOpacity={disabled ? 0.8 : 0.5}
                    style={tw`${disabled ? 'bg-gray-300' : 'bg-white'} py-3 px-4 rounded-lg flex-row items-center justify-center`}
                >
                    <Text style={tw`${disabled ? 'text-gray-500' : 'text-blue-600'} font-bold text-sm mr-2`}>
                        {disabled ? 'Akses Terbatas' : 'Lihat Work Order'}
                    </Text>
                    {disabled ? (
                        <Lock size={16} color="#6b7280" />
                    ) : (
                        <ArrowRight size={16} color="#2563eb" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
});
