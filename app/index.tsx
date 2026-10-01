import { View, ActivityIndicator } from 'react-native';
import tw from 'twrnc';

import { useTemaPersona } from '@/theme';

export default function Index() {
    const { warna } = useTemaPersona();
    return (
        <View style={tw`flex-1 justify-center items-center bg-white`}>
            <ActivityIndicator size="large" color={warna.utamaKuat} />
        </View>
    );
}
