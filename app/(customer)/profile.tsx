import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '@/context/AuthContext';
import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { LogOut, User, Lock, ChevronRight } from 'lucide-react-native';

export default function CustomerProfileScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: () => signOut() }
      ]
    );
  };

  const menuItems = [
    {
      icon: User,
      label: 'Edit Profil',
      action: () => {} // router.push('/(customer)/edit-profile')
    },
    {
      icon: Lock,
      label: 'Ganti Password',
      action: () => {} // router.push('/(customer)/change-password')
    }
  ];

  const getInitials = (name: string) => name?.charAt(0).toUpperCase() || 'C';

  // Helper to safely access user properties that might be missing or different for Customer
  const customerId = (user as any)?.memberId || user?.id;
  const planName = (user as any)?.planName || 'Regular Plan';
  const customerEmail = user?.email || '-'; // In this app context, username is often mapped to email field for Customer

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`pb-20`}>
        {/* Header Profile */}
        <View style={tw`bg-white p-6 items-center border-b border-gray-100`}>
          <View style={tw`mb-4 relative`}>
            {user?.image ? (
              <ImageWithCache 
                source={user.image} 
                style={tw`w-24 h-24 rounded-full bg-gray-200`}
                contentFit="cover"
              />
            ) : (
              <View style={tw`w-24 h-24 rounded-full bg-blue-600 items-center justify-center`}>
                <Text style={tw`text-white text-3xl font-bold`}>{getInitials(user?.name || '')}</Text>
              </View>
            )}
          </View>
          
          <Text style={tw`text-xl font-bold text-gray-900`}>{user?.name}</Text>
          <Text style={tw`text-gray-500`}>ID: {customerId}</Text>
          
          <View style={tw`mt-2 px-3 py-1 bg-green-100 rounded-full`}>
            <Text style={tw`text-green-700 text-xs font-bold`}>PELANGGAN AKTIF</Text>
          </View>
        </View>

        {/* Info Paket */}
        <View style={tw`mt-4 bg-white p-4 mx-4 rounded-xl shadow-sm`}>
          <Text style={tw`text-gray-500 text-xs font-bold mb-3 uppercase tracking-wider`}>Informasi Layanan</Text>
          
          <View style={tw`mb-3`}>
            <Text style={tw`text-gray-400 text-xs`}>Paket Internet</Text>
            <Text style={tw`text-gray-800 font-medium text-base`}>{planName}</Text>
          </View>

          <View style={tw`h-px bg-gray-100 my-2`} />

          <View style={tw`flex-row justify-between`}>
            <View>
              <Text style={tw`text-gray-400 text-xs`}>Username / Email</Text>
              <Text style={tw`text-gray-800`}>{customerEmail}</Text>
            </View>
          </View>
        </View>

        {/* Menu Actions */}
        <View style={tw`mt-6 mx-4 bg-white rounded-xl shadow-sm overflow-hidden`}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity 
              key={idx}
              onPress={item.action}
              style={tw`flex-row items-center p-4 border-b border-gray-100`}
            >
              <View style={tw`bg-gray-50 p-2 rounded-lg mr-3`}>
                <item.icon size={20} color="#4b5563" />
              </View>
              <Text style={tw`flex-1 text-gray-700 font-medium`}>{item.label}</Text>
              <ChevronRight size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            onPress={handleLogout}
            style={tw`flex-row items-center p-4`}
          >
            <View style={tw`bg-red-50 p-2 rounded-lg mr-3`}>
              <LogOut size={20} color="#ef4444" />
            </View>
            <Text style={tw`flex-1 text-red-600 font-medium`}>Keluar Aplikasi</Text>
          </TouchableOpacity>
        </View>

        <View style={tw`mt-8 mb-4 items-center`}>
            <Text style={tw`text-gray-400 text-xs`}>RADPRO Mobile App</Text>
            <Text style={tw`text-gray-400 text-xs`}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
