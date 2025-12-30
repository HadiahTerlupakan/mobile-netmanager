import { Stack } from 'expo-router';

export default function BarangLayout() {
    return (
        <Stack 
            screenOptions={{ headerShown: false }}
            initialRouteName="index"
        >
            <Stack.Screen name="index" options={{ title: 'Menu Barang' }} />
            <Stack.Screen name="masuk" options={{ title: 'Barang Masuk' }} />
            <Stack.Screen name="keluar" options={{ title: 'Barang Keluar' }} />
            <Stack.Screen name="riwayat" options={{ title: 'Riwayat' }} />
        </Stack>
    );
}
